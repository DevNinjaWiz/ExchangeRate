import { Injectable } from '@angular/core';
import { Observable, defer, from, of, timer } from 'rxjs';
import {
  catchError,
  concatMap,
  expand,
  map,
  shareReplay,
  switchMap,
  tap,
  toArray,
} from 'rxjs/operators';
import { CurrencyHistoryRateApi } from '../../api';
import {
  CURRENCY,
  DEFAULT_HISTORY_RANGE,
  DEFAULT_POLLING_INTERVAL_TIME,
} from '../../../shared/constants';
import {
  CurrencyHistoryRate,
  CurrencyHistoryRateDateOption,
  SupportedCurrencyCode,
} from '../../../shared/types';
import { toCurrencyHistoryStorageKey, toYYYY_MM_DD } from '../../../shared/functions';

const SHOULD_FETCH_NOW = 0;
const ONE_MS = 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_DATE_RETRIES = 3;

type CachedCurrencyHistorySeries = {
  seriesByDate: Record<string, CurrencyHistoryRate>;
};

@Injectable({ providedIn: 'root' })
export class CurrencyHistory {
  private readonly historySeriesStreamByKey = new Map<string, Observable<CurrencyHistoryRate[]>>();

  constructor(private currencyHistoryRateApi: CurrencyHistoryRateApi) {}

  currencyHistoryRateSeriesFor$(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode
  ) {
    const key = toCurrencyHistoryStorageKey(dateOption, baseCurrencyCode);
    const existing = this.historySeriesStreamByKey.get(key);

    if (existing) {
      return existing;
    }

    const stream = this.pollUntilNextUpdate(dateOption, baseCurrencyCode).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.historySeriesStreamByKey.set(key, stream);

    return stream;
  }

  private pollUntilNextUpdate(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode
  ) {
    const httpGetHistorySeries = (): Observable<CurrencyHistoryRate[]> =>
      this.fetchHistorySeries(dateOption, baseCurrencyCode).pipe(
        tap((series) => this.writeCachedSeries(dateOption, baseCurrencyCode, series)),
        catchError(() =>
          timer(DEFAULT_POLLING_INTERVAL_TIME).pipe(switchMap(() => httpGetHistorySeries()))
        )
      );

    return defer(() => {
      const cached = this.readCachedSeries(dateOption, baseCurrencyCode);
      const requestData = cached ? of(cached) : httpGetHistorySeries();

      return requestData.pipe(
        expand(() => timer(this.msUntilNextUpdate()).pipe(switchMap(() => httpGetHistorySeries())))
      );
    });
  }

  private fetchHistorySeries(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode
  ) {
    const anchorDateString = toYYYY_MM_DD(new Date());
    const anchorDate = this.parseHistoryDate(anchorDateString);
    const points = DEFAULT_HISTORY_RANGE[dateOption];
    const dateStrings = this.buildDailyDateSeries(anchorDate, points);

    const seriesByDate = this.pruneSeriesByDateToExpectedDates(
      this.readCachedSeriesByDate(dateOption, baseCurrencyCode),
      dateStrings
    );

    this.writeCachedSeriesByDate(dateOption, baseCurrencyCode, seriesByDate);

    const getOrFetchDate$ = (date: string): Observable<CurrencyHistoryRate> => {
      const cached = seriesByDate[date];

      if (cached && cached.date === date && cached.baseCurrencyCode === baseCurrencyCode) {
        return of(cached);
      }

      const fetchWithRetry$ = (retriesRemaining: number): Observable<CurrencyHistoryRate> =>
        this.currencyHistoryRateApi.getCurrencyHistoryRate(date, baseCurrencyCode).pipe(
          tap((rate) => {
            seriesByDate[date] = rate;
            this.writeCachedSeriesByDate(dateOption, baseCurrencyCode, seriesByDate);
          }),
          catchError(() => {
            if (retriesRemaining <= 0) {
              return of(this.failedHistoryRate(date, baseCurrencyCode));
            }

            return timer(DEFAULT_POLLING_INTERVAL_TIME).pipe(
              switchMap(() => fetchWithRetry$(retriesRemaining - 1))
            );
          })
        );

      return fetchWithRetry$(MAX_DATE_RETRIES);
    };

    return from(dateStrings).pipe(
      concatMap((date) => getOrFetchDate$(date)),
      toArray()
    );
  }

