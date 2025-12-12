import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Theme } from '../shared/types';
import {
  LOCAL_STORAGE_KEY,
  THEME_CLASS,
  THEME_MOON_SVG,
  THEME_PALETTE,
  THEME_SUN_SVG,
} from '../shared/constants';
import { Button, Section } from '../shared/components';

import { merge, Subject, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [Button, Section],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit, OnDestroy {
  title = 'Exchange Rate Assignment';
  sunSvg = THEME_SUN_SVG;
  moonSvg = THEME_MOON_SVG;

  themeMode = signal<Theme>(
    (localStorage.getItem(LOCAL_STORAGE_KEY.THEME) as Theme) ?? THEME_PALETTE.LIGHT
  );
  private _toggleTheme$ = new Subject<Theme>();
  private _destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.applyTheme(this.themeMode());

    const watchToggleTheme$ = this._toggleTheme$.pipe(
      tap((theme) => {
        this.themeMode.set(theme);
        localStorage.setItem(LOCAL_STORAGE_KEY.THEME, theme);
        this.applyTheme(theme);
      })
    );

    merge(watchToggleTheme$).pipe(takeUntil(this._destroy$)).subscribe();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  onToggleTheme() {
    this._toggleTheme$.next(
      this.themeMode() === THEME_PALETTE.DARK ? THEME_PALETTE.LIGHT : THEME_PALETTE.DARK
    );
  }

  private applyTheme(theme: Theme): void {
    document.documentElement?.classList.toggle(THEME_CLASS.DARK, theme === THEME_PALETTE.DARK);
  }
}
