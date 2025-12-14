import { toDelimiter } from './toDelimiter';

export const toDashDropDownDelimiter = (value1: string, value2: string) =>
  toDelimiter('-')(`${value1} `, ` ${value2}`);