  private msUntilNextUpdate(): number {
    const now = new Date();
    const nextMidnightUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    );
    const deltaMs = nextMidnightUtc - Date.now();

    if (!Number.isFinite(deltaMs)) {
      return DEFAULT_POLLING_INTERVAL_TIME;
    }

    if (deltaMs <= SHOULD_FETCH_NOW) {
      return SHOULD_FETCH_NOW;
    }

    return Math.max(ONE_MS, deltaMs);
  }

  private readCachedSeries(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode
  ) {
    const points = DEFAULT_HISTORY_RANGE[dateOption];
    const today = toYYYY_MM_DD(new Date());
    const expectedDates = this.buildDailyDateSeries(this.parseHistoryDate(today), points);
    const seriesByDate = this.readCachedSeriesByDate(dateOption, baseCurrencyCode);

    if (!Object.keys(seriesByDate).length) {
      return null;
    }

    const series: CurrencyHistoryRate[] = [];

    for (const date of expectedDates) {
      const cached = seriesByDate[date];

      if (!cached || cached.date !== date || cached.baseCurrencyCode !== baseCurrencyCode) {
        return null;
      }

      series.push(cached);
    }

    return series;
  }

  private writeCachedSeries(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode,
    series: CurrencyHistoryRate[]
  ) {
    const seriesByDate = this.toSeriesByDate(series);
    this.writeCachedSeriesByDate(dateOption, baseCurrencyCode, seriesByDate);
  }

  private readCachedSeriesByDate(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode
  ): Record<string, CurrencyHistoryRate> {
    const seriesString = localStorage.getItem(
      toCurrencyHistoryStorageKey(dateOption, baseCurrencyCode)
    );

    if (!seriesString) {
      return {};
    }

    try {
      const parsed = JSON.parse(seriesString) as
        | CachedCurrencyHistorySeries
        | CurrencyHistoryRate[];

      if (Array.isArray(parsed)) {
        return this.toSeriesByDate(parsed);
      }

      const seriesByDate = parsed?.seriesByDate;

      if (!seriesByDate || typeof seriesByDate !== 'object') {
        return {};
      }

      return seriesByDate as Record<string, CurrencyHistoryRate>;
    } catch {
      return {};
    }
  }

  private writeCachedSeriesByDate(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode,
    seriesByDate: Record<string, CurrencyHistoryRate>
  ) {
    const payload: CachedCurrencyHistorySeries = { seriesByDate };

    localStorage.setItem(
      toCurrencyHistoryStorageKey(dateOption, baseCurrencyCode),
      JSON.stringify(payload)
    );
  }

  private toSeriesByDate(series: CurrencyHistoryRate[]) {
    const seriesByDate: Record<string, CurrencyHistoryRate> = {};

    for (const item of series) {
      if (item?.date && this.shouldCacheRate(item)) {
        seriesByDate[item.date] = item;
      }
    }

    return seriesByDate;
  }

  private pruneSeriesByDateToExpectedDates(
    seriesByDate: Record<string, CurrencyHistoryRate>,
    expectedDates: string[]
  ) {
    const pruned: Record<string, CurrencyHistoryRate> = {};

    for (const date of expectedDates) {
      const cached = seriesByDate[date];

      if (cached && this.shouldCacheRate(cached)) {
        pruned[date] = cached;
      }
    }

    return pruned;
  }

  private shouldCacheRate(rate: CurrencyHistoryRate) {
    const conversionRates = rate?.conversionRates ?? {};
    return !!Object.keys(conversionRates).length;
  }

  private failedHistoryRate(date: string, baseCurrencyCode: SupportedCurrencyCode) {
    return { date, baseCurrencyCode, conversionRates: {} };
  }

  private parseHistoryDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private buildDailyDateSeries(anchorDate: Date, points: number) {
    const dates: string[] = [];

    for (let offset = points - 1; offset >= 0; offset--) {
      dates.push(new Date(anchorDate.getTime() - offset * MS_PER_DAY).toISOString().slice(0, 10));
    }

    return dates;
  }
}
