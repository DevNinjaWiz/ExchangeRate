import { CurrencyHistoryRateDateOption } from '../types';

export const DEFAULT_HISTORY_RANGE: Record<CurrencyHistoryRateDateOption, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};
