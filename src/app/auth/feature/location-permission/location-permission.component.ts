import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { AbstractLocationService } from '@shared/data-access/abstract-location.service';
import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'app-location-permission',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <div class="location-permission-container">
      <div class="location-content">
        <!-- Location Icon Animation -->
        <div class="location-icon-container">
          <div class="location-icon" [class.pulse]="!hasPermission()">📍</div>
          <div class="location-rings" [class.active]="!hasPermission()">
            <div class="ring ring-1"></div>
            <div class="ring ring-2"></div>
            <div class="ring ring-3"></div>
          </div>
        </div>

        <!-- Content -->
        <div class="content-section">
          <h1 class="title">Find Your Local Spoons</h1>
          <p class="subtitle">
            Enable location access to discover Wetherspoons pubs near you and get personalized recommendations.
          </p>

          <!-- Benefits List -->
          <ul class="benefits-list">
            <li>🍺 Find nearby pubs instantly</li>
            <li>📍 Get directions and pub details</li>
            <li>🎯 Earn distance bonus points</li>
          </ul>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <app-button
            [fullWidth]="true"
            size="lg"
            [loading]="requestingPermission()"
            (onClick)="requestLocationPermission()"
            class="primary-action"
          >
            Enable Location Access
          </app-button>

          <app-button
            [fullWidth]="true"
            size="lg"
            variant="secondary"
            (onClick)="skipLocation()"
            class="secondary-action"
          >
            Skip for Now
          </app-button>
        </div>

        <!-- Privacy Note -->
        <p class="privacy-note">
          🔒 Your location data is only used to find nearby pubs and is never shared with third parties.
        </p>
      </div>
    </div>
  `,
  styleUrl: './location-permission.component.scss',
})
export class LocationPermissionComponent extends BaseComponent {
  private readonly locationService = inject(AbstractLocationService);

  readonly requestingPermission = signal(false);
  
  readonly hasPermission = computed(() => {
    return this.locationService.permissionStatus() === 'granted';
  });

  async requestLocationPermission(): Promise<void> {
    console.log('[LocationPermission] Requesting location access...');
    this.requestingPermission.set(true);

    try {
      // First request permission
      const permissionStatus = await this.locationService.requestPermission();
      console.log('[LocationPermission] Permission status:', permissionStatus);
      
      if (permissionStatus === 'granted') {
        // Then get the actual location
        await this.locationService.getCurrentLocation();
        console.log('[LocationPermission] Location obtained, navigating to home');
        this.showSuccess('Location access enabled! You can now find nearby pubs.');
        await this.router.navigate(['/home']);
      } else {
        this.handlePermissionDenied(permissionStatus);
      }

    } catch (error) {
      console.error('[LocationPermission] Location request failed:', error);
      this.showError('Unable to access location. You can still use the app without location services.');
      // Navigate to home anyway after a brief delay
      setTimeout(() => this.router.navigate(['/home']), 2000);
    } finally {
      this.requestingPermission.set(false);
    }
  }

  private handlePermissionDenied(status: string): void {
    console.log('[LocationPermission] Permission denied with status:', status);
    
    if (status === 'denied') {
      this.showInfo('Location access was denied. You can enable it later in your browser settings if you change your mind.');
    } else {
      this.showInfo('Location access is not available. You can still use the app to explore pubs manually.');
    }
    
    // Navigate to home after showing message
    setTimeout(() => this.router.navigate(['/home']), 2000);
  }

  skipLocation(): void {
    console.log('[LocationPermission] User chose to skip location access');
    this.router.navigate(['/home']);
  }
}