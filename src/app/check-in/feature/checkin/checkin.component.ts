import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { CapacitorPlatformService } from '@shared/data-access/capacitor-platform.service';
import { LLMService } from '@shared/data-access/llm.service';
import { environment } from '../../../../environments/environment';
import { CarpetStrategyService } from '../../../carpets/data-access/carpet-strategy.service';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { CheckInModalService } from '../../data-access/check-in-modal.service';
import { CheckInStore } from '../../data-access/check-in.store';

// Simple state interface - no complex orchestration needed
interface CheckinState {
  stage: 'camera' | 'processing' | 'complete' | 'error';
  photo?: Blob;
  photoDataUrl?: string;
  error?: string;
  pubId?: string;
}

@Component({
  selector: 'app-checkin',
  imports: [CommonModule],
  template: `
    <div class="checkin-container">
      <!-- Camera State -->
      @if (state().stage === 'camera') {
        <!-- Web Camera View -->
        @if (platform.isWeb()) {
          <video #cameraVideo class="camera-video" autoplay playsinline muted></video>
          <div class="camera-overlay">
            <div class="camera-header">
              <h2>Capture Carpet to Check In</h2>
              <p>{{ pubName() }}</p>
            </div>
            <div class="camera-controls">
              <button class="capture-btn" (click)="capturePhoto()" [disabled]="isCapturing()">
                @if (isCapturing()) {
                  <div class="capture-icon">⏳</div>
                  <span>Capturing...</span>
                } @else {
                  <div class="capture-icon">📸</div>
                  <span>Capture</span>
                }
              </button>
            </div>
          </div>
        }

        <!-- Native Camera View -->
        @if (platform.isNative()) {
          <div class="native-camera">
            <div class="camera-placeholder">
              <div class="camera-icon">📱</div>
              <h2>Ready to Check In</h2>
              <p>{{ pubName() }}</p>
              <button class="capture-btn" (click)="capturePhoto()" [disabled]="isCapturing()">
                @if (isCapturing()) {
                  <div class="capture-icon">⏳</div>
                  <span>Taking Photo...</span>
                } @else {
                  <div class="capture-icon">📸</div>
                  <span>Open Camera</span>
                }
              </button>
            </div>
          </div>
        }
      }

      <!-- Processing State -->
      @if (state().stage === 'processing') {
        <div class="processing-state">
          @if (state().photoDataUrl) {
            <img [src]="state().photoDataUrl" class="captured-photo" alt="Captured image" />
          }
          <div class="processing-overlay">
            <div class="processing-content">
              <div class="processing-icon">🔍</div>
              <h2>Analyzing Photo</h2>
              <p>Verifying your carpet and processing check-in...</p>
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (state().stage === 'error') {
        <div class="error-state">
          <div class="error-content">
            <div class="error-icon">❌</div>
            <h2>Check-in Failed</h2>
            <p>{{ state().error }}</p>
            <div class="error-actions">
              <button class="retry-btn" (click)="retry()">Try Again</button>
              <button class="exit-btn" (click)="exit()">Exit</button>
            </div>
          </div>
        </div>
      }

      <!-- Exit Button (always visible) -->
      <button class="exit-button" (click)="exit()">✕</button>
    </div>
  `,
  styleUrl: './checkin.component.scss',
})
export class CheckinComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cameraVideo', { static: false }) cameraVideo?: ElementRef<HTMLVideoElement>;

  // Dependencies - only the essentials!
  private readonly router = inject(Router);
  protected readonly platform = inject(CapacitorPlatformService);
  private readonly llmService = inject(LLMService);
  private readonly checkInStore = inject(CheckInStore);
  private readonly modalService = inject(CheckInModalService);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly carpetStrategy = inject(CarpetStrategyService);
  private readonly pubStore = inject(PubStore);

  // Simple state management - single source of truth
  protected readonly state = signal<CheckinState>({ stage: 'camera' });
  protected readonly isCapturing = signal(false);

  // Computed properties
  protected readonly pubName = computed(() => {
    const pubId = this.state().pubId;
    if (!pubId) return 'Unknown Pub';

    const nearbyPubs = this.nearbyPubStore.nearbyPubs();
    const pub = nearbyPubs.find(p => p.id === pubId);
    return pub?.name || 'Unknown Pub';
  });

  // Platform-specific camera resources
  private cameraStream?: MediaStream;

  constructor() {
    console.log('[CheckinComponent] 🎬 Component created');
    // Initialize basic state - determine closest pub
    const nearbyPubs = this.nearbyPubStore.nearbyPubs();
    if (nearbyPubs.length > 0) {
      const closestPub = nearbyPubs[0];
      this.state.update(s => ({ ...s, pubId: closestPub.id, stage: 'camera' }));
    } else {
      this.state.update(s => ({
        ...s,
        stage: 'error',
        error: 'No nearby pubs found. Please ensure location services are enabled.',
      }));
    }
  }

  ngAfterViewInit(): void {
    console.log('[CheckinComponent] 🎬 View initialized');
    // Only initialize camera if we have a valid state and are on camera stage
    if (this.state().stage === 'camera') {
      this.initializeCameraAfterView();
    }
  }

  ngOnDestroy(): void {
    console.log('[CheckinComponent] 🚪 Component destroyed, cleaning up');
    this.cleanup();
  }

  private async initializeCameraAfterView(): Promise<void> {
    try {
      console.log('[CheckinComponent] 🎬 Initializing camera after view init');

      // Initialize camera based on platform
      if (this.platform.isWeb()) {
        await this.initializeWebCamera();
      } else {
        await this.initializeNativeCamera();
      }

      console.log('[CheckinComponent] ✅ Camera ready');
    } catch (error: any) {
      console.error('[CheckinComponent] ❌ Camera initialization failed:', error);
      this.state.update(s => ({
        ...s,
        stage: 'error',
        error: error.message || 'Failed to initialize camera',
      }));
    }
  }

  private async initializeWebCamera(): Promise<void> {
    console.log('[CheckinComponent] 🌐 Initializing web camera');

    // Video element should be available since we're in AfterViewInit
    if (!this.cameraVideo?.nativeElement) {
      throw new Error('Video element not available');
    }

    const video = this.cameraVideo.nativeElement;

    // Request camera stream
    this.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    // Attach to video element
    video.srcObject = this.cameraStream;

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
      setTimeout(() => reject(new Error('Video load timeout')), 10000);
    });

    console.log('[CheckinComponent] ✅ Web camera ready');
  }

  private async initializeNativeCamera(): Promise<void> {
    console.log('[CheckinComponent] 📱 Initializing native camera');

    // For native, we don't need to initialize anything - just check availability
    if (!this.platform.hasCamera()) {
      throw new Error('Camera not available on this device');
    }

    console.log('[CheckinComponent] ✅ Native camera ready');
  }

  async capturePhoto(): Promise<void> {
    console.log('[CheckinComponent] 📸 Capturing photo...');

    this.isCapturing.set(true);

    try {
      let photoBlob: Blob;
      let photoDataUrl: string;

      if (this.platform.isWeb()) {
        const result = await this.captureWebPhoto();
        photoBlob = result.blob;
        photoDataUrl = result.dataUrl;
      } else {
        const result = await this.captureNativePhoto();
        photoBlob = result.blob;
        photoDataUrl = result.dataUrl;
      }

      // Update state with captured photo
      this.state.update(s => ({
        ...s,
        stage: 'processing',
        photo: photoBlob,
        photoDataUrl: photoDataUrl,
      }));

      console.log('[CheckinComponent] ✅ Photo captured, processing...');

      // Process the check-in
      await this.processCheckIn(photoBlob, photoDataUrl);
    } catch (error: any) {
      console.error('[CheckinComponent] ❌ Photo capture failed:', error);
      this.state.update(s => ({
        ...s,
        stage: 'error',
        error: error.message || 'Failed to capture photo',
      }));
    } finally {
      this.isCapturing.set(false);
    }
  }

  private async captureWebPhoto(): Promise<{ blob: Blob; dataUrl: string }> {
    const video = this.cameraVideo!.nativeElement;

    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob and data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const blob = await new Promise<Blob>(resolve => {
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.8);
    });

    return { blob, dataUrl };
  }

  private async captureNativePhoto(): Promise<{ blob: Blob; dataUrl: string }> {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });

    if (!image.dataUrl) {
      throw new Error('No image data received from camera');
    }

    // Convert data URL to blob
    const response = await fetch(image.dataUrl);
    const blob = await response.blob();

    return { blob, dataUrl: image.dataUrl };
  }

  private async processCheckIn(photoBlob: Blob, photoDataUrl: string): Promise<void> {
    try {
      const pubId = this.state().pubId!;

      // Step 1: LLM validation if enabled
      if (environment.LLM_CHECK) {
        console.log('[CheckinComponent] 🤖 Validating with LLM...');
        const llmResult = await this.llmService.detectCarpet(photoDataUrl);
        console.log('[CheckinComponent] 🤖 LLM validation result:', llmResult);
        // Note: We proceed regardless of LLM result, just like the original system
      }

      // Step 2: Process carpet with quality analysis and storage
      console.log('[CheckinComponent] 🎨 Processing carpet...');
      const canvas = await this.blobToCanvas(photoBlob);
      const pubName = this.getPubName(pubId);
      const carpetResult = await this.carpetStrategy.processCarpetCapture(canvas, pubId, pubName);

      console.log('[CheckinComponent] 🎯 Carpet processing complete:', carpetResult);

      // Step 3: Execute check-in with carpet result
      console.log('[CheckinComponent] ⚡ Executing check-in...');
      await this.checkInStore.checkinToPub(pubId, carpetResult);

      console.log('[CheckinComponent] 🎉 Check-in successful!');

      // Step 4: Show success modal (CheckInStore should trigger this)
      const checkInResults = this.checkInStore.checkinResults();
      if (checkInResults) {
        this.modalService.showCheckInResults(checkInResults, () => {
          this.router.navigate(['/']);
        });
      }

      // Update state to complete
      this.state.update(s => ({ ...s, stage: 'complete' }));
    } catch (error: any) {
      console.error('[CheckinComponent] ❌ Check-in processing failed:', error);
      throw error; // Let the capture method handle the error display
    }
  }

  private async blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.src = URL.createObjectURL(blob);
    });
  }

  private getPubName(pubId: string): string {
    const pub = this.pubStore.get(pubId);
    return pub?.name || 'Unknown Pub';
  }

  protected retry(): void {
    console.log('[CheckinComponent] 🔄 Retrying check-in');

    // Reset state and restart
    this.state.update(s => ({
      ...s,
      stage: 'camera',
      photo: undefined,
      photoDataUrl: undefined,
      error: undefined,
    }));

    this.initializeCameraAfterView();
  }

  protected exit(): void {
    console.log('[CheckinComponent] 🚪 Exiting check-in');
    this.cleanup();
    this.router.navigate(['/']);
  }

  private cleanup(): void {
    // Clean up camera resources
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log('[CheckinComponent] 🛑 Camera track stopped:', track.kind);
      });
      this.cameraStream = undefined;
    }

    console.log('[CheckinComponent] 🧹 Cleanup complete');
  }
}
