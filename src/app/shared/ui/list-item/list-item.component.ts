// src/app/shared/ui/list-item/list-item.component.ts
import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStore } from '../../data-access/theme.store';

export type ListItemSize = 'sm' | 'md' | 'lg';
export type ListItemVariant = 'default' | 'card' | 'option' | 'checkbox';

export type ListItemConfig = {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  distance?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  checked?: boolean;
  disabled?: boolean;
  icon?: string;
  image?: string;
};

@Component({
  selector: 'app-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="list-item"
      [class]="containerClasses()"
      [attr.role]="role()"
      [attr.aria-selected]="config().checked"
      [attr.aria-disabled]="config().disabled"
      (click)="handleClick()"
    >
      <!-- Checkbox for form controls -->
      @if (variant() === 'checkbox' && !config().disabled) {
        <input
          type="checkbox"
          class="list-item__checkbox"
          [checked]="config().checked || false"
          [disabled]="config().disabled"
          (change)="handleCheckboxChange($event)"
          (click)="$event.stopPropagation()"
        />
      }

      <!-- Icon or Image -->
      @if (config().icon || config().image) {
        <div class="list-item__media">
          @if (config().image) {
            <img
              [src]="config().image!"
              [alt]="config().title"
              class="list-item__image"
            />
          } @else if (config().icon) {
            <span class="list-item__icon">{{ config().icon }}</span>
          }
        </div>
      }

      <!-- Content Area -->
      <div class="list-item__content">
        <div class="list-item__header">
          <h3 class="list-item__title">{{ config().title }}</h3>

          @if (config().badge) {
            <span
              class="list-item__badge"
              [class]="badgeClasses()"
            >
              {{ config().badge }}
            </span>
          }
        </div>

        @if (config().subtitle) {
          <p class="list-item__subtitle">{{ config().subtitle }}</p>
        }

        @if (config().description) {
          <p class="list-item__description">{{ config().description }}</p>
        }

        <!-- Distance and status info -->
        <div class="list-item__meta">
          @if (config().distance) {
            <span class="list-item__distance">📍 {{ config().distance }}</span>
          }

          @if (config().status) {
            <span
              class="list-item__status"
              [class]="statusClasses()"
            >
              {{ statusText() }}
            </span>
          }
        </div>
      </div>

      <!-- Action button for option variant -->
      @if (variant() === 'option') {
        <button
          class="list-item__action"
          [disabled]="config().disabled"
          type="button"
        >
          {{ config().checked ? '✓' : '→' }}
        </button>
      }
    </div>
  `,
  styles: `
    .list-item {
      /* Base layout */
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      transition: all 0.2s ease;
      position: relative;

      /* Container queries for responsive layout */
      container-type: inline-size;
      container-name: list-item;
    }

    /* Interactive states */
    .list-item.clickable {
      cursor: pointer;
    }

    .list-item.clickable:hover:not(.disabled) {
      border-color: var(--color-primary);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .list-item.clickable:active:not(.disabled) {
      transform: translateY(0);
    }

    /* Selected state */
    .list-item.selected {
      border-color: var(--color-primary);
      background: var(--color-primary-subtle);
    }

    /* Disabled state */
    .list-item.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Size variants */
    .list-item.size-sm {
      padding: 0.5rem 0.75rem;
      gap: 0.5rem;
    }

    .list-item.size-lg {
      padding: 1.5rem;
      gap: 1rem;
    }

    /* Checkbox */
    .list-item__checkbox {
      flex-shrink: 0;
      width: 1.25rem;
      height: 1.25rem;
      margin: 0;
      accent-color: var(--color-primary);
    }

    /* Media */
    .list-item__media {
      flex-shrink: 0;
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: var(--color-background);
    }

    .list-item__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 6px;
    }

    .list-item__icon {
      font-size: 1.25rem;
    }

    /* Content */
    .list-item__content {
      flex: 1;
      min-width: 0; /* Prevent overflow */
    }

    .list-item__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .list-item__title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text);
      line-height: 1.3;
    }

    .list-item__subtitle {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0 0 0.25rem 0;
      line-height: 1.3;
    }

    .list-item__description {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0 0 0.5rem 0;
      line-height: 1.4;
    }

    .list-item__meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .list-item__distance {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    /* Badge */
    .list-item__badge {
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--color-primary);
      color: var(--color-primary-text);
      white-space: nowrap;
    }

    .list-item__badge.success {
      background: var(--color-success);
      color: var(--color-success-text);
    }

    .list-item__badge.warning {
      background: var(--color-warning);
      color: var(--color-warning-text);
    }

    .list-item__badge.error {
      background: var(--color-error);
      color: var(--color-error-text);
    }

    /* Status */
    .list-item__status {
      padding: 0.125rem 0.375rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .list-item__status.success {
      background: var(--color-success-subtle);
      color: var(--color-success);
    }

    .list-item__status.warning {
      background: var(--color-warning-subtle);
      color: var(--color-warning);
    }

    .list-item__status.error {
      background: var(--color-error-subtle);
      color: var(--color-error);
    }

    .list-item__status.info {
      background: var(--color-info-subtle);
      color: var(--color-info);
    }

    /* Action button */
    .list-item__action {
      flex-shrink: 0;
      width: 2.5rem;
      height: 2.5rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-background);
      color: var(--color-text);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .list-item__action:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    .list-item__action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Container queries for responsive behavior */
    @container list-item (max-width: 300px) {
      .list-item {
        flex-direction: column;
        text-align: center;
      }

      .list-item__header {
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .list-item__checkbox {
        align-self: flex-start;
      }

      .list-item__action {
        align-self: center;
      }
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .list-item {
        /* Larger touch targets */
        min-height: 3.5rem;
      }

      .list-item.clickable {
        /* Enhanced touch feedback */
        -webkit-tap-highlight-color: var(--color-primary-subtle);
      }

      .list-item__title {
        font-size: 1.125rem;
      }

      .list-item__meta {
        gap: 0.5rem;
      }
    }

    /* Dark mode adjustments */
    @media (prefers-color-scheme: dark) {
      .list-item {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .list-item.clickable:hover:not(.disabled) {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
    }
  `
})
export class ListItemComponent {
  private readonly themeStore = inject(ThemeStore);

  // ✅ Inputs following your signal conventions
  readonly config = input.required<ListItemConfig>();
  readonly variant = input<ListItemVariant>('default');
  readonly size = input<ListItemSize>('md');
  readonly clickable = input<boolean>(false);

  // ✅ Outputs for interactions
  readonly clicked = output<ListItemConfig>();
  readonly checked = output<{ config: ListItemConfig; checked: boolean }>();

  // ✅ Computed properties for CSS classes
  readonly containerClasses = computed(() => {
    const classes = ['list-item'];

    classes.push(`variant-${this.variant()}`);
    classes.push(`size-${this.size()}`);

    if (this.clickable() || this.variant() === 'option' || this.variant() === 'checkbox') {
      classes.push('clickable');
    }

    if (this.config().checked) {
      classes.push('selected');
    }

    if (this.config().disabled) {
      classes.push('disabled');
    }

    return classes.join(' ');
  });

  readonly badgeClasses = computed(() => {
    const classes = ['list-item__badge'];
    const status = this.config().status;
    if (status) {
      classes.push(status);
    }
    return classes.join(' ');
  });

  readonly statusClasses = computed(() => {
    const classes = ['list-item__status'];
    const status = this.config().status;
    if (status) {
      classes.push(status);
    }
    return classes.join(' ');
  });

  readonly statusText = computed(() => {
    const status = this.config().status;
    switch (status) {
      case 'success': return '✓ Success';
      case 'warning': return '⚠ Warning';
      case 'error': return '✗ Error';
      case 'info': return 'ℹ Info';
      default: return '';
    }
  });

  readonly role = computed(() => {
    switch (this.variant()) {
      case 'checkbox': return 'checkbox';
      case 'option': return 'option';
      default: return this.clickable() ? 'button' : null;
    }
  });

  // ✅ Event handlers
  handleClick(): void {
    if (this.config().disabled) return;

    if (this.variant() === 'checkbox') {
      this.handleCheckboxToggle();
    } else if (this.clickable() || this.variant() === 'option') {
      this.clicked.emit(this.config());
    }
  }

  handleCheckboxChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.checked.emit({
      config: this.config(),
      checked: checkbox.checked
    });
  }

  private handleCheckboxToggle(): void {
    const newChecked = !this.config().checked;
    this.checked.emit({
      config: this.config(),
      checked: newChecked
    });
  }
}
