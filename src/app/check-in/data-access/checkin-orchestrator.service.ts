// src/app/check-in/data-access/checkin-orchestrator.service.ts

import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SsrPlatformService } from '@fourfold/angular-foundation';
import { CapacitorPlatformService } from '@shared/data-access/capacitor-platform.service';
import { DataAggregatorService } from '@shared/data-access/data-aggregator.service';
import { LLMService } from '@shared/data-access/llm.service';
import { AbstractCameraService, CameraPermissionState } from '@shared/data-access/abstract-camera.service';
import { environment } from '../../../environments/environment';
import { CarpetStorageService } from '../../carpets/data-access/carpet-storage.service';
import { CarpetStrategyService } from '../../carpets/data-access/carpet-strategy.service';
import { CheckInModalService } from './check-in-modal.service';
import { CheckInStore } from './check-in.store';

type CheckinStage =
  | 'INITIALIZING'
  | 'CHECKING_PERMISSIONS'
  | 'PERMISSION_DENIED'
  | 'CAMERA_STARTING'
  | 'CAMERA_ACTIVE'
  | 'CAPTURING_PHOTO'
  | 'PHOTO_TAKEN'
  | 'LLM_CHECKING'
  | 'RESULT';

@Injectable({ providedIn: 'root' })
export class CheckinOrchestrator {
  protected readonly router = inject(Router);
  protected readonly platform = inject(SsrPlatformService);
  protected readonly capacitor = inject(CapacitorPlatformService);
  protected readonly checkinStore = inject(CheckInStore);
  protected readonly checkInModalService = inject(CheckInModalService);
  protected readonly llmService = inject(LLMService);
  protected readonly carpetStorageService = inject(CarpetStorageService);
  protected readonly carpetStrategy = inject(CarpetStrategyService);
  protected readonly cameraService = inject(AbstractCameraService);
  protected readonly dataAggregator = inject(DataAggregatorService);
  
  // Service name for logging
  private readonly SERVICE_NAME = 'CheckinOrchestrator';
  
  constructor() {
    console.log(`[${this.SERVICE_NAME}] 🎬 Checkin orchestrator initialized`);
    console.log(`[${this.SERVICE_NAME}] 📱 Platform info:`, {
      isNative: this.capacitor.isNative(),
      platform: this.capacitor.platformName(),
      isIOS: this.capacitor.isIOS(),
      isAndroid: this.capacitor.isAndroid()
    });
    console.log(`[${this.SERVICE_NAME}] 📸 Camera service injected:`, {
      serviceType: this.cameraService.constructor.name,
      hasPermissionStatus: !!this.cameraService.permissionStatus,
      hasIsCapturing: !!this.cameraService.isCapturing,
      hasError: !!this.cameraService.error
    });
  }

  // ===================================
  // 🏗️ STATE SIGNALS
  // ===================================

  private readonly _stage = signal<CheckinStage>('INITIALIZING');
  private readonly _pubId = signal<string | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _photoDataUrl = signal<string | null>(null);
  private readonly _photoBlob = signal<Blob | null>(null);
  private readonly _permissionState = signal<CameraPermissionState>({ camera: 'unknown' });
  private readonly _recoveryAction = signal<'RETRY' | 'OPEN_SETTINGS' | 'NONE'>('NONE');

  // Video element tracking for web camera
  private videoElement: HTMLVideoElement | null = null;

  // ===================================
  // 🔍 PUBLIC READONLY SIGNALS
  // ===================================

  readonly stage = this._stage.asReadonly();
  readonly pubId = this._pubId.asReadonly();
  readonly error = this._error.asReadonly();
  readonly photoDataUrl = this._photoDataUrl.asReadonly();
  readonly photoBlob = this._photoBlob.asReadonly();
  readonly permissionState = this._permissionState.asReadonly();
  readonly recoveryAction = this._recoveryAction.asReadonly();

  // ===================================
  // 🧮 COMPUTED CONDITIONS
  // ===================================

