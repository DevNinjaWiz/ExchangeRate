import { Injectable } from '@angular/core';
import { CurrencyRateApi } from '../../api';
import { Observable, defer, of, timer } from 'rxjs';
import { catchError, expand, shareReplay, switchMap, tap } from 'rxjs/operators';
import { DEFAULT_POLLING_INTERVAL_TIME } from '../../../shared/constants';
import { CurrencyRate, SupportedCurrencyCode } from '../../../shared/types';
import { toExchangeRateStorageKey } from '../../../shared/functions';

const SHOULD_FETCH_NOW = 0;
const ONE_MS = 1000;

@Injectable({
  providedIn: 'root',
})
export class ExchangeRate {
  private readonly rateStreamByBaseCurrency = new Map<
    SupportedCurrencyCode,
    Observable<CurrencyRate>
  >();

  constructor(private currencyRateApi: CurrencyRateApi) {}

  currencyRateStreamFor$(baseCurrencyCode: SupportedCurrencyCode) {
    const existingRate = this.rateStreamByBaseCurrency.get(baseCurrencyCode);

    if (existingRate) {
      return existingRate;
    }

    const stream = this.pollUntilNextUpdate(baseCurrencyCode).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.rateStreamByBaseCurrency.set(baseCurrencyCode, stream);

    return stream;
  }

  private pollUntilNextUpdate(currencyCode: SupportedCurrencyCode) {
    const httpGetCurrencyRate = (): Observable<CurrencyRate> =>
      this.currencyRateApi.getCurrencyRate(currencyCode).pipe(
        tap((rate) => this.writeCachedRate(currencyCode, rate)),
        catchError(() =>
          timer(DEFAULT_POLLING_INTERVAL_TIME).pipe(switchMap(() => httpGetCurrencyRate()))
        )
      );

    return defer(() => {
      const cached = this.readCachedRate(currencyCode);
      const requestData =
        cached && this.isCachedRateValid(currencyCode, cached) ? of(cached) : httpGetCurrencyRate();

      return requestData.pipe(
        expand((rate) =>
          timer(this.msUntilNextUpdate(rate)).pipe(switchMap(() => httpGetCurrencyRate()))
        )
      );
    });
  }

  private msUntilNextUpdate(rate: CurrencyRate) {
    const nextUpdateMs = rate.timeNextUpdateUnix * 1000;
    const deltaMs = nextUpdateMs - Date.now();

    if (!Number.isFinite(deltaMs)) {
      return DEFAULT_POLLING_INTERVAL_TIME;
    }

    if (deltaMs <= SHOULD_FETCH_NOW) {
      return SHOULD_FETCH_NOW;
    }

    return Math.max(ONE_MS, deltaMs);
  }

  private readCachedRate(currencyCode: SupportedCurrencyCode) {
    const rateString = localStorage.getItem(toExchangeRateStorageKey(currencyCode));

    if (!rateString) {
      return null;
    }

    return JSON.parse(rateString) as CurrencyRate;
  }

  private writeCachedRate(currencyCode: SupportedCurrencyCode, rate: CurrencyRate) {
    localStorage.setItem(toExchangeRateStorageKey(currencyCode), JSON.stringify(rate));
  }

  private isCachedRateValid(currencyCode: SupportedCurrencyCode, rate: CurrencyRate) {
    if (rate.baseCurrencyCode !== currencyCode) {
      return false;
    }

    return rate.timeNextUpdateUnix * ONE_MS > Date.now();
  }
}
