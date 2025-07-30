import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-location-state',
  imports: [],
  template: `
    <div class="location-state" [attr.aria-live]="'assertive'">
      <span class="location-icon" aria-hidden="true">🚫</span>
      <h3 class="location-title">Location Access Needed</h3>
      <p class="location-message">{{ message() }}</p>
      @if (showRetry()) {
        <button class="retry-button" (click)="onRetry()" type="button">
          {{ retryText() }}
        </button>
      }
      <p class="help-text">{{ helpText() }}</p>
    </div>
  `,
  styleUrl: './location-state.component.scss',
})
export class LocationStateComponent {
  readonly message = input<string>(
    'We need your location to continue. Please enable location services and try again.'
  );
  readonly helpText = input<string>(
    'Check your browser settings to allow location access for this site.'
  );
  readonly showRetry = input<boolean>(true);
  readonly retryText = input<string>('Enable Location');

  readonly retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
