import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CurrencyRate } from '../../../shared/types';
import { EMPTY, Observable, timer } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
} from 'rxjs/operators';

@Injectable()
export class CurrencyRateApi {
  private readonly apiBaseUrl = 'https://v6.exchangerate-api.com/v6/a2e98cc5fcfd6fc69a49bad1';
  private readonly pollingIntervalMs = 5_000;

  constructor(private http: HttpClient) {}

  getCurrencyRateStream(currencyCode$: Observable<string>): Observable<CurrencyRate> {
    return currencyCode$.pipe(
      map((code) => code.trim().toUpperCase()),
      filter((code) => code.length > 0),
      distinctUntilChanged(),
      switchMap((currencyCode) =>
        timer(0, this.pollingIntervalMs).pipe(switchMap(() => this.fetchCurrencyRate(currencyCode)))
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  private fetchCurrencyRate(currencyCode: string): Observable<CurrencyRate> {
    const url = `${this.apiBaseUrl}/latest/${currencyCode}`;

    return this.http.get<LatestRatesDTO>(url).pipe(
      map((res) => ({
        apiStatus: res.result,
        documentation: res.documentation,
        termsOfUse: res.terms_of_use,
        timeLastUpdateUnix: res.time_last_update_unix,
        timeLastUpdateUTC: res.time_last_update_utc,
        timeNextUpdateUnix: res.time_next_update_unix,
        timeNextUpdateUTC: res.time_next_update_utc,
        baseCurrencyCode: res.base_code,
        conversionRates: res.conversion_rates,
      })),
      catchError(() => EMPTY)
    );
  }
}

interface LatestRatesDTO {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}
