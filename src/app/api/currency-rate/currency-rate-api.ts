import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CurrencyRate, SupportedCurrencyCode } from '../../../shared/types';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CurrencyRateApi {
  private readonly apiBaseUrl = `https://v6.exchangerate-api.com/v6/${environment.exchangeRateAPI}`;

  constructor(private http: HttpClient) {}

  getCurrencyRate(currencyCode: string): Observable<CurrencyRate> {
    const normalizedCode = currencyCode.trim().toUpperCase();
    const url = `${this.apiBaseUrl}/latest/${normalizedCode}`;

    return this.http.get<LatestRatesDTO>(url).pipe(
      map((res) => ({
        apiStatus: res.result,
        documentation: res.documentation,
        termsOfUse: res.terms_of_use,
        timeLastUpdateUnix: res.time_last_update_unix,
        timeLastUpdateUTC: res.time_last_update_utc,
        timeNextUpdateUnix: res.time_next_update_unix,
        timeNextUpdateUTC: res.time_next_update_utc,
        baseCurrencyCode: res.base_code,
        conversionRates: res.conversion_rates,
      }))
    );
  }
}

interface LatestRatesDTO {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: SupportedCurrencyCode;
  conversion_rates: Record<SupportedCurrencyCode, number>;
}
