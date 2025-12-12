import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CalculatorApi } from './calculator-api';

describe('CalculatorApi', () => {
  let service: CalculatorApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CalculatorApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
