import { toDelimiter } from './toDelimiter';

export const toCurrencyDelimiter = (code1: string, code2: string) =>
  toDelimiter('->')(`exRate:${code1}`, code2);
