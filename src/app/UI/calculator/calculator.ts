import { Component, signal } from '@angular/core';
import { CURRENCY } from '../../../shared/constants';
import { CalculatorApi } from '../../api';

type TargetState = {
  id: number;
  currencyCode: string;
  amount: number;
};

@Component({
  selector: 'app-calculator',
  imports: [],
  templateUrl: './calculator.html',
  styleUrl: './calculator.scss',
  providers: [CalculatorApi],
})
export class Calculator {
  private targetIdCounter = 0;

  currencies = Object.entries(CURRENCY)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));

  baseCurrencyCode = signal<string>('USD');
  baseAmount = signal<number>(0);
  targets = signal<TargetState[]>([{ id: this.targetIdCounter++, currencyCode: 'EUR', amount: 0 }]);

  constructor(private calculatorApi: CalculatorApi) {}

  onBaseCurrencyChange(event: Event) {
    const code = (event.target as HTMLSelectElement).value;
    this.baseCurrencyCode.set(code);
    this.updateTargetsFromBase().catch((err) =>
      console.error('Failed to update targets from base currency change', err)
    );
  }

  onBaseCurrencyAmountChange(value: string) {
    const amount = this.parseAmount(value);
    this.baseAmount.set(amount);
    this.updateTargetsFromBase().catch((err) =>
      console.error('Failed to update targets from base amount change', err)
    );
  }

  onTargetCurrencyChange(index: number, event: Event) {
    const code = (event.target as HTMLSelectElement).value;
    const nextTargets = [...this.targets()];
    if (!nextTargets[index]) return;
    nextTargets[index] = { ...nextTargets[index], currencyCode: code };
    this.targets.set(nextTargets);

    this.updateTargetsFromBase(index).catch((err) =>
      console.error('Failed to update target from currency change', err)
    );
  }

  onTargetCurrencyAmountChange(index: number, value: string) {
    const amount = this.parseAmount(value);
    const nextTargets = [...this.targets()];
    if (!nextTargets[index]) return;
    nextTargets[index] = { ...nextTargets[index], amount };
    this.targets.set(nextTargets);

    this.updateBaseFromTarget(index)
      .then(() => this.updateTargetsFromBase(index))
      .catch((err) => console.error('Failed to update base from target change', err));
  }

  addTarget() {
    const nextTargets = [
      ...this.targets(),
      { id: this.targetIdCounter++, currencyCode: 'EUR', amount: 0 },
    ];
    this.targets.set(nextTargets);
    this.updateTargetsFromBase(nextTargets.length - 1).catch((err) =>
      console.error('Failed to update new target', err)
    );
  }

  removeTarget(index: number) {
    const nextTargets = [...this.targets()];
    nextTargets.splice(index, 1);
    this.targets.set(nextTargets);
  }

  private async updateTargetsFromBase(excludeIndex?: number) {
    const baseCode = this.baseCurrencyCode();
    const baseAmount = this.baseAmount();
    const currentTargets = this.targets();
    const nextTargets = [...currentTargets];

    await Promise.all(
      currentTargets.map(async (t, i) => {
        if (excludeIndex === i) return;
        const converted = await this.calculatorApi.convertAmount(
          baseCode,
          t.currencyCode,
          baseAmount
        );
        nextTargets[i] = { ...t, amount: this.roundCurrency(converted) };
      })
    );

    this.targets.set(nextTargets);
  }

  private async updateBaseFromTarget(index: number) {
    const target = this.targets()[index];
    if (!target) return;

    const newBase = await this.calculatorApi.convertAmount(
      target.currencyCode,
      this.baseCurrencyCode(),
      target.amount
    );
    this.baseAmount.set(this.roundCurrency(newBase));
  }

  private parseAmount(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  }

  private roundCurrency(value: number) {
    return Math.round(value * 10000) / 10000;
  }
}
