import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Theme } from '../shared/types';
import { THEME_CLASS, THEME_MOON_SVG, THEME_PALETTE, THEME_SUN_SVG } from '../shared/constants';
import { Button } from '../shared/components';

import { merge, Subject, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [Button],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit, OnDestroy {
  title = 'Exchange Rate';
  sunSvg = THEME_SUN_SVG;
  moonSvg = THEME_MOON_SVG;

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
