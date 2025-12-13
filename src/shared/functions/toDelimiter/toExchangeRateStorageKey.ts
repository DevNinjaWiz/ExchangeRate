import { LOCAL_STORAGE_KEY } from '../../constants';
import { SupportedCurrencyCode } from '../../types';
import { toDelimiter } from './toDelimiter';

export const toExchangeRateStorageKey = (currencyCode: SupportedCurrencyCode) =>
  toDelimiter(':')(LOCAL_STORAGE_KEY.EXCHANGE_RATE_PREFIX, currencyCode);

