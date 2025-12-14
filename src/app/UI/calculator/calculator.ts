import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  merge,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { CurrencyHistory, ExchangeRate } from '../../services';
import { Select } from '../../../shared/components';
import {
  CURRENCY,
  DEFAULT_BASE_CURRENCY_CODE,
  DEFAULT_TARGET_CURRENCY_CODE,
} from '../../../shared/constants';
import { CurrencyRate, SupportedCurrencyCode } from '../../../shared/types';
import {
  getSupportedCurrencyCode,
  toDashDropDownDelimiter,
  toTwoDecimalPlace,
} from '../../../shared/functions';

const SAME_CURRENCY_CODE_RATE = 1;
const LOAD_RATE_MESSAGE = 'Loading exchange rate…';

@Component({
  selector: 'app-calculator',
  imports: [CommonModule, Select],
  templateUrl: './calculator.html',
  styleUrl: './calculator.scss',
  providers: [],
})
export class Calculator implements OnInit, OnDestroy {
  supportedCurrencyCodes = getSupportedCurrencyCode();
  currencyOptionLabel = (code: SupportedCurrencyCode) =>
    toDashDropDownDelimiter(code, CURRENCY[code] ?? '');

  baseCurrencyCode = signal<SupportedCurrencyCode>(DEFAULT_BASE_CURRENCY_CODE);
  targetCurrencyCode = signal<SupportedCurrencyCode>(DEFAULT_TARGET_CURRENCY_CODE);
  baseAmount = signal<number>(0);
  targetAmount = signal<number>(0);
  currencyRate = signal<CurrencyRate | null>(null);

  conversionRate = computed(() => {
    const rate = this.currencyRate();

    if (!rate) {
      return null;
    }

    if (rate.baseCurrencyCode !== this.baseCurrencyCode()) {
      return null;
    }

    if (this.baseCurrencyCode() === this.targetCurrencyCode()) {
      return SAME_CURRENCY_CODE_RATE;
    }

    return rate.conversionRates[this.targetCurrencyCode()];
  });

  rateLabel = computed(() => {
    const rate = this.conversionRate();

    if (rate === null) {
      return LOAD_RATE_MESSAGE;
    }

    return `1 ${this.baseCurrencyCode()} = ${rate.toFixed(4)} ${this.targetCurrencyCode()}`;
  });

  private _changeBaseCurrencyCode$ = new BehaviorSubject<SupportedCurrencyCode>(
    this.baseCurrencyCode()
  );
  private _changeTargetCurrencyCode$ = new BehaviorSubject<SupportedCurrencyCode>(
    this.targetCurrencyCode()
  );
  private _changeBaseCurrencyAmount$ = new Subject<number>();
  private _changeTargetCurrencyAmount$ = new Subject<number>();
  private _destroy$ = new Subject<void>();

  constructor(private exchangeRate: ExchangeRate) {}

  ngOnInit(): void {
    this.initWatcher();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  onBaseCurrencyChange(value: string) {
    const code = value.toUpperCase() as SupportedCurrencyCode;

    if (!(code in CURRENCY)) {
      return;
    }

    this._changeBaseCurrencyCode$.next(code);
  }

  onTargetCurrencyChange(value: string) {
    const code = value.toUpperCase() as SupportedCurrencyCode;

    if (!(code in CURRENCY)) {
      return;
    }

    this._changeTargetCurrencyCode$.next(code);
  }

  onBaseAmountInput(value: string) {
    this._changeBaseCurrencyAmount$.next(+value);
  }

  onTargetAmountInput(value: string) {
    this._changeTargetCurrencyAmount$.next(+value);
  }

  private initWatcher() {
    const watchChangeBaseCurrency$ = this._changeBaseCurrencyCode$.pipe(
      distinctUntilChanged(),
      tap((code) => this.baseCurrencyCode.set(code)),
      switchMap((code) =>
        this.exchangeRate.currencyRateStreamFor$(code ?? DEFAULT_BASE_CURRENCY_CODE)
      ),
      tap((rate) => {
        this.currencyRate.set(rate);
        this.recalculateFromBase();
      })
    );

    const watchChangeTargetCurrency$ = this._changeTargetCurrencyCode$.pipe(
      distinctUntilChanged(),
      tap((code) => {
        this.targetCurrencyCode.set(code);
        this.recalculateFromTarget();
      })
    );

    const watchChangeBaseCurrencyAmount$ = this._changeBaseCurrencyAmount$.pipe(
      tap((amount) => {
        this.baseAmount.set(amount);
        this.recalculateFromBase();
      })
    );

    const watchChangeTargetCurrencyAmount$ = this._changeTargetCurrencyAmount$.pipe(
      tap((amount) => {
        this.targetAmount.set(amount);
        this.recalculateFromTarget();
      })
    );

    merge(
      watchChangeBaseCurrency$,
      watchChangeTargetCurrency$,
      watchChangeBaseCurrencyAmount$,
      watchChangeTargetCurrencyAmount$
    )
      .pipe(takeUntil(this._destroy$))
      .subscribe();
  }

  private recalculateFromBase() {
    this.targetAmount.set(toTwoDecimalPlace(this.baseAmount() * (this.conversionRate() ?? 0)));
  }

  private recalculateFromTarget() {
    this.baseAmount.set(toTwoDecimalPlace(this.targetAmount() / (this.conversionRate() ?? 1)));
  }
}
