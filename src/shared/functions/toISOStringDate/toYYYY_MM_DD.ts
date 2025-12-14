import { toISOStringDate } from './toISOStringDate';

export const toYYYY_MM_DD = (date: Date) => toISOStringDate(0, 10)(date);
