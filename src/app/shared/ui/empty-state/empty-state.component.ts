import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  imports: [CommonModule],
  template: `
    <div class="widget-empty">
      <span class="empty-icon" aria-hidden="true">{{ icon() }}</span>
      <div class="empty-content">
        <p class="empty-title">{{ title() }}</p>
        @if (subtitle()) {
          <p class="empty-subtitle">{{ subtitle() }}</p>
        }
        @if (showAction()) {
          <button 
            class="action-button" 
            (click)="onAction()"
            type="button"
            [attr.aria-label]="actionLabel() || actionText()"
          >
            {{ actionText() }}
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  readonly icon = input<string>('📭');
  readonly title = input<string>('No items found');
  readonly subtitle = input<string>();
  readonly showAction = input<boolean>(false);
  readonly actionText = input<string>('Get Started');
  readonly actionLabel = input<string>();
  
  readonly action = output<void>();
  
  onAction(): void {
    this.action.emit();
  }
}