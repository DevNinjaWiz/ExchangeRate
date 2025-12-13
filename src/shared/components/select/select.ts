import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-select',
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class Select<TOption = unknown, TValue = TOption | TOption[]> {
  label = input<string>('');
  multiple = input<boolean>(false);
  panelClass = input<string | string[] | Set<string> | { [key: string]: any } | undefined>(
    undefined
  );
  value = input<TValue | null>(null);
  options = input<TOption[]>([]);
  optionLabel = input<(option: TOption) => string>((option) => String(option ?? ''));

  selectionChange = output<TValue>();

  handleSelectionChange(event: MatSelectChange): void {
    this.selectionChange.emit(event.value as TValue);
  }
}