  readonly showCameraPreview = computed(() => {
    const stage = this.stage();
    // On native, we don't show live camera preview
    if (this.capacitor.isNative()) {
      return false;
    }
    const shouldShow = stage === 'CAMERA_STARTING' || stage === 'CAMERA_ACTIVE';
    console.log('[CheckinOrchestrator] 📹 showCameraPreview computed:', {
      stage,
      shouldShow,
      isNative: this.capacitor.isNative(),
    });
    return shouldShow;
  });

  readonly showNativeCameraButton = computed(() => {
    const stage = this.stage();
    // Only show native camera button on native platforms
    if (!this.capacitor.isNative()) {
      return false;
    }
    const shouldShow = stage === 'CAMERA_ACTIVE';
    console.log('[CheckinOrchestrator] 📱 showNativeCameraButton computed:', { stage, shouldShow });
    return shouldShow;
  });

  readonly showPermissionGuidance = computed(() => {
    const stage = this.stage();
    return stage === 'PERMISSION_DENIED';
  });

  readonly showCaptureButton = computed(() => {
    const stage = this.stage();
    // Only show web capture button on web platforms
    if (this.capacitor.isNative()) {
      return false;
    }
    const shouldShow = stage === 'CAMERA_ACTIVE';
    console.log('[CheckinOrchestrator] 📸 showCaptureButton computed:', { stage, shouldShow });
    return shouldShow;
  });

  readonly showPhotoPreview = computed(() => {
    const stage = this.stage();
    const shouldShow = stage === 'PHOTO_TAKEN' || stage === 'LLM_CHECKING';
    console.log('[CheckinOrchestrator] 🖼️ showPhotoPreview computed:', { stage, shouldShow });
    return shouldShow;
  });

  readonly showRetakeButton = computed(() => {
    const stage = this.stage();
    return stage === 'LLM_CHECKING';
  });

  readonly isCapturingPhoto = computed(() => {
    const stage = this.stage();
    return stage === 'CAPTURING_PHOTO';
  });

  readonly statusMessage = computed(() => {
    const stage = this.stage();
    switch (stage) {
      case 'INITIALIZING':
        return 'Getting ready...';
      case 'CHECKING_PERMISSIONS':
        return 'Checking camera permissions...';
      case 'PERMISSION_DENIED':
        return 'Camera permission required';
      case 'CAMERA_STARTING':
        return 'Starting camera...';
      case 'CAMERA_ACTIVE':
        return this.capacitor.isNative() ? 'Ready to capture' : 'Ready to capture';
      case 'CAPTURING_PHOTO':
        return 'Capturing...';
      case 'PHOTO_TAKEN':
        return 'Photo captured';
      case 'LLM_CHECKING':
        return 'Processing...';
      case 'RESULT':
        return 'Check-in complete!';
      default:
        return '';
    }
  });


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

      // Platform-aware camera initialization
      if (this.capacitor.isNative()) {
        await this.initializeNativeCamera();
      } else {
        await this.initializeWebCamera();
      }
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
      this._recoveryAction.set('NONE');

      // Reset photo data
      this._photoBlob.set(null);
      this._photoDataUrl.set(null);

      // Platform-aware camera restart
      if (this.capacitor.isNative()) {
        await this.initializeNativeCamera();
      } else {
        await this.initializeWebCamera();
      }

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

