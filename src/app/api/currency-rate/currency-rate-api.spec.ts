import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { CurrencyRateApi } from './currency-rate-api';

describe('CurrencyRateApi', () => {
  let service: CurrencyRateApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CurrencyRateApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
