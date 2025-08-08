import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
} from '@angular/core';

import { BaseComponent } from '@shared/base/base.component';
import { environment } from '../../../../environments/environment';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { CheckInStore } from '../../data-access/check-in.store';
import { CheckinOrchestrator } from '../../data-access/checkin-orchestrator.service';

@Component({
  selector: 'app-checkin',
  imports: [CommonModule],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.scss',
})
export class CheckinComponent extends BaseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cameraVideo', { static: false }) cameraVideo!: ElementRef<HTMLVideoElement>;

  // ===================================
  // 🏗️ DEPENDENCIES
  // ===================================

  private readonly pubStore = inject(PubStore);
  private readonly checkinStore = inject(CheckInStore);
  private readonly nearbyPubStore = inject(NearbyPubStore);

  // Main orchestrator
  protected readonly orchestrator = inject(CheckinOrchestrator);

  // ===================================
  // 🔍 COMPUTED SIGNALS FOR TEMPLATE
  // ===================================

  protected readonly pubName = computed(() => {
    const pubId = this.orchestrator.pubId();
    if (!pubId) return 'Unknown Pub';

    const pub = this.pubStore.get(pubId);
    return pub?.name || 'Unknown Pub';
  });

  protected readonly pointsEarned = computed(() => {
    const result = this.checkinStore.checkinResults();
    return result?.success ? result.points?.total || 0 : 0;
  });

  protected readonly badgesEarned = computed(() => {
    const result = this.checkinStore.checkinResults();
    return result?.success ? result.badges || [] : [];
  });

  protected readonly isDevelopment = computed(() => environment.ACTIVE_DEVELOPMENT_MODE);

  // ===================================
  // 🚀 LIFECYCLE
  // ===================================

  constructor() {
    super();
    console.log('[CheckinComponent] 🎬 Component initialized');
  }

  override ngOnInit(): void {
    super.ngOnInit();

    // Get pub from location services
    const pub = this.nearbyPubStore.closestPub();

    if (!pub) {
      console.error('[CheckinComponent] ❌ No nearby pub available');
      this.orchestrator.stopCheckin();
      return;
    }

    console.log('[CheckinComponent] 🚀 Check-in will start for pub:', pub.name);

    // Store pub ID for later use
    this.orchestrator.setPubId(pub.id);
  }

  ngAfterViewInit(): void {
    console.log('[CheckinComponent] 📹 View initialized');

    // Wait for video element to be fully ready in DOM
    this.waitForVideoElementReady()
      .then(() => {
        const pubId = this.orchestrator.pubId();
        if (pubId) {
          console.log('[CheckinComponent] 🚀 Starting check-in with video element ready');
          this.orchestrator.startCheckin(pubId);
        }
      })
      .catch(error => {
        console.error('[CheckinComponent] ❌ Video element readiness failed:', error);
        this.orchestrator.cleanup();
      });
  }

  private async waitForVideoElementReady(maxRetries: number = 10): Promise<void> {
    console.log('[CheckinComponent] ⏳ Waiting for video element to be ready...');

    return new Promise((resolve, reject) => {
      let retries = 0;

      const checkVideoElement = () => {
        const videoElement = this.cameraVideo?.nativeElement;

        if (videoElement && this.isVideoElementReady(videoElement)) {
          console.log('[CheckinComponent] ✅ Video element is ready:', {
            width: videoElement.clientWidth,
            height: videoElement.clientHeight,
            offsetParent: !!videoElement.offsetParent,
            isConnected: videoElement.isConnected,
          });

          // Set video element in orchestrator
          this.orchestrator.setVideoElement(videoElement);
          resolve();
          return;
        }

        retries++;
        if (retries >= maxRetries) {
          console.error(
            '[CheckinComponent] ❌ Video element not ready after',
            maxRetries,
            'attempts'
          );
          reject(new Error('Video element not ready after maximum retries'));
          return;
        }

        console.log(
          `[CheckinComponent] 🔄 Video element not ready yet, retry ${retries}/${maxRetries}`
        );
        setTimeout(checkVideoElement, 100); // Check every 100ms
      };

      checkVideoElement();
    });
  }

  private isVideoElementReady(element: HTMLVideoElement): boolean {
    // Check if video element is properly attached to DOM and has dimensions
    return (
      element &&
      element.isConnected && // Element is in the DOM
      element.offsetParent !== null && // Element is visible (not display:none)
      element.clientWidth > 0 && // Has width
      element.clientHeight > 0 // Has height
    );
  }

  ngOnDestroy(): void {
    console.log('[CheckinComponent] 🚪 Component destroyed');
    this.orchestrator.cleanup();
  }

  // ===================================
  // 🎯 TEMPLATE METHODS
  // ===================================

  protected onExitClick(): void {
    console.log('[CheckinComponent] 🚪 Exit clicked');
    this.orchestrator.stopCheckin();
  }

  protected onRetryClick(): void {
    console.log('[CheckinComponent] 🔄 Retry clicked');
    this.orchestrator.retryCheckin();
  }

  protected async onCaptureClick(): Promise<void> {
    console.log('[CheckinComponent] 📸 User clicked capture button');
    console.log('[CheckinComponent] 📊 Current stage before capture:', this.orchestrator.stage());

    try {
      await this.orchestrator.capturePhoto();
      console.log('[CheckinComponent] ✅ Photo capture completed successfully');
      console.log('[CheckinComponent] 📊 Stage after capture:', this.orchestrator.stage());
    } catch (error) {
      console.error('[CheckinComponent] ❌ Photo capture failed:', error);
    }
  }

  protected onRetakePhotoClick(): void {
    console.log('[CheckinComponent] 🔄 User clicked retake button - initiating photo reset');
    console.log('[CheckinComponent] 📊 Current stage before retake:', this.orchestrator.stage());
    console.log('[CheckinComponent] 📸 Current photo data before reset:', {
      hasDataUrl: !!this.orchestrator.photoDataUrl(),
      hasBlob: !!this.orchestrator.photoBlob(),
    });

    this.orchestrator.retakePhoto();

    // Log state after retake call
    setTimeout(() => {
      console.log('[CheckinComponent] 📊 Stage after retake:', this.orchestrator.stage());
      console.log('[CheckinComponent] 📸 Photo data after reset:', {
        hasDataUrl: !!this.orchestrator.photoDataUrl(),
        hasBlob: !!this.orchestrator.photoBlob(),
        showCameraPreview: this.orchestrator.showCameraPreview(),
        showPhotoPreview: this.orchestrator.showPhotoPreview(),
      });
    }, 50);
  }

  protected async onOpenSettingsClick(): Promise<void> {
    console.log('[CheckinComponent] ⚙️ User clicked open settings button');
    await this.orchestrator.openDeviceSettings();
  }

  protected async onRetryPermissionsClick(): Promise<void> {
    console.log('[CheckinComponent] 🔐 User clicked retry permissions button');
    await this.orchestrator.retryPermissions();
  }
}
