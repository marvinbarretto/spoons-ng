import { Component, input, computed, output } from '@angular/core';

export type ChipSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-chip-filter',
  template: `
    <button
      type="button"
      class="chip-filter"
      [class]="chipClasses()"
      [attr.aria-pressed]="active()"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="tooltip() || ariaLabel()"
      [disabled]="disabled()"
      (click)="handleClick()">
      
      @if (icon()) {
        <span class="chip-icon">{{ icon() }}</span>
      }
      
      <span class="chip-label">{{ label() }}</span>
      
      @if (count() !== null && count() !== undefined) {
        <span class="chip-count">{{ formattedCount() }}</span>
      }
      
      @if (removable() && active()) {
        <span class="chip-remove" 
              (click)="handleRemove($event)"
              [attr.aria-label]="'Remove ' + label() + ' filter'">
          ×
        </span>
      }
    </button>
  `,
  styleUrl: './chip-filter.component.scss'
})
export class ChipFilterComponent {
  readonly label = input.required<string>();
  readonly active = input(false);
  readonly count = input<number | null>(null);
  readonly icon = input<string>('');
  readonly size = input<ChipSize>('md');
  readonly disabled = input(false);
  readonly removable = input(false);
  readonly tooltip = input<string>('');
  readonly customClass = input<string>('');
  readonly formatNumbers = input(true);

  readonly clicked = output<void>();
  readonly removed = output<void>();

  readonly formattedCount = computed(() => {
    const value = this.count();
    if (value === null || value === undefined) return '';
    
    if (this.formatNumbers() && value >= 1000) {
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 10000) {
        return Math.floor(value / 1000) + 'k';
      } else {
        return (value / 1000).toFixed(1) + 'k';
      }
    }
    
    return value.toString();
  });

  readonly chipClasses = computed(() => {
    const classes: string[] = [];
    
    classes.push(`size--${this.size()}`);
    
    if (this.active()) {
      classes.push('active');
    }
    
    if (this.disabled()) {
      classes.push('disabled');
    }
    
    if (this.removable() && this.active()) {
      classes.push('removable');
    }
    
    if (this.customClass()) {
      classes.push(this.customClass());
    }
    
    return classes.join(' ');
  });

  readonly ariaLabel = computed(() => {
    const parts: string[] = [];
    
    parts.push(this.label());
    
    if (this.count() !== null && this.count() !== undefined) {
      parts.push(`${this.count()} items`);
    }
    
    parts.push(this.active() ? 'selected' : 'not selected');
    
    if (this.disabled()) {
      parts.push('disabled');
    }
    
    return parts.join(', ');
  });

  handleClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }

  handleRemove(event: Event): void {
    event.stopPropagation();
    if (!this.disabled()) {
      this.removed.emit();
    }
  }
}