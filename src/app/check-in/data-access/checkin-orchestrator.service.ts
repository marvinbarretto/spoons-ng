// src/app/check-in/data-access/checkin-orchestrator.service.ts

import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CheckInStore } from './check-in.store';
import { CheckInModalService } from './check-in-modal.service';
import { LLMService } from '@shared/data-access/llm.service';
import { CarpetStorageService } from '../../carpets/data-access/carpet-storage.service';
import { CarpetStrategyService } from '../../carpets/data-access/carpet-strategy.service';
import { CameraService } from '@shared/data-access/camera.service';
import { environment } from '../../../environments/environment';

type CheckinStage = 
  | 'INITIALIZING'
  | 'CAMERA_STARTING'
  | 'CAMERA_ACTIVE' 
  | 'CAPTURING_PHOTO'
  | 'PHOTO_TAKEN'
  | 'PHOTO_REVIEW'
  | 'LLM_CHECKING'
  | 'RESULT';


@Injectable({ providedIn: 'root' })
export class CheckinOrchestrator {
  private readonly router = inject(Router);
  private readonly checkinStore = inject(CheckInStore);
  private readonly checkInModalService = inject(CheckInModalService);
  private readonly llmService = inject(LLMService);
  private readonly carpetStorageService = inject(CarpetStorageService);
  private readonly carpetStrategy = inject(CarpetStrategyService);
  private readonly cameraService = inject(CameraService);

  // ===================================
  // 🏗️ STATE SIGNALS
  // ===================================
  
  private readonly _stage = signal<CheckinStage>('INITIALIZING');
  private readonly _pubId = signal<string | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _photoDataUrl = signal<string | null>(null);
  private readonly _photoBlob = signal<Blob | null>(null);

  // Video element tracking for live camera
  private videoElement: HTMLVideoElement | null = null;

  // ===================================
  // 🔍 PUBLIC READONLY SIGNALS
  // ===================================

  readonly stage = this._stage.asReadonly();
  readonly pubId = this._pubId.asReadonly();
  readonly error = this._error.asReadonly();
  readonly photoDataUrl = this._photoDataUrl.asReadonly();
  readonly photoBlob = this._photoBlob.asReadonly();

  // ===================================
  // 🧮 COMPUTED CONDITIONS
  // ===================================

  readonly showCameraPreview = computed(() => {
    const stage = this.stage();
    return stage === 'CAMERA_STARTING' || stage === 'CAMERA_ACTIVE';
  });

  readonly showCaptureButton = computed(() => {
    const stage = this.stage();
    return stage === 'CAMERA_ACTIVE';
  });

  readonly showPhotoPreview = computed(() => {
    const stage = this.stage();
    return stage === 'PHOTO_TAKEN' || stage === 'PHOTO_REVIEW' || stage === 'LLM_CHECKING';
  });

  readonly showRetakeButton = computed(() => {
    const stage = this.stage();
    return stage === 'PHOTO_REVIEW';
  });

  readonly showConfirmButton = computed(() => {
    const stage = this.stage();
    return stage === 'PHOTO_REVIEW';
  });

  readonly isCapturingPhoto = computed(() => {
    const stage = this.stage();
    return stage === 'CAPTURING_PHOTO';
  });

  readonly statusMessage = computed(() => {
    const stage = this.stage();
    switch (stage) {
      case 'INITIALIZING': return 'Getting ready...';
      case 'CAMERA_STARTING': return 'Starting camera...';
      case 'CAMERA_ACTIVE': return 'Ready to capture';
      case 'CAPTURING_PHOTO': return 'Capturing...';
      case 'PHOTO_TAKEN': return 'Photo captured';
      case 'PHOTO_REVIEW': return 'Review your photo';
      case 'LLM_CHECKING': return 'Processing...';
      case 'RESULT': return 'Check-in complete!';
      default: return '';
    }
  });

  constructor() {
    // No auto-capture logic needed
  }

  // ===================================
  // 🚀 MAIN ORCHESTRATION
  // ===================================

  setPubId(pubId: string): void {
    this._pubId.set(pubId);
    console.log('[CheckinOrchestrator] 📍 Pub ID set:', pubId);
  }

