import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SupportedCurrencyCode } from '../../../shared/types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CURRENCY } from '../../../shared/constants';
import { CurrencyHistoryRate } from '../../../shared/types';

@Injectable({ providedIn: 'root' })
export class CurrencyHistoryRateApi {
  private readonly apiHost = 'currency-api.pages.dev';

  constructor(private http: HttpClient) {}

  getCurrencyHistoryRate(
    date: string,
    baseCurrencyCode: SupportedCurrencyCode
  ): Observable<CurrencyHistoryRate> {
    const _baseCurrencyCode = baseCurrencyCode.toLowerCase();
    const url = `https://${date}.${this.apiHost}/v1/currencies/${_baseCurrencyCode}.json`;

    return this.http.get<CurrencyHistoryRateDTO>(url).pipe(
      map((res) => {
        const rates = res[_baseCurrencyCode];
        const rawRatesRecord = rates as Record<string, number>;
        const conversionRates: Partial<Record<SupportedCurrencyCode, number>> = {};

        for (const code of Object.keys(CURRENCY) as SupportedCurrencyCode[]) {
          const rate = rawRatesRecord[code.toLowerCase()];

          if (typeof rate === 'number') {
            conversionRates[code] = rate;
          }
        }

        return {
          date: res.date,
          baseCurrencyCode,
          conversionRates,
        };
      })
    );
  }
}

type CurrencyHistoryRateDTO = {
  date: string;
  [key: string]: string | Record<string, number>;
};
