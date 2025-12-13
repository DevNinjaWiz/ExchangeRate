import { SupportedCurrencyCode } from './currency.type';

export interface TableColumn<Row extends object = object> {
  id: string;
  header: string;
  cell(row: Row): unknown;
}

export interface TableRow {
  currency: SupportedCurrencyCode;
  description: string;
  rate: number;
}
