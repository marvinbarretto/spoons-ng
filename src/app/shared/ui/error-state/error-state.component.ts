import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  imports: [],
  template: `
    <div class="widget-error" [attr.aria-live]="'assertive'">
      <span class="error-icon" aria-hidden="true">{{ icon() }}</span>
      <span class="error-message">{{ message() }}</span>
      @if (showRetry()) {
        <button
          class="retry-button"
          (click)="onRetry()"
          type="button"
          [attr.aria-label]="'Retry ' + (retryLabel() || 'loading')"
        >
          {{ retryText() }}
        </button>
      }
    </div>
  `,
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  readonly icon = input<string>('⚠️');
  readonly message = input<string>('An error occurred');
  readonly showRetry = input<boolean>(false);
  readonly retryText = input<string>('Retry');
  readonly retryLabel = input<string>();

  readonly retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