  /**
   * Initialize native camera with permission handling
   */
  private async initializeNativeCamera(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] 📱 Initializing native camera via AbstractCameraService...`);
    console.log(`[${this.SERVICE_NAME}] 📱 Camera service type:`, this.cameraService.constructor.name);
    
    this._stage.set('CHECKING_PERMISSIONS');

    try {
      // Check permissions first using abstract service
      console.log(`[${this.SERVICE_NAME}] 📱 Checking camera permissions...`);
      const permissions = await this.cameraService.checkPermissions();
      console.log(`[${this.SERVICE_NAME}] 📱 Current permissions:`, permissions);
      this._permissionState.set(permissions);

      if (permissions.camera === 'denied') {
        console.warn(`[${this.SERVICE_NAME}] 📱 Camera permission denied`);
        this._stage.set('PERMISSION_DENIED');
        this._recoveryAction.set('OPEN_SETTINGS');
        this.handleError(
          'Camera permission denied. Please enable camera access in device settings.'
        );
        return;
      }

      if (permissions.camera === 'prompt') {
        console.log(`[${this.SERVICE_NAME}] 📱 Requesting camera permissions...`);
        const requestResult = await this.cameraService.requestPermissions();
        console.log(`[${this.SERVICE_NAME}] 📱 Permission request result:`, requestResult);
        this._permissionState.set(requestResult);

        if (requestResult.camera === 'denied') {
          console.error(`[${this.SERVICE_NAME}] 📱 Camera permission denied after request`);
          this._stage.set('PERMISSION_DENIED');
          this._recoveryAction.set('OPEN_SETTINGS');
          this.handleError(
            'Camera permission denied. Please enable camera access in device settings.'
          );
          return;
        }
      }

      // Verify camera is ready for capture
      console.log(`[${this.SERVICE_NAME}] 📱 Checking if camera is ready for capture...`);
      const isCameraReady = await this.cameraService.isCameraReady();
      console.log(`[${this.SERVICE_NAME}] 📱 Camera ready status:`, isCameraReady);

      if (!isCameraReady) {
        throw new Error('Camera is not ready for capture');
      }

      // Permissions granted, camera is ready
      console.log(`[${this.SERVICE_NAME}] ✅ Native camera ready for capture`);
      this._stage.set('CAMERA_ACTIVE');
    } catch (error: any) {
      console.error(`[${this.SERVICE_NAME}] ❌ Native camera initialization failed:`, {
        error: error.message,
        stage: this._stage(),
        permissionState: this._permissionState(),
        cameraServiceType: this.cameraService.constructor.name
      });
      this.handleError('Failed to initialize camera');
    }
  }

  /**
   * Initialize web camera (existing logic)
   */
  private async initializeWebCamera(): Promise<void> {
    console.log('[CheckinOrchestrator] 🌐 Initializing web camera');

    if (!this.videoElement) {
      throw new Error('Video element not set');
    }

    try {
      this._stage.set('CAMERA_STARTING');

      // Request camera access
      const stream = await this.cameraService.requestCamera({
        video: { facingMode: 'environment' },
        audio: false,
      });

      if (!stream) {
        throw new Error('No camera stream received');
      }

      // Attach stream to video element
      this.cameraService.attachToVideoElement(this.videoElement, stream);

      // Wait for video to be ready
      await this.cameraService.waitForVideoReady(this.videoElement);

      this._stage.set('CAMERA_ACTIVE');
      console.log('[CheckinOrchestrator] ✅ Web camera ready for capture');
    } catch (error: any) {
      console.error('[CheckinOrchestrator] ❌ Web camera start failed:', error);
      throw error;
    }
  }

  async capturePhoto(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] 📸 Platform-aware photo capture starting...`);
    console.log(`[${this.SERVICE_NAME}] 📸 Camera service type:`, this.cameraService.constructor.name);
    console.log(`[${this.SERVICE_NAME}] 📸 Platform info:`, {
      isNative: this.capacitor.isNative(),
      platform: this.capacitor.platformName()
    });
    
    this._stage.set('CAPTURING_PHOTO');

    try {
      if (this.capacitor.isNative()) {
        console.log(`[${this.SERVICE_NAME}] 📸 Using native photo capture...`);
        await this.captureNativePhoto();
      } else {
        console.log(`[${this.SERVICE_NAME}] 📸 Using web photo capture...`);
        await this.captureWebPhoto();
      }

      this._stage.set('PHOTO_TAKEN');
      console.log(`[${this.SERVICE_NAME}] ✅ Photo captured successfully, proceeding to confirmation`);

      // Continue with LLM processing
      await this.confirmPhoto();
    } catch (error: any) {
      console.error(`[${this.SERVICE_NAME}] ❌ Photo capture failed:`, {
        error: error.message,
        stage: this._stage(),
        platform: this.capacitor.platformName(),
        cameraServiceType: this.cameraService.constructor.name
      });
      this.handleError(error.message || 'Failed to capture photo');
    }
  }

  /**
   * Capture photo using native camera
   */
  private async captureNativePhoto(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] 📱 Capturing photo with native camera via AbstractCameraService...`);

    try {
      console.log(`[${this.SERVICE_NAME}] 📱 Calling cameraService.capturePhoto()...`);
      const capturedPhoto = await this.cameraService.capturePhoto();

      console.log(`[${this.SERVICE_NAME}] 📱 Photo capture successful, storing data...`);
      
      // Store the captured photo
      this._photoDataUrl.set(capturedPhoto.dataUrl);
      this._photoBlob.set(capturedPhoto.blob || null);

      console.log(`[${this.SERVICE_NAME}] 📱 Native photo captured and stored:`, {
        format: capturedPhoto.format,
        dimensions: `${capturedPhoto.width}x${capturedPhoto.height}`,
        dataUrlLength: capturedPhoto.dataUrl.length,
        blobSize: capturedPhoto.blob?.size || 0,
        hasDataUrl: !!capturedPhoto.dataUrl,
        hasBlob: !!capturedPhoto.blob
      });
    } catch (error: any) {
      console.error(`[${this.SERVICE_NAME}] 📱 Native photo capture failed:`, {
        error: error.message,
        cameraServiceType: this.cameraService.constructor.name,
        errorCode: error.code,
        errorName: error.name
      });
      throw error;
    }
  }

  /**
   * Capture photo from web video stream
   */
  private async captureWebPhoto(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] 🌐 Capturing photo from video stream via AbstractCameraService...`);

    if (!this.videoElement) {
      console.error(`[${this.SERVICE_NAME}] 🌐 Video element not available for web capture`);
      throw new Error('Video element not available');
    }

    try {
      // Check if camera is ready for capture
      console.log(`[${this.SERVICE_NAME}] 🌐 Checking if camera is ready for capture...`);
      const isReady = this.cameraService.isCameraReadyForCapture(this.videoElement);
      console.log(`[${this.SERVICE_NAME}] 🌐 Camera ready for capture:`, isReady);
      
      if (!isReady) {
        throw new Error('Camera is not ready for capture');
      }

      // Capture photo from video stream using abstract service
      console.log(`[${this.SERVICE_NAME}] 🌐 Calling cameraService.captureFromVideoElement()...`);
      const capturedPhoto = await this.cameraService.captureFromVideoElement(this.videoElement);

      console.log(`[${this.SERVICE_NAME}] 🌐 Web photo capture successful, storing data...`);
      
      // Store the captured photo
      this._photoDataUrl.set(capturedPhoto.dataUrl);
      this._photoBlob.set(capturedPhoto.blob || null);
      
      console.log(`[${this.SERVICE_NAME}] 🌐 Web photo captured and stored:`, {
        format: capturedPhoto.format,
        dimensions: `${capturedPhoto.width}x${capturedPhoto.height}`,
        dataUrlLength: capturedPhoto.dataUrl.length,
        blobSize: capturedPhoto.blob?.size || 0,
        hasDataUrl: !!capturedPhoto.dataUrl,
        hasBlob: !!capturedPhoto.blob
      });
    } catch (error: any) {
      console.error(`[${this.SERVICE_NAME}] 🌐 Web photo capture failed:`, {
        error: error.message,
        cameraServiceType: this.cameraService.constructor.name,
        videoElementReady: !!this.videoElement,
        videoElementDimensions: this.videoElement ? `${this.videoElement.videoWidth}x${this.videoElement.videoHeight}` : 'N/A'
      });
      throw error;
    }
  }

  // ===================================
  // 🔄 RETAKE FUNCTIONALITY
  // ===================================

  async confirmPhoto(): Promise<void> {
    console.log('[CheckinOrchestrator] ✅ User confirmed photo - proceeding with LLM check');

    const dataUrl = this._photoDataUrl();
    const blob = this._photoBlob();

    if (!dataUrl || !blob) {
      console.error('[CheckinOrchestrator] ❌ No photo data available for confirmation');
      this.handleError('No photo data available');
      return;
    }

    try {
      // Start LLM check or direct processing
      if (environment.LLM_CHECK) {
        console.log('[CheckinOrchestrator] 🤖 Starting LLM analysis after user confirmation');
        await this.checkWithLLM(dataUrl);
      } else {
        console.log('[CheckinOrchestrator] 🧪 DEV MODE: Skipping LLM, processing directly');
        await this.processCheckin(blob);
      }
    } catch (error: any) {
      console.error('[CheckinOrchestrator] ❌ Photo confirmation failed:', error);
      this.handleError(error?.message || 'Failed to process photo');
    }
  }

  retakePhoto(): void {
    const currentStage = this._stage();
    console.log(
      '[CheckinOrchestrator] 🔄 User chose to retake photo - starting complete reset process',
      { currentStage }
    );

    // Step 1: Cancel any ongoing LLM processing
    if (currentStage === 'LLM_CHECKING') {
      console.log('[CheckinOrchestrator] 🛑 Canceling ongoing LLM processing');
      // Note: We can't actually cancel the LLM request, but we can prevent its results from being processed
      // by clearing the stage and photo data immediately
    }

    // Step 2: Clear all photo data immediately
    console.log('[CheckinOrchestrator] 📸 Clearing saved photo data (blob & dataUrl)');
    this._photoBlob.set(null);
    this._photoDataUrl.set(null);

    // Step 3: Clear any error state
    console.log('[CheckinOrchestrator] ❌ Clearing error state');
    this._error.set(null);

    // Step 4: Reset stage to remove photo preview and show camera again
    console.log('[CheckinOrchestrator] 🎬 Changing stage from', currentStage, 'to CAMERA_ACTIVE');
    this._stage.set('CAMERA_ACTIVE');

    // Step 5: Verify camera is still running
    if (this.videoElement && this.cameraService.isCameraReadyForCapture(this.videoElement)) {
      console.log('[CheckinOrchestrator] ✅ Camera verified - ready for new capture');
    } else {
      console.warn(
        '[CheckinOrchestrator] ⚠️ Camera may not be ready - video element:',
        !!this.videoElement
      );
    }

    console.log('[CheckinOrchestrator] 🎯 Retake complete - user should now see live camera feed');
  }

  // ===================================
  // 📸 PHOTO PROCESSING
  // ===================================

  private async checkWithLLM(photoDataUrl: string): Promise<void> {
    console.log('[CheckinOrchestrator] 🤖 Starting LLM carpet detection analysis');
    this._stage.set('LLM_CHECKING');

    try {
      const result = await this.llmService.detectCarpet(photoDataUrl);

      // Check if user canceled the operation while LLM was processing
      if (this._stage() !== 'LLM_CHECKING') {
        console.log('[CheckinOrchestrator] 🛑 LLM processing canceled by user - aborting');
        return;
      }

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
      // Only handle error if we're still in LLM checking stage
      if (this._stage() === 'LLM_CHECKING') {
        console.error('[CheckinOrchestrator] ❌ LLM analysis failed:', error);
        this.handleError('Failed to verify carpet');
      } else {
        console.log('[CheckinOrchestrator] 🛑 LLM error ignored - operation was canceled');
      }
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
      const pubName = this.dataAggregator.getPubName(pubId);
      console.log('[CheckinOrchestrator] 🏛️ Retrieved pub name:', pubName, 'for pubId:', pubId);
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
  // 🔐 PERMISSION MANAGEMENT
  // ===================================

  /**
   * Open device settings for camera permissions (native only)
   */
  async openDeviceSettings(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] ⚙️ Opening device settings via AbstractCameraService...`);
    console.log(`[${this.SERVICE_NAME}] ⚙️ Camera service type:`, this.cameraService.constructor.name);
    console.log(`[${this.SERVICE_NAME}] ⚙️ Platform info:`, {
      isNative: this.capacitor.isNative(),
      platform: this.capacitor.platformName()
    });

    if (!this.capacitor.isNative()) {
      console.warn(`[${this.SERVICE_NAME}] ⚙️ Device settings only available on native platforms`);
      return;
    }

    try {
      console.log(`[${this.SERVICE_NAME}] ⚙️ Calling cameraService.openDeviceSettings()...`);
      await this.cameraService.openDeviceSettings();
      console.log(`[${this.SERVICE_NAME}] ⚙️ Device settings opened successfully`);
    } catch (error: any) {
      console.error(`[${this.SERVICE_NAME}] ⚙️ Failed to open device settings:`, {
        error: error.message,
        cameraServiceType: this.cameraService.constructor.name,
        platform: this.capacitor.platformName()
      });
      this.handleError('Could not open device settings');
    }
  }

  /**
   * Retry camera permissions (native only)
   */
  async retryPermissions(): Promise<void> {
    console.log(`[${this.SERVICE_NAME}] 🔐 Retrying camera permissions via AbstractCameraService...`);
    console.log(`[${this.SERVICE_NAME}] 🔐 Camera service type:`, this.cameraService.constructor.name);
    console.log(`[${this.SERVICE_NAME}] 🔐 Platform info:`, {
      isNative: this.capacitor.isNative(),
      platform: this.capacitor.platformName()
    });

    if (!this.capacitor.isNative()) {
      console.warn(`[${this.SERVICE_NAME}] 🔐 Permission retry only available on native platforms`);
      return;
    }

    try {
      this._stage.set('CHECKING_PERMISSIONS');
      this._error.set(null);
      this._recoveryAction.set('NONE');

      console.log(`[${this.SERVICE_NAME}] 🔐 Calling cameraService.requestPermissions()...`);
      const permissions = await this.cameraService.requestPermissions();
      console.log(`[${this.SERVICE_NAME}] 🔐 Permission retry result:`, permissions);
      
      this._permissionState.set(permissions);

      if (permissions.camera === 'granted') {
        this._stage.set('CAMERA_ACTIVE');
        console.log(`[${this.SERVICE_NAME}] 🔐 Permissions granted - camera ready`);
      } else {
        this._stage.set('PERMISSION_DENIED');
        this._recoveryAction.set('OPEN_SETTINGS');
        console.error(`[${this.SERVICE_NAME}] 🔐 Permissions still denied after retry:`, permissions);
        this.handleError('Camera permission still denied');
      }
    } catch (error: any) {
      console.error(`[${this.SERVICE_NAME}] 🔐 Permission retry failed:`, {
        error: error.message,
        cameraServiceType: this.cameraService.constructor.name,
        stage: this._stage(),
        permissionState: this._permissionState()
      });
      this.handleError('Failed to request camera permissions');
    }
  }

  // ===================================
  // 🧹 CLEANUP
  // ===================================

  cleanup(): void {
    console.log(`[${this.SERVICE_NAME}] 🧹 Platform-aware cleanup via AbstractCameraService...`);
    console.log(`[${this.SERVICE_NAME}] 🧹 Camera service type:`, this.cameraService.constructor.name);
    console.log(`[${this.SERVICE_NAME}] 🧹 Platform info:`, {
      isNative: this.capacitor.isNative(),
      platform: this.capacitor.platformName()
    });

    // Platform-agnostic cleanup using abstract service
    try {
      console.log(`[${this.SERVICE_NAME}] 🧹 Calling cameraService.reset()...`);
      this.cameraService.reset();
      console.log(`[${this.SERVICE_NAME}] 🧹 Camera service reset complete`);
      
      if (!this.capacitor.isNative()) {
        // Web-specific cleanup
        console.log(`[${this.SERVICE_NAME}] 🧹 Web platform - clearing video element reference`);
        this.videoElement = null;
      }
    } catch (error: any) {
      console.error(`[${this.SERVICE_NAME}] 🧹 Camera service cleanup failed:`, {
        error: error.message,
        cameraServiceType: this.cameraService.constructor.name
      });
    }

    // Common cleanup - reset all orchestrator state
    console.log(`[${this.SERVICE_NAME}] 🧹 Resetting orchestrator state...`);
    this._stage.set('INITIALIZING');
    this._pubId.set(null);
    this._error.set(null);
    this._photoDataUrl.set(null);
    this._photoBlob.set(null);
    this._permissionState.set({ camera: 'unknown' });
    this._recoveryAction.set('NONE');
    
    console.log(`[${this.SERVICE_NAME}] 🧹 Cleanup complete`);
  }
}
