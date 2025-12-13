import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExchangeRateTable } from './exchange-rate-table';
import { CurrencyRate } from '../../../shared/types';

describe('ExchangeRateTable', () => {
  let component: ExchangeRateTable;
  let fixture: ComponentFixture<ExchangeRateTable>;

  const mockRate: CurrencyRate = {
    apiStatus: 'success',
    documentation: '',
    termsOfUse: '',
    timeLastUpdateUnix: 0,
    timeLastUpdateUTC: '',
    timeNextUpdateUnix: 0,
    timeNextUpdateUTC: '',
    baseCurrencyCode: 'USD',
    conversionRates: {
      USD: 1,
      AUD: 1.5,
      EUR: 0.9,
      GBP: 0.8,
    } as any,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExchangeRateTable],
    }).compileComponents();

    fixture = TestBed.createComponent(ExchangeRateTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters rows by currency code', () => {
    component.currencyRate.set(mockRate);

    component.onSearchCurrency('eu');

    expect(component.tableRows().map((row) => row.currency)).toEqual(['EUR']);
  });

  it('filters rows by currency description (case-insensitive)', () => {
    component.currencyRate.set(mockRate);

    component.onSearchCurrency('DoLlAr');

    expect(component.tableRows().map((row) => row.currency)).toEqual(['USD', 'AUD']);
  });

  it('clears search query when clearing filters', () => {
    component.currencyRate.set(mockRate);
    component.onSearchCurrency('eur');

    component.clearCurrencyFilter();

    expect(component.currencySearchQuery()).toBe('');
    expect(component.tableRows().length).toBe(4);
  });
});
