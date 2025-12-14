import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { take } from 'rxjs/operators';
import { vi } from 'vitest';

import { CurrencyHistory } from './currency-history';
import { CurrencyHistoryRateApi } from '../../api';
import { toYYYY_MM_DD } from '../../../shared/functions';
import { DEFAULT_HISTORY_RANGE, DEFAULT_POLLING_INTERVAL_TIME } from '../../../shared/constants';

describe('CurrencyHistory', () => {
  let service: CurrencyHistory;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CurrencyHistory, CurrencyHistoryRateApi],
    });
    service = TestBed.inject(CurrencyHistory);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('returns cached weekly series and does not call HTTP', () => {
    const today = toYYYY_MM_DD(new Date());
    const points = 7;
    const anchorDate = new Date(`${today}T00:00:00.000Z`);

    const expectedDates: string[] = [];

    for (let offset = points - 1; offset >= 0; offset--) {
      expectedDates.push(
        new Date(anchorDate.getTime() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      );
    }

    localStorage.setItem(
      'exHistory:weekly:USD',
      JSON.stringify([
        { date: expectedDates[0], baseCurrencyCode: 'USD', conversionRates: { MYR: 1 } },
        { date: expectedDates[1], baseCurrencyCode: 'USD', conversionRates: { MYR: 2 } },
        { date: expectedDates[2], baseCurrencyCode: 'USD', conversionRates: { MYR: 3 } },
        { date: expectedDates[3], baseCurrencyCode: 'USD', conversionRates: { MYR: 4 } },
        { date: expectedDates[4], baseCurrencyCode: 'USD', conversionRates: { MYR: 5 } },
        { date: expectedDates[5], baseCurrencyCode: 'USD', conversionRates: { MYR: 6 } },
        { date: expectedDates[6], baseCurrencyCode: 'USD', conversionRates: { MYR: 7 } },
      ])
    );

    let dates: string[] = [];

    service
      .currencyHistoryRateSeriesFor$('weekly', 'USD')
      .pipe(take(1))
      .subscribe((series) => {
        dates = series.map((s) => s.date);
      });

    expect(httpMock.match(() => true)).toHaveLength(0);

    expect(dates).toEqual(expectedDates);
  });

  it('fetches and caches daily series for today', () => {
    const today = toYYYY_MM_DD(new Date());

    let myrRate: number | undefined;

    service
      .currencyHistoryRateSeriesFor$('daily', 'USD')
      .pipe(take(1))
      .subscribe((series) => {
        myrRate = series[0]?.conversionRates.MYR;
      });

    const req = httpMock.expectOne(
      `https://${today}.currency-api.pages.dev/v1/currencies/usd.json`
    );
    req.flush({ date: today, usd: { myr: 4.3, eur: 0.9 } });

    expect(myrRate).toBe(4.3);

    const cached = localStorage.getItem('exHistory:daily:USD');
    expect(cached).toBeTruthy();
    const parsed = JSON.parse(cached as string) as { seriesByDate: Record<string, { date: string }> };
    expect(parsed.seriesByDate[today]?.date).toBe(today);
  });

  it('uses partial cache to avoid refetching earlier dates after a failure', () => {
    const originalWeekly = DEFAULT_HISTORY_RANGE.weekly;
    DEFAULT_HISTORY_RANGE.weekly = 2;

    const today = toYYYY_MM_DD(new Date());
    const yesterday = toYYYY_MM_DD(new Date(Date.now() - 24 * 60 * 60 * 1000));

    const fetchHistorySeries = (service as unknown as { fetchHistorySeries: Function }).fetchHistorySeries.bind(
      service
    ) as (range: string, baseCurrencyCode: string) => ReturnType<CurrencyHistory['currencyHistoryRateSeriesFor$']>;

    const sub = fetchHistorySeries('weekly', 'USD').subscribe();

    const req1 = httpMock.expectOne(
      `https://${yesterday}.currency-api.pages.dev/v1/currencies/usd.json`
    );
    req1.flush({ date: yesterday, usd: { myr: 1 } });

    const req2 = httpMock.expectOne(
      `https://${today}.currency-api.pages.dev/v1/currencies/usd.json`
    );
    req2.flush('Server error', { status: 500, statusText: 'Server Error' });

    sub.unsubscribe();

    const cachedAfterFailure = JSON.parse(localStorage.getItem('exHistory:weekly:USD') as string) as {
      seriesByDate: Record<string, { date: string }>;
    };
    expect(cachedAfterFailure.seriesByDate[yesterday]?.date).toBe(yesterday);

    let dates: string[] = [];

    fetchHistorySeries('weekly', 'USD')
      .pipe(take(1))
      .subscribe((series) => {
        dates = series.map((s) => s.date);
      });

    const reqToday = httpMock.expectOne(
      `https://${today}.currency-api.pages.dev/v1/currencies/usd.json`
    );
    reqToday.flush({ date: today, usd: { myr: 2 } });

    expect(dates).toEqual([yesterday, today]);

    DEFAULT_HISTORY_RANGE.weekly = originalWeekly;
  });

  it('retries a failed date three times then proceeds to next date', () => {
    const originalWeekly = DEFAULT_HISTORY_RANGE.weekly;
    DEFAULT_HISTORY_RANGE.weekly = 3;

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-06T12:00:00.000Z'));

    const today = toYYYY_MM_DD(new Date());
    const yesterday = toYYYY_MM_DD(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const dayBefore = toYYYY_MM_DD(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));

    let result: Array<{ date: string; myr?: number }> = [];

    service
      .currencyHistoryRateSeriesFor$('weekly', 'USD')
      .pipe(take(1))
      .subscribe((series) => {
        result = series.map((s) => ({ date: s.date, myr: s.conversionRates.MYR }));
      });

    const req1 = httpMock.expectOne(
      `https://${dayBefore}.currency-api.pages.dev/v1/currencies/usd.json`
    );
    req1.flush({ date: dayBefore, usd: { myr: 1 } });

    for (let attempt = 0; attempt < 4; attempt++) {
      const req = httpMock.expectOne(
        `https://${yesterday}.currency-api.pages.dev/v1/currencies/usd.json`
      );

      req.flush('Server error', { status: 500, statusText: 'Server Error' });

      if (attempt < 3) {
        vi.advanceTimersByTime(DEFAULT_POLLING_INTERVAL_TIME);
      }
    }

    const req3 = httpMock.expectOne(
      `https://${today}.currency-api.pages.dev/v1/currencies/usd.json`
    );
    req3.flush({ date: today, usd: { myr: 3 } });

    expect(result).toEqual([
      { date: dayBefore, myr: 1 },
      { date: yesterday, myr: undefined },
      { date: today, myr: 3 },
    ]);

    const cached = JSON.parse(localStorage.getItem('exHistory:weekly:USD') as string) as {
      seriesByDate: Record<string, { date: string }>;
    };
    expect(cached.seriesByDate[dayBefore]?.date).toBe(dayBefore);
    expect(cached.seriesByDate[yesterday]).toBeUndefined();
    expect(cached.seriesByDate[today]?.date).toBe(today);

    DEFAULT_HISTORY_RANGE.weekly = originalWeekly;
  });
});
