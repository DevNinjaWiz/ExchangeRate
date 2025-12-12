import { Component, signal } from '@angular/core';
import { CURRENCY } from '../../shared/constants';

@Component({
  selector: 'app-calculator',
  imports: [],
  templateUrl: './calculator.html',
  styleUrl: './calculator.scss',
})
export class Calculator {
  currencyOptions = Object.entries(CURRENCY)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));

  baseCurrencyCode = signal<string>('USD');
  targetCurrencyCode = signal<string>('EUR');
  baseAmount = signal<number>(0);
  targetAmount = signal<number>(0);

  onBaseCurrencyChange(event: Event) {
    const code = (event.target as HTMLSelectElement).value;

    console.log('code chg', code);
  }

  onBaseCurrencyAmountChange(value: string) {
    console.log('value chg', value);
  }

  onTargetCurrencyChange(event: Event) {}

  onTargetCurrencyAmountChange(value: string) {}
}
