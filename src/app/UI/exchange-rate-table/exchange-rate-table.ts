import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import {
  debounceTime,
  distinctUntilChanged,
  merge,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { CurrencyRate, SupportedCurrencyCode, TableColumn, TableRow } from '../../../shared/types';
import { ExchangeRate } from '../../services';
import {
  CURRENCY,
  DEFAULT_BASE_CURRENCY_CODE,
  DEFAULT_DEBOUNCE_TIME,
  THEME_FILTER_CLEAR_SVG,
} from '../../../shared/constants';
import { Button, Select, Table } from '../../../shared/components';
import { getSupportedCurrencyCode, toDashDropDownDelimiter } from '../../../shared/functions';

@Component({
  selector: 'app-exchange-rate-table',
  imports: [CommonModule, Button, Select, Table],
  templateUrl: './exchange-rate-table.html',
  styleUrl: './exchange-rate-table.scss',
})
export class ExchangeRateTable implements OnInit, OnDestroy {
  clearFilterSvg = THEME_FILTER_CLEAR_SVG;

  DEFAULT_BASE_CURRENCY_CODE = DEFAULT_BASE_CURRENCY_CODE;
  baseCurrencyCode = signal<SupportedCurrencyCode>(DEFAULT_BASE_CURRENCY_CODE);
  currencyRate = signal<CurrencyRate | null>(null);
  supportedCurrencyCodes = getSupportedCurrencyCode();
  selectedCurrencyCodes = signal<SupportedCurrencyCode[]>([]);
  currencySearchQuery = signal<string>('');
  currencyOptionLabel = (code: SupportedCurrencyCode) =>
    toDashDropDownDelimiter(code, CURRENCY[code] ?? '');

  tableColumns: TableColumn<TableRow>[] = [
    { id: 'currency', header: 'Currency', cell: (row) => row.currency },
    { id: 'description', header: 'Description', cell: (row) => row.description },
    { id: 'rate', header: 'Rate', cell: (row) => row.rate.toFixed(2) },
  ];

  tableRows = computed(() => {
    const rate = this.currencyRate();

    if (!rate) {
      return [];
    }

    let rows = (Object.entries(rate.conversionRates) as [SupportedCurrencyCode, number][]).map(
      ([currency, rate]) => ({
        currency,
        description: CURRENCY[currency] ?? '',
        rate,
      })
    );

    if (this.selectedCurrencyCodes().length) {
      const selectedCurrenciesSet = new Set<SupportedCurrencyCode>(this.selectedCurrencyCodes());
      rows = rows.filter((row) => selectedCurrenciesSet.has(row.currency));
    }

    const query = this.currencySearchQuery().trim().toLowerCase();

    if (query.length) {
      rows = rows.filter((row) => {
        if (row.currency.toLowerCase().includes(query)) {
          return true;
        }

        return (row.description ?? '').toLowerCase().includes(query);
      });
    }

    return rows;
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

  onSearchCurrency(value: string) {
    this.currencySearchQuery.set(value);
  }

  onBaseCurrencyChange(value: string) {
    const code = value.trim().toUpperCase();

    if (!(code in CURRENCY)) {
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
    const watchGetExchangeRate$ = merge(
      of(DEFAULT_BASE_CURRENCY_CODE),
      this._changeCurrencyCode$.pipe(debounceTime(DEFAULT_DEBOUNCE_TIME))
    ).pipe(
      tap((code) => this.baseCurrencyCode.set(code)),
      distinctUntilChanged(),
      switchMap((code) => this.exchangeRate.currencyRateStreamFor$(code)),
      tap((rate) => this.currencyRate.set(rate))
    );

    const watchFilterCurrencyCode$ = this._filterCurrencyCode$.pipe(
      tap((currencyCodes) => {
        this.selectedCurrencyCodes.set(currencyCodes);
      })
    );

    const watchClearFilterCurrencyCode$ = this._clearFilterCurrencyCode$.pipe(
      tap(() => {
        this.selectedCurrencyCodes.set([]);
        this.currencySearchQuery.set('');
      })
    );

    merge(watchGetExchangeRate$, watchFilterCurrencyCode$, watchClearFilterCurrencyCode$)
      .pipe(takeUntil(this._destroy$))
      .subscribe();
  }
}
