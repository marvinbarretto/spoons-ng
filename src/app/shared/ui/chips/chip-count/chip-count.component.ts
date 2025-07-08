import { Component, input, computed, output } from '@angular/core';

export type ChipSize = 'xs' | 'sm' | 'md' | 'lg';
export type ChipVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'accent';

@Component({
  selector: 'app-chip-count',
  template: `
    <span
      class="chip-count"
      [class]="chipClasses()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? '0' : null"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="tooltip() || ariaLabel()"
      (click)="handleClick()"
      (keydown.enter)="handleClick()"
      (keydown.space)="handleClick()">
      
      @if (prefix()) {
        <span class="chip-prefix">{{ prefix() }}</span>
      }
      
      <span class="chip-value">{{ formattedCount() }}</span>
      
      @if (suffix()) {
        <span class="chip-suffix">{{ suffix() }}</span>
      }
      
      @if (showIcon() && icon()) {
        <span class="chip-icon">{{ icon() }}</span>
      }
    </span>
  `,
  styleUrl: './chip-count.component.scss'
})
export class ChipCountComponent {
  readonly count = input.required<number>();
  readonly prefix = input<string>('');
  readonly suffix = input<string>('');
  readonly icon = input<string>('');
  readonly label = input<string>('');
  readonly size = input<ChipSize>('sm');
  readonly variant = input<ChipVariant>('default');
  readonly clickable = input(false);
  readonly showIcon = input(true);
  readonly tooltip = input<string>('');
  readonly customClass = input<string>('');
  readonly formatLargeNumbers = input(true);
  readonly showSign = input(false);

  readonly clicked = output<number>();

  readonly formattedCount = computed(() => {
    const value = this.count();
    const format = this.formatLargeNumbers();
    const showSign = this.showSign();
    
    let formatted = '';
    
    if (format && Math.abs(value) >= 1000) {
      if (Math.abs(value) >= 1000000) {
        formatted = (value / 1000000).toFixed(1) + 'M';
      } else if (Math.abs(value) >= 10000) {
        formatted = Math.floor(value / 1000) + 'k';
      } else {
        formatted = (value / 1000).toFixed(1) + 'k';
      }
    } else {
      formatted = value.toString();
    }
    
    if (showSign && value > 0) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  });

  readonly chipClasses = computed(() => {
    const classes: string[] = [];
    
    classes.push(`size--${this.size()}`);
    classes.push(`variant--${this.variant()}`);
    
    if (this.clickable()) {
      classes.push('clickable');
    }
    
    const value = this.count();
    if (value === 0) {
      classes.push('zero-count');
    } else if (value < 0) {
      classes.push('negative-count');
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
    
    if (this.prefix()) {
      parts.push(this.prefix());
    }
    
    parts.push(this.count().toString());
    
    if (this.suffix()) {
      parts.push(this.suffix());
    }
    
    if (this.clickable()) {
      parts.push('clickable');
    }
    
    return parts.join(' ');
  });

  handleClick(): void {
    if (this.clickable()) {
      this.clicked.emit(this.count());
    }
  }
}