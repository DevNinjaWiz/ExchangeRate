import { Component, computed, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { TableColumn } from '../../types';

@Component({
  selector: 'app-table',
  imports: [MatTableModule],
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class Table {
  dataSource = input<object[]>([]);
  columns = input<TableColumn[]>([]);

  displayedColumns = computed(() => this.columns().map((c) => c.id));
}
