import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { debounceTime, merge, Subject, takeUntil, tap } from 'rxjs';
import { CurrencyRate, SupportedCurrencyCode, TableColumn } from '../../../shared/types';
import { ExchangeRate } from '../../services';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  CURRENCY,
  DEFAULT_BASE_CURRENCY_CODE,
  DEFAULT_DEBOUNCE_TIME,
  THEME_FILTER_CLEAR_SVG,
} from '../../../shared/constants';
import { Button, Table } from '../../../shared/components';

@Component({
  selector: 'app-exchange-rate-table',
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, Button, Table],
  templateUrl: './exchange-rate-table.html',
  styleUrl: './exchange-rate-table.scss',
})
export class ExchangeRateTable implements OnInit, OnDestroy {
  DEFAULT_BASE_CURRENCY_CODE = DEFAULT_BASE_CURRENCY_CODE;
  CURRENCY = CURRENCY;
  clearFilterSvg = THEME_FILTER_CLEAR_SVG;

  currencyRate = signal<CurrencyRate | null>(null);
  supportedCurrencyCodes = Object.keys(CURRENCY).sort() as SupportedCurrencyCode[];
  selectedCurrencyCodes = signal<SupportedCurrencyCode[]>([]);

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

    const rows = Object.entries(rate.conversionRates).map(([key, value]) => {
      const code = key as SupportedCurrencyCode;

      return {
        currency: code,
        description: CURRENCY[code],
        rate: value,
      };
    });

    const selected = this.selectedCurrencyCodes();

    if (!selected.length) {
      return rows;
    }

    const selectedSet = new Set<SupportedCurrencyCode>(selected);
    return rows.filter((row) => selectedSet.has(row.currency));
  });

  private _changeCurrencyCode$ = new Subject<SupportedCurrencyCode>();
  private _filterCurrencyCode$ = new Subject<SupportedCurrencyCode[]>();
  private _clearFilterCurrencyCode$ = new Subject<void>();
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

  onCurrencyFilterChange(currenciesCode: string[]) {
    const codes = currenciesCode.map(
      (currencyCode) => currencyCode.toUpperCase() as SupportedCurrencyCode
    );

    this._filterCurrencyCode$.next(codes);
  }

  clearCurrencyFilter() {
    this._clearFilterCurrencyCode$.next();
  }

  private initWatcher() {
    const watchChangeCurrencyCode$ = this._changeCurrencyCode$.pipe(
      debounceTime(DEFAULT_DEBOUNCE_TIME),
      tap((code) => this.exchangeRate.updateBaseCurrency(code))
    );

    const watchGetExchangeRate$ = this.exchangeRate.currencyRateStream$.pipe(
      tap((rate) => this.currencyRate.set(rate))
    );

    const watchFilterCurrencyCode$ = this._filterCurrencyCode$.pipe(
      tap((currencyCodes) => {
        this.selectedCurrencyCodes.set(currencyCodes);
      })
    );

    const watchClearFilterCurrencyCode$ = this._clearFilterCurrencyCode$.pipe(
      tap(() => this.selectedCurrencyCodes.set([]))
    );

    merge(
      watchGetExchangeRate$,
      watchChangeCurrencyCode$,
      watchFilterCurrencyCode$,
      watchClearFilterCurrencyCode$
    )
      .pipe(takeUntil(this._destroy$))
      .subscribe();
  }
}

type ConversionRow = {
  currency: SupportedCurrencyCode;
  description: string;
  rate: number;
};
