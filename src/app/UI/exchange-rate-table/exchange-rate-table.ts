import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { merge, Subject, takeUntil, tap } from 'rxjs';
import { CurrencyRate, SupportedCurrencyCode, TableColumn, TableRow } from '../../../shared/types';
import { ExchangeRate } from '../../services';
import { CURRENCY, THEME_FILTER_CLEAR_SVG } from '../../../shared/constants';
import { Button, Select, Table } from '../../../shared/components';

@Component({
  selector: 'app-exchange-rate-table',
  imports: [CommonModule, Button, Select, Table],
  templateUrl: './exchange-rate-table.html',
  styleUrl: './exchange-rate-table.scss',
})
export class ExchangeRateTable implements OnInit, OnDestroy {
  clearFilterSvg = THEME_FILTER_CLEAR_SVG;

  currencyRate = signal<CurrencyRate | null>(null);
  supportedCurrencyCodes = Object.keys(CURRENCY).sort() as SupportedCurrencyCode[];
  selectedCurrencyCodes = signal<SupportedCurrencyCode[]>([]);
  currencySearchQuery = signal<string>('');
  currencyOptionLabel = (code: SupportedCurrencyCode) => `${code} - ${CURRENCY[code] ?? ''}`;

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
    const watchGetExchangeRate$ = this.exchangeRate.currencyRateStream$.pipe(
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
