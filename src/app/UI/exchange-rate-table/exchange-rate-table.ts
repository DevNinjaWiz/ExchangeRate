import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { debounceTime, merge, Subject, takeUntil, tap } from 'rxjs';
import { CurrencyRate, SupportedCurrencyCode } from '../../../shared/types';
import { ExchangeRate } from '../../services';
import { CURRENCY, DEFAULT_DEBOUNCE_TIME } from '../../../shared/constants';

@Component({
  selector: 'app-exchange-rate-table',
  imports: [],
  templateUrl: './exchange-rate-table.html',
  styleUrl: './exchange-rate-table.scss',
})
export class ExchangeRateTable implements OnInit, OnDestroy {
  currencyRate = signal<CurrencyRate | null>(null);
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
    const code = value.toUpperCase();

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
