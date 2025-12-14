import { CURRENCY } from '../constants/currency.const';

export interface CurrencyRate {
  apiStatus: string;
  documentation: string;
  termsOfUse: string;
  timeLastUpdateUnix: number;
  timeLastUpdateUTC: string;
  timeNextUpdateUnix: number;
  timeNextUpdateUTC: string;
  baseCurrencyCode: SupportedCurrencyCode;
  conversionRates: Record<SupportedCurrencyCode, number>;
}

export type SupportedCurrencyCode = keyof typeof CURRENCY;

export type CurrencyHistoryRateDateOption = 'daily' | 'weekly' | 'monthly';
