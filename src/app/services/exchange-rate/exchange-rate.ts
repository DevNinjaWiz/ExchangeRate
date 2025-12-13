import { Injectable } from '@angular/core';
import { CurrencyRateApi } from '../../api';
import { BehaviorSubject, Observable, defer, timer } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  expand,
  filter,
  map,
  shareReplay,
  switchMap,
} from 'rxjs/operators';
import {
  DEFAULT_BASE_CURRENCY_CODE,
  DEFAULT_POLLING_INTERVAL_TIME,
} from '../../../shared/constants';
import { CurrencyRate, SupportedCurrencyCode } from '../../../shared/types';

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
      switchMap((currencyCode) => this.pollUntilNextUpdate(currencyCode as SupportedCurrencyCode)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  constructor(private currencyRateApi: CurrencyRateApi) {}

  updateBaseCurrency(code: SupportedCurrencyCode) {
    this.baseCurrency$.next(code);
  }

  private pollUntilNextUpdate(currencyCode: SupportedCurrencyCode): Observable<CurrencyRate> {
    const httpGetCurrencyRate = (): Observable<CurrencyRate> =>
      this.currencyRateApi
        .getCurrencyRate(currencyCode)
        .pipe(
          catchError(() =>
            timer(DEFAULT_POLLING_INTERVAL_TIME).pipe(switchMap(() => httpGetCurrencyRate()))
          )
        );

    return defer(httpGetCurrencyRate).pipe(
      expand((rate) =>
        timer(this.msUntilNextUpdate(rate)).pipe(switchMap(() => httpGetCurrencyRate()))
      )
    );
  }

  private msUntilNextUpdate(rate: CurrencyRate): number {
    const nextUpdateMs = rate.timeNextUpdateUnix * 1000;
    const deltaMs = nextUpdateMs - Date.now();

    if (!Number.isFinite(deltaMs)) {
      return DEFAULT_POLLING_INTERVAL_TIME;
    }

    if (deltaMs <= 0) {
      return 0;
    }

    return Math.max(1000, deltaMs);
  }
}
