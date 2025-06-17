import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { UserStore } from '../../../users/data-access/user.store';
import { CheckinStore } from '../../data-access/check-in.store';
import { FeatureFlagPipe } from "../../../shared/utils/feature-flag.pipe";
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-check-in-container',
  imports: [CommonModule, ButtonComponent, FeatureFlagPipe],
  templateUrl: './check-in-container.component.html',
  styleUrl: './check-in-container.component.scss',
})
export class CheckInContainerComponent extends BaseComponent {
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly userStore = inject(UserStore);
  protected readonly checkinStore = inject(CheckinStore);

  // ✅ Reactive data from stores
  private readonly pubSignal = this.nearbyPubStore.closestPub;
  private readonly userSignal = this.userStore.user;
  readonly today = new Date().toISOString().split('T')[0];

  // ✅ Early exit if no pub available
  readonly hasPub = computed(() => !!this.pubSignal());
  readonly hasUser = computed(() => !!this.userSignal());
  readonly hasGeolocation = computed(() => 'geolocation' in navigator);

  // ✅ Component should redirect if requirements not met
  readonly shouldRedirect = computed(() =>
    !this.hasPub() || !this.hasUser() || !this.hasGeolocation()
  );

  // ✅ Safe accessors - only call when we know they exist
  readonly pub = computed(() => {
    const pub = this.pubSignal();
    if (!pub) throw new Error('Pub not available for check-in');
    return pub;
  });

  readonly user = computed(() => {
    const user = this.userSignal();
    if (!user) throw new Error('User not available for check-in');
    return user;
  });

  // ✅ Store state (already readonly from stores)
  readonly storeLoading = this.checkinStore.loading;
  readonly checkin = this.checkinStore.checkinSuccess;
  readonly storeError = this.checkinStore.error;
  readonly landlordMessage = this.checkinStore.landlordMessage;

  // ✅ Derived state with computed signals
  readonly isLandlord = computed(() => !!this.checkin()?.madeUserLandlord);
  readonly badge = computed(() => this.checkin()?.badgeName ?? null);
  readonly missionUpdated = computed(() => this.checkin()?.missionUpdated ?? false);

  // ✅ Component-specific state using BaseComponent patterns
  readonly cameraReady$ = computed(() => !!this.stream);

  // ✅ Combined loading state
  readonly isLoading = computed(() => this.loading() || this.storeLoading());

  // ✅ Combined error state
  readonly displayError = computed(() => this.error() || this.storeError());

  @ViewChild('video', { static: false }) videoRef?: ElementRef<HTMLVideoElement>;
  private stream: MediaStream | null = null;

  constructor() {
    super();

    // ✅ Redirect if requirements not met
    effect(() => {
      if (this.shouldRedirect()) {
        console.warn('[CheckIn] Requirements not met, redirecting to home');
        this.showError('No nearby pub available for check-in');
        this.router.navigateByUrl('/');
        return;
      }
    });

    // ✅ Reactive effects for side effects
    effect(() => {
      const checkin = this.checkin();
      if (checkin) {
        this.userStore.loadUser(checkin.userId);
      }
    });
  }

  protected override onInit(): void {
    // ✅ Early guard - shouldn't reach here if redirecting
    if (this.shouldRedirect()) return;

    if (environment.featureFlags.photoUpload) {
      this.initCamera();
    }

    this.processCheckIn();
  }

  /**
   * Main check-in flow - now safe to access pub() and user()
   */
  private async processCheckIn(): Promise<void> {
    try {
      // ✅ Safe to call - we know they exist due to guards
      const currentPub = this.pub();
      const currentUser = this.user();

      const photoDataUrl = await this.capturePhoto();

      await this.checkinStore.checkinToPub(currentPub.id, photoDataUrl);

      // Success handled by store + toasts from BaseComponent
    } catch (error: any) {
      this.showError(error.message || 'Check-in failed');
    }
  }

  /**
   * Get current position with proper error handling
   */
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          const message = this.getLocationErrorMessage(error);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }

  /**
   * Get user-friendly location error messages
   */
  private getLocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location services.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'Failed to get your location.';
    }
  }

  /**
   * Capture photo from camera if available
   */
  private async capturePhoto(): Promise<string | null> {
    if (!environment.featureFlags.photoUpload || !this.videoRef?.nativeElement) {
      return null;
    }

    try {
      const video = this.videoRef.nativeElement;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.warn('[CheckIn] Failed to capture photo:', error);
      return null;
    }
  }

  /**
   * Initialize camera with proper error handling
   */
  private initCamera(): void {
    this.onlyOnBrowser(async () => {
      try {
        this.loading.set(true);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment' // Prefer back camera
          }
        });

        this.stream = stream;

        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = stream;
        }

        console.log('[CheckIn] ✅ Camera initialized');
      } catch (error: any) {
        const message = 'Failed to access camera. Photo capture disabled.';
        this.showError(message);
        console.error('[CheckIn] ❌ Camera error:', error);
      } finally {
        this.loading.set(false);
      }
    });
  }

  /**
   * Navigate back to home
   */
  goHome(): void {
    this.cleanupCamera();
    this.router.navigateByUrl('/');
  }

  /**
   * Cleanup camera resources
   */
  private cleanupCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Component cleanup
   */
  ngOnDestroy(): void {
    this.cleanupCamera();
  }
}
