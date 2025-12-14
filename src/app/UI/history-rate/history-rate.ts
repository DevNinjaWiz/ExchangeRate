import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import {
  BehaviorSubject,
  Subject,
  catchError,
  distinctUntilChanged,
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
import { CURRENCY } from '../../../shared/constants';
import { getSupportedCurrencyCode, toDashDropDownDelimiter } from '../../../shared/functions';

let chartJsImport: Promise<typeof import('chart.js/auto')> | null = null;
const loadChartJs = () => (chartJsImport ??= import('chart.js/auto'));

@Component({
  selector: 'app-history-rate',
  imports: [CommonModule, Select],
  templateUrl: './history-rate.html',
  styleUrl: './history-rate.scss',
})
export class HistoryRate implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('historyChartCanvas')
  private historyChartCanvas?: ElementRef<HTMLCanvasElement>;

  readonly baseCurrencyCode: SupportedCurrencyCode = 'USD';
  readonly rangeOptions: CurrencyHistoryRateDateOption[] = ['daily', 'weekly', 'monthly'];
  readonly targetOptions: SupportedCurrencyCode[] = getSupportedCurrencyCode().filter(
    (code) => code !== this.baseCurrencyCode
  );
  readonly defaultTargetOptions: SupportedCurrencyCode[] = ['MYR', 'SGD', 'EUR'];
  readonly targetOptionLabel = (code: SupportedCurrencyCode) =>
    toDashDropDownDelimiter(code, CURRENCY[code] ?? '');

  range = signal<CurrencyHistoryRateDateOption>('monthly');
  selectedTargets = signal<SupportedCurrencyCode[]>([...this.defaultTargetOptions]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  private series = signal<CurrencyHistoryRate[]>([]);

  private _destroy$ = new Subject<void>();
  private _changeRange$ = new BehaviorSubject<CurrencyHistoryRateDateOption>(this.range());
  private _changeTargets$ = new BehaviorSubject<SupportedCurrencyCode[]>(this.selectedTargets());

  private chart: any | null = null;

  constructor(private currencyHistory: CurrencyHistory) {}

  ngOnInit(): void {
    this._changeRange$
      .pipe(
        distinctUntilChanged(),
        tap((range) => {
          this.range.set(range);
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((range) =>
          this.currencyHistory.currencyHistoryRateSeriesFor$(range, this.baseCurrencyCode).pipe(
            catchError((err) => {
              this.loading.set(false);
              this.error.set(err instanceof Error ? err.message : String(err));
              return of([] as CurrencyHistoryRate[]);
            })
          )
        ),
        takeUntil(this._destroy$)
      )
      .subscribe((series) => {
        this.series.set(series);
        this.loading.set(false);
        this.refreshChart();
      });

    this._changeTargets$
      .pipe(
        distinctUntilChanged((a, b) => a.join(',') === b.join(',')),
        takeUntil(this._destroy$)
      )
      .subscribe((targets) => {
        this.selectedTargets.set(targets);
        this.refreshChart();
      });
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

  onRangeChange(value: CurrencyHistoryRateDateOption) {
    this._changeRange$.next(value);
  }

  onTargetsChange(value: SupportedCurrencyCode[]) {
    const normalized = (value ?? []).filter((code) => this.targetOptions.includes(code));
    this._changeTargets$.next(normalized);
  }

  private async initChart(): Promise<void> {
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

  private refreshChart(): void {
    if (!this.chart) {
      return;
    }

    const series = this.series();
    const targets = this.selectedTargets();

    this.chart.data.labels = series.map((s) => s.date);
    this.chart.data.datasets = targets.map((target) => {
      const color = TARGET_COLOR[target] ?? '#4b5563';

      return {
        label: `${this.baseCurrencyCode} → ${target}`,
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

const TARGET_COLOR: Partial<Record<SupportedCurrencyCode, string>> = {
  MYR: '#2563eb',
  SGD: '#16a34a',
  EUR: '#f59e0b',
};
