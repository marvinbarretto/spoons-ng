import { Component, input, computed } from '@angular/core';

export type StatusType = 'loading' | 'success' | 'error' | 'warning' | 'info' | 'active' | 'inactive' | 'neutral';
export type ChipSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-chip-status',
  template: `
    <span
      class="chip-status"
      [class]="chipClasses()"
      [attr.role]="role()"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="tooltip() || text()">
      
      @if (showIcon()) {
        <span class="chip-icon">{{ statusIcon() }}</span>
      }
      
      @if (text()) {
        <span class="chip-text">{{ text() }}</span>
      }
    </span>
  `,
  styleUrl: './chip-status.component.scss'
})
export class ChipStatusComponent {
  readonly type = input<StatusType>('neutral');
  readonly text = input<string>('');
  readonly icon = input<string>('');
  readonly size = input<ChipSize>('sm');
  readonly showIcon = input(true);
  readonly tooltip = input<string>('');
  readonly role = input<string>('status');
  readonly customClass = input<string>('');
  readonly animated = input(false);

  readonly statusIcon = computed(() => {
    if (this.icon()) return this.icon();
    
    const iconMap: Record<StatusType, string> = {
      loading: '⏱️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      active: '🟢',
      inactive: '⚫',
      neutral: '⚪'
    };
    
    return iconMap[this.type()] || '⚪';
  });

  readonly chipClasses = computed(() => {
    const classes: string[] = [];
    
    classes.push(`type--${this.type()}`);
    classes.push(`size--${this.size()}`);
    
    if (this.animated() && this.type() === 'loading') {
      classes.push('animated');
    }
    
    if (!this.text()) {
      classes.push('icon-only');
    }
    
    if (this.customClass()) {
      classes.push(this.customClass());
    }
    
    return classes.join(' ');
  });

  readonly ariaLabel = computed(() => {
    const typeText = this.type();
    const displayText = this.text();
    
    if (displayText) {
      return `${typeText} status: ${displayText}`;
    }
    
    return `${typeText} status`;
  });
}