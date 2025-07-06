import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';

@Component({
  selector: 'app-ask-location-step',
  imports: [ButtonComponent],
  template: `
    <div class="step location-step">
      <div class="permission-icon">📍</div>
      <h1>Find Nearby Pubs</h1>
      <p class="subtitle">We need your location to show you the best pubs around</p>

      <div class="location-importance">
        <div class="importance-item">
          <span class="icon">🎯</span>
          <span>Verify authentic check-ins - prevent fake check-ins from your couch</span>
        </div>
        <div class="importance-item">
          <span class="icon">🚶</span>
          <span>Find pubs within walking distance - no more long treks after a few drinks</span>
        </div>
        <div class="importance-item">
          <span class="icon">💎</span>
          <span>Discover hidden local gems - uncover secret spots locals love</span>
        </div>
        <div class="importance-item">
          <span class="icon">🏠</span>
          <span>Choose the perfect home pub - get bonus points at your regular spot</span>
        </div>
        <div class="importance-item">
          <span class="icon">📊</span>
          <span>See real-time pub popularity - know which spots are buzzing right now</span>
        </div>
        <div class="importance-item">
          <span class="icon">🗺️</span>
          <span>Get smart route suggestions - plan epic pub crawl routes efficiently</span>
        </div>
        <div class="importance-item">
          <span class="icon">👥</span>
          <span>Compete with friends in your area - local leaderboards and challenges</span>
        </div>
        <div class="importance-item">
          <span class="icon">📈</span>
          <span>Track your exploration radius - see how far your pub adventures reach</span>
        </div>
        <div class="importance-item">
          <span class="icon">🎁</span>
          <span>Unlock location-based rewards - special badges for exploring new areas</span>
        </div>
      </div>

      @if (isRequesting()) {
        <div class="location-loading">
          <div class="loading-spinner"></div>
          <p>Requesting location access...</p>
        </div>
      }

      <div class="step-actions">
        <app-button
          variant="primary"
          [size]="ButtonSize.LARGE"
          [loading]="isRequesting()"
          [disabled]="isRequesting()"
          (onClick)="enableLocation.emit()"
        >
          Enable Location
        </app-button>
        <p class="required-note">This permission is required to continue</p>
      </div>
    </div>
  `,
  styles: `
    .permission-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .location-importance {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 2rem 0;
    }

    .importance-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      backdrop-filter: blur(10px);
      color: white;
    }

    .importance-item .icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .location-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      margin: 2rem 0;
      color: white;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .step-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      margin-top: 3rem;
    }

    .required-note {
      margin: 0;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.8);
      text-align: center;
    }

    @media (max-width: 768px) {
      .step-actions app-button {
        width: 100%;
        max-width: 300px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AskLocationStepComponent {
  readonly isRequesting = input<boolean>(false);
  readonly enableLocation = output<void>();
  
  // Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;
}
