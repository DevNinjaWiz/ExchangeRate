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

import { fromEvent, map, merge, Subject, takeUntil, tap } from 'rxjs';
import { Calculator } from './calculator/calculator';

@Component({
  selector: 'app-root',
  imports: [Button, Section, Calculator],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit, OnDestroy {
  title = 'Exchange Rate Assignment';
  sunSvg = THEME_SUN_SVG;
  moonSvg = THEME_MOON_SVG;
  isOnline = signal<boolean>(navigator.onLine);

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

    const watchOnlineStatus$ = merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(tap((online) => this.isOnline.set(online)));

    merge(watchToggleTheme$, watchOnlineStatus$).pipe(takeUntil(this._destroy$)).subscribe();
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
