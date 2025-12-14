import { SupportedCurrencyCode } from './currency.type';

export interface CurrencyHistoryRate {
  date: string;
  baseCurrencyCode: SupportedCurrencyCode;
  conversionRates: Partial<Record<SupportedCurrencyCode, number>>;
}

