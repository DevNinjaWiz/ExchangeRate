import { Injectable } from '@angular/core';
import { CurrencyRateApi } from '../../api';
import { BehaviorSubject, EMPTY, timer } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
} from 'rxjs/operators';
import {
  DEFAULT_BASE_CURRENCY_CODE,
  DEFAULT_POLLING_INTERVAL_TIME,
} from '../../../shared/constants';
import { SupportedCurrencyCode } from '../../../shared/types';

@Injectable({
  providedIn: 'root',
})
export class ExchangeRate {
  private readonly baseCurrency$ = new BehaviorSubject<SupportedCurrencyCode>(
    DEFAULT_BASE_CURRENCY_CODE
  );

  get currencyRateStream$() {
    return this.baseCurrency$.pipe(
      map((code) => code.trim().toUpperCase()),
      filter((code) => !!code.length),
      distinctUntilChanged(),
      switchMap((currencyCode) =>
        timer(0, DEFAULT_POLLING_INTERVAL_TIME).pipe(
          switchMap(() =>
            this.currencyRateApi.getCurrencyRate(currencyCode).pipe(catchError(() => EMPTY))
          )
        )
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  constructor(private currencyRateApi: CurrencyRateApi) {}

  updateBaseCurrency(code: SupportedCurrencyCode) {
    this.baseCurrency$.next(code);
  }
}
