import { Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';

export type ChipSize = 'xs' | 'sm' | 'md' | 'lg';
export type ChipVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-chip-icon',
  imports: [IconComponent],
  template: `
    <div
      class="chip-icon"
      [class]="chipClasses()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? '0' : null"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="tooltip()"
      (click)="handleClick()"
      (keydown.enter)="handleClick()"
      (keydown.space)="handleClick()"
    >
      <app-icon
        [name]="icon()"
        [size]="iconSize()"
        [filled]="filled()"
        [weight]="weight()"
        customClass="chip-icon-element"
      />

      @if (label()) {
        <span class="chip-text">{{ label() }}</span>
      }

      @if (count() !== null && count() !== undefined) {
        <span class="count-badge" [attr.aria-label]="'Count: ' + count()">
          {{ formatCount(count()!) }}
        </span>
      }
    </div>
  `,
  styleUrl: './chip-icon.component.scss',
})
export class ChipIconComponent {
  readonly icon = input.required<string>();
  readonly label = input<string>();
  readonly count = input<number | null>(null);
  readonly size = input<ChipSize>('md');
  readonly variant = input<ChipVariant>('default');
  readonly clickable = input(false);
  readonly filled = input(false);
  readonly weight = input<'light' | 'regular' | 'medium' | 'bold'>('regular');
  readonly tooltip = input<string>('');
  readonly customClass = input<string>('');

  readonly clicked = output<string>();

  readonly iconSize = computed(() => {
    const size = this.size();
    const sizeMap = {
      xs: 'xs' as const,
      sm: 'sm' as const,
      md: 'sm' as const, // Icon slightly smaller than chip
      lg: 'md' as const,
    };
    return sizeMap[size];
  });

  readonly chipClasses = computed(() => {
    const classes: string[] = [];

    classes.push(`size--${this.size()}`);
    classes.push(`variant--${this.variant()}`);

    if (this.clickable()) {
      classes.push('clickable');
    }

    if (this.customClass()) {
      classes.push(this.customClass());
    }

    return classes.join(' ');
  });

  readonly ariaLabel = computed(() => {
    const parts: string[] = [];

    if (this.label()) {
      parts.push(this.label()!);
    } else {
      parts.push(`Icon ${this.icon()}`);
    }

    if (this.count() !== null && this.count() !== undefined) {
      parts.push(`count ${this.count()}`);
    }

    if (this.clickable()) {
      parts.push('clickable');
    }

    return parts.join(', ');
  });

  handleClick(): void {
    if (this.clickable()) {
      this.clicked.emit(this.icon());
    }
  }

  formatCount(count: number): string {
    if (count < 1000) {
      return count.toString();
    } else if (count < 10000) {
      return (count / 1000).toFixed(1) + 'k';
    } else {
      return Math.floor(count / 1000) + 'k';
    }
  }
}
