import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { CurrencyHistoryRateApi } from './currency-history-rate-api';

describe('CurrencyHistoryRateApi', () => {
  let service: CurrencyHistoryRateApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CurrencyHistoryRateApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('calls currency history endpoint', () => {
    let responseDate: string | null = null;
    let responseBaseCurrencyCode: string | null = null;
    let responseMYR: number | undefined;

    service.getCurrencyHistoryRate('2024-03-06', 'USD').subscribe((res) => {
      responseDate = res.date;
      responseBaseCurrencyCode = res.baseCurrencyCode;
      responseMYR = res.conversionRates.MYR;
    });

    const req = httpMock.expectOne(
      'https://2024-03-06.currency-api.pages.dev/v1/currencies/usd.json'
    );
    expect(req.request.method).toBe('GET');

    req.flush({
      date: '2024-03-06',
      usd: {
        myr: 3.7,
      },
    });

    expect(responseDate).toBe('2024-03-06');
    expect(responseBaseCurrencyCode).toBe('USD');
    expect(responseMYR).toBe(3.7);
  });
});
