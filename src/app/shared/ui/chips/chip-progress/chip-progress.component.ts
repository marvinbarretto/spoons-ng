import { Component, computed, input } from '@angular/core';

export type ProgressState = 'pending' | 'in-progress' | 'completed' | 'failed' | 'warning';
export type ChipSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-chip-progress',
  template: `
    <div
      class="chip-progress"
      [class]="chipClasses()"
      [attr.role]="'progressitem'"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-current]="isActive() ? 'step' : null"
      [attr.title]="tooltip() || ariaLabel()"
    >
      <div class="chip-indicator">
        @if (showIcon()) {
          <span class="chip-icon">{{ stateIcon() }}</span>
        }

        @if (showProgress() && state() === 'in-progress') {
          <div class="progress-spinner"></div>
        }
      </div>

      @if (label()) {
        <span class="chip-label">{{ label() }}</span>
      }

      @if (showValue() && value() !== null && value() !== undefined) {
        <span class="chip-value">{{ displayValue() }}</span>
      }
    </div>
  `,
  styleUrl: './chip-progress.component.scss',
})
export class ChipProgressComponent {
  readonly state = input<ProgressState>('pending');
  readonly label = input<string>('');
  readonly value = input<number | null>(null);
  readonly maxValue = input<number | null>(null);
  readonly size = input<ChipSize>('sm');
  readonly showIcon = input(true);
  readonly showProgress = input(true);
  readonly showValue = input(false);
  readonly isActive = input(false);
  readonly tooltip = input<string>('');
  readonly customClass = input<string>('');
  readonly customIcon = input<string>('');
  readonly unit = input<string>('');

  readonly stateIcon = computed(() => {
    if (this.customIcon()) return this.customIcon();

    const iconMap: Record<ProgressState, string> = {
      pending: '⏳',
      'in-progress': '🔄',
      completed: '✅',
      failed: '❌',
      warning: '⚠️',
    };

    return iconMap[this.state()] || '⏳';
  });

  readonly displayValue = computed(() => {
    const value = this.value();
    const maxValue = this.maxValue();
    const unit = this.unit();

    if (value === null || value === undefined) return '';

    let display = value.toString();

    if (maxValue !== null && maxValue !== undefined) {
      display = `${value}/${maxValue}`;
    }

    if (unit) {
      display += ` ${unit}`;
    }

    return display;
  });

  readonly chipClasses = computed(() => {
    const classes: string[] = [];

    classes.push(`state--${this.state()}`);
    classes.push(`size--${this.size()}`);

    if (this.isActive()) {
      classes.push('active');
    }

    if (this.state() === 'in-progress' && this.showProgress()) {
      classes.push('animated');
    }

    if (this.customClass()) {
      classes.push(this.customClass());
    }

    return classes.join(' ');
  });

  readonly ariaLabel = computed(() => {
    const parts: string[] = [];

    if (this.label()) {
      parts.push(this.label());
    }

    parts.push(this.state());

    if (this.showValue() && this.value() !== null && this.value() !== undefined) {
      parts.push(`value: ${this.displayValue()}`);
    }

    if (this.isActive()) {
      parts.push('current step');
    }

    return parts.join(', ');
  });
}
