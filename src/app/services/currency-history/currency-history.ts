import { Injectable } from '@angular/core';
import { Observable, defer, from, of, timer } from 'rxjs';
import {
  catchError,
  concatMap,
  expand,
  shareReplay,
  switchMap,
  tap,
  toArray,
} from 'rxjs/operators';
import { CurrencyHistoryRateApi } from '../../api';
import {
  DEFAULT_HISTORY_RANGE,
  DEFAULT_POLLING_INTERVAL_TIME,
  TIME,
} from '../../../shared/constants';
import {
  CurrencyHistoryRate,
  CurrencyHistoryRateDateOption,
  SupportedCurrencyCode,
} from '../../../shared/types';
import { toCurrencyHistoryStorageKey, toYYYY_MM_DD } from '../../../shared/functions';

const SHOULD_FETCH_NOW = 0;
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
        tap((series) =>
          this.writeCachedSeriesByDate(dateOption, baseCurrencyCode, this.toSeriesByDate(series))
        ),
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
    const todayDate = toYYYY_MM_DD(new Date());
    const points = DEFAULT_HISTORY_RANGE[dateOption];
    const dateStrings = this.buildDailyDateSeries(todayDate, points);

    const cachedSeriesByDate = this.readCachedSeriesByDate(dateOption, baseCurrencyCode);
    const seriesByDate: Record<string, CurrencyHistoryRate> = {};

    for (const date of dateStrings) {
      const cached = cachedSeriesByDate[date];

      if (cached && Object.keys(cached.conversionRates ?? {}).length) {
        seriesByDate[date] = cached;
      }
    }

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
              return of({ date, baseCurrencyCode, conversionRates: {} });
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
    const today = new Date();
    const nextMidnightUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + 1,
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

    return Math.max(TIME.ONE_SECOND, deltaMs);
  }

  private readCachedSeries(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode
  ) {
    const dateOptionRange = DEFAULT_HISTORY_RANGE[dateOption];
    const today = toYYYY_MM_DD(new Date());
    const expectedDates = this.buildDailyDateSeries(today, dateOptionRange);
    const seriesByDate = this.readCachedSeriesByDate(dateOption, baseCurrencyCode);

    if (!Object.keys(seriesByDate).length) {
      return null;
    }

    let series: CurrencyHistoryRate[] = [];

    for (const date of expectedDates) {
      const cached = seriesByDate[date];

      if (!cached || cached.date !== date || cached.baseCurrencyCode !== baseCurrencyCode) {
        return null;
      }

      series = [...series, cached];
    }

    return series;
  }

  private readCachedSeriesByDate(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode
  ) {
    const seriesString = localStorage.getItem(
      toCurrencyHistoryStorageKey(dateOption, baseCurrencyCode)
    );

    if (!seriesString) {
      return {};
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(seriesString);
    } catch {
      return {};
    }

    if (Array.isArray(parsed)) {
      const migrated = this.toSeriesByDate(parsed as CurrencyHistoryRate[]);
      this.writeCachedSeriesByDate(dateOption, baseCurrencyCode, migrated);
      return migrated;
    }

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const seriesByDate = (parsed as CachedCurrencyHistorySeries).seriesByDate;

    if (!seriesByDate || typeof seriesByDate !== 'object' || Array.isArray(seriesByDate)) {
      return {};
    }

    return seriesByDate as Record<string, CurrencyHistoryRate>;
  }

  private writeCachedSeriesByDate(
    dateOption: CurrencyHistoryRateDateOption,
    baseCurrencyCode: SupportedCurrencyCode,
    seriesByDate: Record<string, CurrencyHistoryRate>
  ) {
    localStorage.setItem(
      toCurrencyHistoryStorageKey(dateOption, baseCurrencyCode),
      JSON.stringify({ seriesByDate })
    );
  }

  private toSeriesByDate(series: CurrencyHistoryRate[]) {
    const seriesByDate: Record<string, CurrencyHistoryRate> = {};

    for (const item of series) {
      if (item.date && Object.keys(item.conversionRates ?? {}).length) {
        seriesByDate[item.date] = item;
      }
    }

    return seriesByDate;
  }

  private buildDailyDateSeries(todayDate: string, dateOptionRange: number) {
    const today = new Date(`${todayDate}T00:00:00.000Z`);
    const dates: string[] = [];

    for (let offset = dateOptionRange - 1; offset >= 0; offset--) {
      dates.push(toYYYY_MM_DD(new Date(today.getTime() - offset * TIME.MS_PER_DAY)));
    }

    return dates;
  }
}
