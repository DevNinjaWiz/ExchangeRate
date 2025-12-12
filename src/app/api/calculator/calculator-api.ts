import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { toCurrencyDelimiter } from '../../../shared/functions';

@Injectable()
export class CalculatorApi {
  private readonly apiBaseUrl = 'https://v6.exchangerate-api.com/v6/a2e98cc5fcfd6fc69a49bad1';

  constructor(private http: HttpClient) {}

  async convertAmount(fromCode: string, toCode: string, amount: number): Promise<number> {
    if (fromCode === toCode) return amount;
    if (!Number.isFinite(amount)) return 0;
    const rate = await this.getRate(fromCode, toCode);
    return amount * rate;
  }

  async getRate(baseCode: string, targetCode: string): Promise<number> {
    const cacheKey = toCurrencyDelimiter(baseCode, targetCode);
    const cached = this.readCachedRate(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.rate;
    }

    try {
      const url = `${this.apiBaseUrl}/pair/${baseCode}/${targetCode}/1`;
      const response = await firstValueFrom(this.http.get<PairConversionDTO>(url));

      if (response?.result !== 'success') {
        throw new Error('API returned non-success result');
      }

      const expiresAt = response.time_next_update_unix * 1000;
      this.writeCachedRate(cacheKey, {
        rate: response.conversion_rate,
        expiresAt,
      });

      return response.conversion_rate;
    } catch (err) {
      if (cached) return cached.rate;
      throw err;
    }
  }

  private readCachedRate(cacheKey: string): CachedRate | null {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedRate;
      if (typeof parsed?.rate !== 'number' || typeof parsed?.expiresAt !== 'number') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private writeCachedRate(cacheKey: string, value: CachedRate) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(value));
    } catch {
      // ignore storage errors (quota/private mode)
    }
  }
}

interface PairConversionDTO {
  result: string;
  base_code: string;
  target_code: string;
  conversion_rate: number;
  conversion_result: number;
  time_next_update_unix: number;
  time_next_update_utc: string;
}

type CachedRate = {
  rate: number;
  expiresAt: number;
};
