import { CURRENCY } from '../../constants';
import { SupportedCurrencyCode } from '../../types';

export const getSupportedCurrencyCode = () =>
  Object.keys(CURRENCY).sort() as SupportedCurrencyCode[];
