export interface CurrencyRate {
  apiStatus: string;
  documentation: string;
  termsOfUse: string;
  timeLastUpdateUnix: number;
  timeLastUpdateUTC: string;
  timeNextUpdateUnix: number;
  timeNextUpdateUTC: string;
  baseCurrencyCode: string;
  conversionRates: Record<string, number>;
}
