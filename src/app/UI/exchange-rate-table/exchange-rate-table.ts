import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, debounceTime, merge, Subject, takeUntil, tap } from 'rxjs';
import { CurrencyRateApi } from '../../api';

@Component({
  selector: 'app-exchange-rate-table',
  imports: [],
  templateUrl: './exchange-rate-table.html',
  styleUrl: './exchange-rate-table.scss',
  providers: [CurrencyRateApi],
})
export class ExchangeRateTable implements OnInit, OnDestroy {
  private _changeCurrencyCode$ = new Subject<string>();
  private _destroy$ = new Subject<void>();
  private _currencyCode$ = new BehaviorSubject<string>('USD');

  constructor(private _currencyRateApi: CurrencyRateApi) {}

  ngOnInit(): void {
    this.init();
    this.initWatcher();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  onBaseCurrencyChange(code: string) {
    this._changeCurrencyCode$.next(code);
  }

  private init() {
    this._currencyRateApi
      .getCurrencyRateStream(this._currencyCode$)
      .pipe(takeUntil(this._destroy$))
      .subscribe();
  }

  private initWatcher() {
    const watchChangeCurrencyCode$ = this._changeCurrencyCode$.pipe(
      debounceTime(500),
      tap((code) => this._currencyCode$.next(code))
    );

    merge(watchChangeCurrencyCode$).pipe(takeUntil(this._destroy$)).subscribe();
  }
}
