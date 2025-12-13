import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { debounceTime, merge, Subject, takeUntil, tap } from 'rxjs';
import { CurrencyRate, SupportedCurrencyCode, TableColumn } from '../../../shared/types';
import { ExchangeRate } from '../../services';
import {
  CURRENCY,
  DEFAULT_BASE_CURRENCY_CODE,
  DEFAULT_DEBOUNCE_TIME,
  THEME_FILTER_FILLED_SVG,
} from '../../../shared/constants';
import { Button, Table } from '../../../shared/components';

@Component({
  selector: 'app-exchange-rate-table',
  imports: [CommonModule, Button, Table],
  templateUrl: './exchange-rate-table.html',
  styleUrl: './exchange-rate-table.scss',
})
export class ExchangeRateTable implements OnInit, OnDestroy {
  DEFAULT_BASE_CURRENCY_CODE = DEFAULT_BASE_CURRENCY_CODE;
  filterSvg = THEME_FILTER_FILLED_SVG;
  currencyRate = signal<CurrencyRate | null>(null);

  tableColumns: TableColumn<ConversionRow>[] = [
    { id: 'currency', header: 'Currency', cell: (row) => row.currency },
    { id: 'description', header: 'Description', cell: (row) => row.description },
    { id: 'rate', header: 'Rate', cell: (row) => row.rate.toFixed(2) },
  ];
  conversionRows = computed(() => {
    const rate = this.currencyRate();
    if (!rate) {
      return [];
    }

    return Object.entries(rate.conversionRates).map(([key, value]) => {
      const code = key as SupportedCurrencyCode;

      return {
        currency: code,
        description: CURRENCY[code] ?? code,
        rate: value,
      };
    });
  });

  private _changeCurrencyCode$ = new Subject<SupportedCurrencyCode>();
  private _destroy$ = new Subject<void>();

  constructor(private exchangeRate: ExchangeRate) {}

  ngOnInit(): void {
    this.initWatcher();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  onBaseCurrencyChange(value: string) {
    const code = value.trim().toUpperCase();

    const isValid = code in CURRENCY;

    if (!isValid) {
      return;
    }

    this._changeCurrencyCode$.next(code as SupportedCurrencyCode);
  }

  private initWatcher() {
    const watchChangeCurrencyCode$ = this._changeCurrencyCode$.pipe(
      debounceTime(DEFAULT_DEBOUNCE_TIME),
      tap((code) => this.exchangeRate.updateBaseCurrency(code))
    );

    const watchGetExchangeRate$ = this.exchangeRate.currencyRateStream$.pipe(
      tap((rate) => this.currencyRate.set(rate))
    );

    merge(watchGetExchangeRate$, watchChangeCurrencyCode$)
      .pipe(takeUntil(this._destroy$))
      .subscribe();
  }
}

type ConversionRow = {
  currency: SupportedCurrencyCode;
  description: string;
  rate: number;
};
