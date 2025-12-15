import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import {
  BehaviorSubject,
  Subject,
  catchError,
  distinctUntilChanged,
  merge,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { CurrencyHistory } from '../../services';
import { Select } from '../../../shared/components';
import {
  CurrencyHistoryRate,
  CurrencyHistoryRateDateOption,
  SupportedCurrencyCode,
} from '../../../shared/types';
import {
  CURRENCY,
  DEFAULT_BASE_CURRENCY_CODE,
  DEFAULT_DATE_OPTION,
  DEFAULT_HISTORY_TARGET_OPTIONS,
} from '../../../shared/constants';
import { getSupportedCurrencyCode, toDashDropDownDelimiter } from '../../../shared/functions';

let chartJsImport: Promise<typeof import('chart.js/auto')> | null = null;
const loadChartJs = () => (chartJsImport ??= import('chart.js/auto'));

const DATE_RANGE_OPTIONS = ['daily', 'weekly', 'monthly'];
const TARGET_COLOR: Partial<Record<SupportedCurrencyCode, string>> = {
  MYR: '#2563eb',
  SGD: '#16a34a',
  EUR: '#f59e0b',
};

@Component({
  selector: 'app-history-rate',
  imports: [CommonModule, Select],
  templateUrl: './history-rate.html',
  styleUrl: './history-rate.scss',
})
export class HistoryRate implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('historyChartCanvas')
  private historyChartCanvas?: ElementRef<HTMLCanvasElement>;

  DATE_RANGE_OPTIONS = DATE_RANGE_OPTIONS;

  targetOptionLabel = (code: SupportedCurrencyCode) =>
    toDashDropDownDelimiter(code, CURRENCY[code] ?? '');

  dateOptions = signal<CurrencyHistoryRateDateOption>(DEFAULT_DATE_OPTION);
  selectedTargetCurrencies = signal<SupportedCurrencyCode[]>(
    DEFAULT_HISTORY_TARGET_OPTIONS as SupportedCurrencyCode[]
  );
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  baseCurrencyCode = signal<SupportedCurrencyCode>(DEFAULT_BASE_CURRENCY_CODE);

  targetOptions = computed(() =>
    getSupportedCurrencyCode().filter((code) => code !== this.baseCurrencyCode())
  );

  private series = signal<CurrencyHistoryRate[]>([]);

  private chart: any | null = null;
  private _changeDateOption$ = new BehaviorSubject<CurrencyHistoryRateDateOption>(
    this.dateOptions()
  );
  private _changeTargetsCurrency$ = new BehaviorSubject<SupportedCurrencyCode[]>(
    this.selectedTargetCurrencies()
  );
  private _destroy$ = new Subject<void>();

  constructor(private currencyHistory: CurrencyHistory) {}

  ngOnInit(): void {
    this.initWatcher();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initChart();
    this.refreshChart();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  onDateOptionsChange(value: CurrencyHistoryRateDateOption) {
    this._changeDateOption$.next(value);
  }

  onTargetCurrenciesChange(values: SupportedCurrencyCode[]) {
    this._changeTargetsCurrency$.next(values.filter((code) => this.targetOptions().includes(code)));
  }

  private async initChart() {
    if (this.chart) {
      return;
    }

    const canvas = this.historyChartCanvas?.nativeElement;

    if (!canvas) {
      return;
    }

    if (typeof CanvasRenderingContext2D === 'undefined') {
      return;
    }

    let ctx: CanvasRenderingContext2D | null = null;

    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }

    if (!ctx) {
      return;
    }

    const { default: Chart } = await loadChartJs();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },
          tooltip: {
            enabled: true,
          },
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8,
            },
          },
          y: {
            ticks: {
              callback: (value: any) => {
                const num = Number(value);
                return Number.isFinite(num) ? num.toFixed(3) : String(value);
              },
            },
          },
        },
      },
    });
  }

  private initWatcher() {
    const watchChangeDateOption$ = this._changeDateOption$.pipe(
      distinctUntilChanged(),
      tap((option) => {
        this.dateOptions.set(option);
        this.loading.set(true);
        this.error.set(null);
      }),
      switchMap((option) =>
        this.currencyHistory.currencyHistoryRateSeriesFor$(option, this.baseCurrencyCode()).pipe(
          catchError((err) => {
            this.loading.set(false);
            this.error.set(err);
            return of([] as CurrencyHistoryRate[]);
          })
        )
      ),
      tap((series) => {
        this.series.set(series);
        this.loading.set(false);
        this.refreshChart();
      })
    );

    const watchChangeTargetCurrency$ = this._changeTargetsCurrency$.pipe(
      distinctUntilChanged((a, b) => a.join(',') === b.join(',')),
      tap((targetCurrency) => {
        this.selectedTargetCurrencies.set(targetCurrency);
        this.refreshChart();
      })
    );

    merge(watchChangeDateOption$, watchChangeTargetCurrency$)
      .pipe(takeUntil(this._destroy$))
      .subscribe();
  }

  private refreshChart() {
    if (!this.chart) {
      return;
    }

    const series = this.series();
    const targets = this.selectedTargetCurrencies();

    this.chart.data.labels = series.map((s) => s.date);
    this.chart.data.datasets = targets.map((target) => {
      const color = TARGET_COLOR[target] ?? '#4b5563';

      return {
        label: `${this.baseCurrencyCode()} → ${target}`,
        data: series.map((s) => s.conversionRates[target] ?? null),
        borderColor: color,
        backgroundColor: color,
        tension: 0.25,
        pointRadius: 2,
        spanGaps: false,
      };
    });

    this.chart.update();
  }
}
