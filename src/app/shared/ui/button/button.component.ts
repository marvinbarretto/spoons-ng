// src/app/shared/ui/button/button.component.ts
import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonSize, ButtonSizeType, ButtonVariant, ButtonVariantType } from './button.params';
@Component({
  selector: 'app-button',
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Regular Button -->
    @if (!routerLink()) {
      <button
        [attr.data-variant]="variant()"
        [attr.data-size]="size()"
        [disabled]="isDisabled()"
        [class.is-loading]="loading()"
        [class.full-width]="fullWidth()"
        [class.icon-only]="isIconOnly()"
        [attr.aria-busy]="loading()"
        [attr.aria-label]="ariaLabel()"
        [attr.title]="tooltip()"
        (click)="handleClick($event)"
        [attr.type]="type()"
        class="btn"
      >
        <ng-container *ngTemplateOutlet="buttonContent"></ng-container>
      </button>
    }

    <!-- Router Link Button -->
    @if (routerLink()) {
      <a
        [routerLink]="routerLink()"
        [queryParams]="queryParams()"
        [fragment]="fragment()"
        [attr.data-variant]="variant()"
        [attr.data-size]="size()"
        [class.is-loading]="loading()"
        [class.full-width]="fullWidth()"
        [class.icon-only]="isIconOnly()"
        [class.disabled]="isDisabled()"
        [attr.aria-busy]="loading()"
        [attr.aria-label]="ariaLabel()"
        [attr.title]="tooltip()"
        [attr.tabindex]="isDisabled() ? -1 : 0"
        class="btn btn--link"
        (click)="handleLinkClick($event)"
      >
        <ng-container *ngTemplateOutlet="buttonContent"></ng-container>
      </a>
    }

    <!-- Button Content Template -->
    <ng-template #buttonContent>
      @if (loading()) {
        <span class="btn__spinner" aria-hidden="true"></span>
        @if (!isIconOnly()) {
          <span class="btn__text">{{ loadingText() || 'Loading...' }}</span>
        }
      } @else {
        @if (iconLeft()) {
          <span class="btn__icon btn__icon--left material-symbols-outlined">
            {{ iconLeft() }}
          </span>
        }

        @if (!isIconOnly()) {
          <span class="btn__text">
            <ng-content />
          </span>
        }

        @if (iconRight()) {
          <span class="btn__icon btn__icon--right material-symbols-outlined">
            {{ iconRight() }}
          </span>
        }

        @if (badge()) {
          <span class="btn__badge">{{ badge() }}</span>
        }
      }
    </ng-template>
  `,
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  // Core props
  readonly variant = input<ButtonVariantType>(ButtonVariant.SECONDARY);
  readonly size = input<ButtonSizeType>(ButtonSize.MEDIUM);
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  // State
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly loadingText = input<string>();

  // Layout
  readonly fullWidth = input(false);
  readonly iconLeft = input<string>();
  readonly iconRight = input<string>();
  readonly badge = input<string>();

  // Accessibility
  readonly ariaLabel = input<string>();
  readonly tooltip = input<string>();

  // Router integration
  readonly routerLink = input<string | any[]>();
  readonly queryParams = input<Record<string, any>>();
  readonly fragment = input<string>();

  // Events
  readonly onClick = output<MouseEvent>();

  // Computed properties
  readonly isDisabled = computed(() => this.disabled() || this.loading());
  readonly isIconOnly = computed(
    () => !!(this.iconLeft() || this.iconRight()) && !this.hasTextContent()
  );

  private hasTextContent(): boolean {
    // This would need to be enhanced to check if ng-content has text
    // For now, assume there's content unless it's explicitly icon-only
    return true;
  }

  handleClick(event: MouseEvent): void {
    if (!this.isDisabled()) {
      this.onClick.emit(event);
    }
  }

  handleLinkClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.onClick.emit(event);
  }
}

// Enhanced SCSS for the button component
// src/app/shared/ui/button/button.component.scss
