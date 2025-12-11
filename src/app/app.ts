import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Theme } from '../shared/types';
import { THEME_CLASS, THEME_PALETTE } from '../shared/constants';
import { merge, Subject, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  title = 'Exchange Rate';
  themeMode = signal<Theme>(THEME_PALETTE.DARK);

  private _toggleTheme$ = new Subject<Theme>();
  private _destory$ = new Subject<void>();

  ngOnInit(): void {
    const watchToggleTheme$ = this._toggleTheme$.pipe(
      tap((theme) => {
        this.themeMode.set(theme);

        document.documentElement?.classList.toggle(
          THEME_CLASS.LIGHT,
          theme === THEME_PALETTE.LIGHT
        );
      })
    );

    merge(watchToggleTheme$).pipe(takeUntil(this._destory$)).subscribe();
  }

  ngOnDestroy(): void {
    this._destory$.next();
  }

  toggleTheme() {
    this._toggleTheme$.next(
      this.themeMode() === THEME_PALETTE.DARK ? THEME_PALETTE.LIGHT : THEME_PALETTE.DARK
    );
  }
}
