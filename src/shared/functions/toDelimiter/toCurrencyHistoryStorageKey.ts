import { LOCAL_STORAGE_KEY } from '../../constants';
import { CurrencyHistoryRateDateOption, SupportedCurrencyCode } from '../../types';
import { toDelimiter } from './toDelimiter';

export const toCurrencyHistoryStorageKey = (
  range: CurrencyHistoryRateDateOption,
  currencyCode: SupportedCurrencyCode
) =>
  toDelimiter(':')(
    toDelimiter(':')(LOCAL_STORAGE_KEY.CURRENCY_HISTORY_PREFIX, range),
    currencyCode
  );