  async startCheckin(pubId: string): Promise<void> {
    console.log('[CheckinOrchestrator] 🚀 Starting check-in for pub:', pubId);
    
    try {
      this._pubId.set(pubId);
      this._error.set(null);
      this._stage.set('INITIALIZING');

      // Start camera instead of file input
      await this.startCamera();

    } catch (error: any) {
      console.error('[CheckinOrchestrator] ❌ Failed to start:', error);
      this.handleError(error.message || 'Failed to initialize camera');
    }
  }

  stopCheckin(): void {
    console.log('[CheckinOrchestrator] 🛑 Stopping check-in');
    this.cleanup();
    this.router.navigate(['/']);
  }

  async retryCheckin(): Promise<void> {
    console.log('[CheckinOrchestrator] 🔄 Retrying check-in');
    
    try {
      // Clear error state
      this._error.set(null);
      this._stage.set('INITIALIZING');
      
      // Reset photo data
      this._photoBlob.set(null);
      this._photoDataUrl.set(null);
      
      // Restart camera
      await this.startCamera();
      
      console.log('[CheckinOrchestrator] ✅ Retry successful - camera ready');
    } catch (error: any) {
      console.error('[CheckinOrchestrator] ❌ Retry failed:', error);
      this.handleError('Failed to retry');
    }
  }

  // ===================================
  // 📹 CAMERA MANAGEMENT
  // ===================================

  setVideoElement(video: HTMLVideoElement): void {
    this.videoElement = video;
    console.log('[CheckinOrchestrator] 📹 Video element set');
  }

