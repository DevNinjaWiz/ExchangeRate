export interface TableColumn<Row extends object = object> {
  id: string;
  header: string;
  cell(row: Row): unknown;
}
