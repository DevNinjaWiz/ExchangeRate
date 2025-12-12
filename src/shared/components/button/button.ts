import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ButtonAppearance, ButtonHtmlType, ButtonShape, ButtonSize } from '../../types';

@Component({
  selector: 'app-button',
  imports: [CommonModule],
  templateUrl: './button.html',
  styleUrls: ['./button.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  private sanitizer = inject(DomSanitizer);

  appearance = input<ButtonAppearance>('primary');
  size = input<ButtonSize>('middle');
  shape = input<ButtonShape>('default');
  iconOnly = input(false);
  svg = input<string | SafeHtml | null>(null);
  loading = input(false);
  disabled = input(false);
  block = input(false);
  ghost = input(false);
  href = input<string | undefined>(undefined);
  htmlType = input<ButtonHtmlType>('button');
  target = input<string | undefined>(undefined);
  rel = input<string | undefined>(undefined);

  buttonClasses = computed(() => {
    const classes = [
      'app-button',
      `--${this.appearance()}`,
      `--size-${this.size()}`,
      this.shape() !== 'default' ? `--shape-${this.shape()}` : '',
      this.iconOnly() ? '--icon-only' : '',
      this.block() ? '--block' : '',
      this.ghost() ? '--ghost' : '',
      this.loading() ? '--loading' : '',
      this.disabled() ? '--disabled' : '',
    ].filter(Boolean);

    return classes.join(' ');
  });

  safeSvg = computed<SafeHtml | null>(() => {
    const value = this.svg();
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return this.sanitizer.bypassSecurityTrustHtml(value);
    }

    return value;
  });

  ariaDisabled = computed(() => (this.disabled() || this.loading() ? 'true' : null));

  handleAnchorClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
}