  private async startCamera(): Promise<void> {
    console.log('[CheckinOrchestrator] 📹 Starting camera');
    
    if (!this.videoElement) {
      throw new Error('Video element not set');
    }

    try {
      this._stage.set('CAMERA_STARTING');
      
      // Request camera access
      const stream = await this.cameraService.requestCamera({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      // Attach stream to video element
      this.cameraService.attachToVideoElement(this.videoElement, stream);
      
      // Wait for video to be ready
      await this.cameraService.waitForVideoReady(this.videoElement);
      
      this._stage.set('CAMERA_ACTIVE');
      console.log('[CheckinOrchestrator] ✅ Camera ready for capture');
      
    } catch (error: any) {
      console.error('[CheckinOrchestrator] ❌ Camera start failed:', error);
      throw error;
    }
  }

  async capturePhoto(): Promise<void> {
    console.log('[CheckinOrchestrator] 📸 Capturing photo from video stream');
    
    if (!this.videoElement) {
      throw new Error('Video element not available');
    }

    try {
      this._stage.set('CAPTURING_PHOTO');
      
      // Check if camera is ready for capture
      if (!this.cameraService.isCameraReadyForCapture(this.videoElement)) {
        throw new Error('Camera is not ready for capture');
      }
      
      // Capture photo from video stream
      const { dataUrl, blob } = await this.cameraService.capturePhotoToCanvas(this.videoElement, 0.95);
      
      // Store the captured photo
      this._photoDataUrl.set(dataUrl);
      this._photoBlob.set(blob);
      
      this._stage.set('PHOTO_TAKEN');
      console.log('[CheckinOrchestrator] ✅ Photo captured successfully');
      
      // Move to review stage - wait for user confirmation
      this._stage.set('PHOTO_REVIEW');
      console.log('[CheckinOrchestrator] 📋 Photo ready for review - waiting for user decision');
      
    } catch (error: any) {
      console.error('[CheckinOrchestrator] ❌ Photo capture failed:', error);
      this.handleError('Failed to capture photo');
    }
  }

  // ===================================
  // 🔄 RETAKE FUNCTIONALITY
  // ===================================

  confirmPhoto(): void {
    console.log('[CheckinOrchestrator] ✅ User confirmed photo - proceeding with LLM check');
    
    const dataUrl = this._photoDataUrl();
    const blob = this._photoBlob();
    
    if (!dataUrl || !blob) {
      console.error('[CheckinOrchestrator] ❌ No photo data available for confirmation');
      this.handleError('No photo data available');
      return;
    }

    // Start LLM check or direct processing
    if (environment.LLM_CHECK) {
      console.log('[CheckinOrchestrator] 🤖 Starting LLM analysis after user confirmation');
      this.checkWithLLM(dataUrl);
    } else {
      console.log('[CheckinOrchestrator] 🧪 DEV MODE: Skipping LLM, processing directly');
      this.processCheckin(blob);
    }
  }

  retakePhoto(): void {
    console.log('[CheckinOrchestrator] 🔄 User chose to retake photo');
    
    // Reset to camera active state (camera is still running)
    this._photoBlob.set(null);
    this._photoDataUrl.set(null);
    this._error.set(null);
    this._stage.set('CAMERA_ACTIVE');
    console.log('[CheckinOrchestrator] 📹 Camera reactivated for new capture');
  }

  // ===================================
  // 📸 PHOTO PROCESSING
  // ===================================

  private async checkWithLLM(photoDataUrl: string): Promise<void> {
    console.log('[CheckinOrchestrator] 🤖 Starting LLM carpet detection analysis');
    this._stage.set('LLM_CHECKING');

    try {
      const result = await this.llmService.detectCarpet(photoDataUrl);
      
      // Always proceed to result stage regardless of LLM result
      console.log('[CheckinOrchestrator] 📝 LLM analysis complete:', result);
      
      const blob = this._photoBlob();
      if (blob) {
        console.log('[CheckinOrchestrator] ⚡ Proceeding to process check-in with LLM result');
        await this.processCheckin(blob);
      } else {
        throw new Error('No photo blob available');
      }

    } catch (error: any) {
      console.error('[CheckinOrchestrator] ❌ LLM analysis failed:', error);
      this.handleError('Failed to verify carpet');
    }
  }

  private async processCheckin(blob: Blob): Promise<void> {
    console.log('[CheckinOrchestrator] ⚡ Processing check-in');

    try {
      const pubId = this._pubId();
      if (!pubId) throw new Error('No pub ID');

      // Convert blob to canvas for storage
      const canvas = await this.blobToCanvas(blob);
      
      // Process carpet with quality analysis and storage
      console.log('[CheckinOrchestrator] 💾 Processing carpet with quality analysis');
      const pubName = 'Carpet Image'; // TODO: Get actual pub name
      const carpetResult = await this.carpetStrategy.processCarpetCapture(canvas, pubId, pubName);
      console.log('[CheckinOrchestrator] 🎯 Carpet processing complete:', carpetResult);

      // Execute check-in with carpet result
      await this.checkinStore.checkinToPub(pubId, carpetResult);
      this._stage.set('RESULT');
      
      console.log('[CheckinOrchestrator] 🎉 Check-in successful!');
      
      // Show success modal directly to ensure it always appears
      this.showSuccessModal(pubId);

    } catch (error: any) {
      console.error('[CheckinOrchestrator] ❌ Processing failed:', error);
      this.handleError('Check-in failed');
    }
  }

  private async blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
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

  // ===================================
  // 🎉 SUCCESS MODAL HANDLING
  // ===================================

  private showSuccessModal(pubId: string): void {
    console.log('[CheckinOrchestrator] 🎉 Showing success modal for pub:', pubId);
    
    // Get the check-in results from the store
    const checkinResults = this.checkinStore.checkinResults();
    
    if (checkinResults) {
      console.log('[CheckinOrchestrator] 📋 Found checkin results, showing modal:', checkinResults);
      this.checkInModalService.showCheckInResults(checkinResults, () => {
        console.log('[CheckinOrchestrator] 🚪 Modal dismissed, navigating to home');
        this.router.navigate(['/']);
      });
    } else {
      console.warn('[CheckinOrchestrator] ⚠️ No checkin results found, cannot show modal');
    }
  }

  // ===================================
  // 🚨 ERROR HANDLING
  // ===================================

  private handleError(message: string): void {
    this._error.set(message);
    this._stage.set('RESULT');
  }

  // ===================================
  // 🧹 CLEANUP
  // ===================================

  cleanup(): void {
    console.log('[CheckinOrchestrator] 🧹 Cleaning up');
    
    // Release camera resources
    this.cameraService.releaseCamera();
    
    // Reset state
    this._stage.set('INITIALIZING');
    this._pubId.set(null);
    this._error.set(null);
    this._photoDataUrl.set(null);
    this._photoBlob.set(null);
    
    this.videoElement = null;
  }
}