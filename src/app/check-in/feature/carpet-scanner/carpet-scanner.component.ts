import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, effect, output } from '@angular/core';
import { BaseComponent } from '@shared/data-access/base.component';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
import { CarpetRecognitionData } from '../../utils/carpet.models';
import { CameraService } from '../../../shared/data-access/camera.service';
import { SsrPlatformService } from '../../../shared/utils/ssr/ssr-platform.service';
import { CARPET_RECOGNITION_CONFIG } from '../../data-access/carpet-recognition.config';
import { CARPET_SCANNER_MESSAGES } from '../../utils/carpet-scanner.messages';
import { CarpetSuccessComponent } from '../../ui/carpet-success/carpet-success.component';
import { DeviceCarpetStorageService } from '../../../carpets/data-access/device-carpet-storage.service';
import { DEV_FEATURES, DESKTOP_TESTING_DELAY, LLM_TO_PHOTO_DELAY } from '@shared/utils/dev-mode.constants';
import { CarpetPhotoData, PhotoStats } from '@shared/utils/carpet-photo.models';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { CheckInModalService } from '../../data-access/check-in-modal.service';
import { PubStore } from '../../../pubs/data-access/pub.store';

@Component({
  selector: 'app-carpet-scanner',
  templateUrl: './carpet-scanner.component.html',
  styleUrl: './carpet-scanner.component.scss',
  imports: [CarpetSuccessComponent]
})
export class CarpetScannerComponent extends BaseComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private readonly _carpetService = inject(CarpetRecognitionService);
  private readonly _cameraService = inject(CameraService);
  private readonly _platform = inject(SsrPlatformService);
  private readonly photoStorage = inject(DeviceCarpetStorageService);
  private readonly checkinStore = inject(CheckInStore);
  private readonly checkInModalService = inject(CheckInModalService);
  private readonly pubStore = inject(PubStore);

  // Signals
  protected readonly carpetData = this._carpetService.data;
  protected readonly cameraReady = signal(false);
  protected readonly cameraError = signal<string | null>(null);
  protected readonly showDebug = signal(false);
  protected readonly showSuccessScreen = signal(false);
  protected readonly persistentResultMessage = signal<string | null>(null);
  protected readonly progressiveStoryMode = signal(false);
  protected readonly storyMessage = signal<string | null>(null);
  protected readonly capturedPhotoUrl = signal<string | null>(null);

  private photoAlreadySaved = false;
  private autoTriggerTimeout: ReturnType<typeof setTimeout> | null = null;
  private resultDisplayTimeout: ReturnType<typeof setTimeout> | null = null;
  private storyTimeouts: ReturnType<typeof setTimeout>[] = [];
  private currentStoryIndex = 0;
  private storyArray: string[] = [];

  // Outputs - now emits structured photo data
  readonly carpetConfirmed = output<CarpetPhotoData>();
  readonly exitScanner = output<void>();

  constructor() {
    super();

    // Auto-save photo when captured - PROGRESSIVE STORYTELLING
    effect(() => {
      const data = this.carpetData();
      if (data.photoTaken && data.capturedPhoto && !this.photoAlreadySaved) {
        console.log('🔥 [CarpetScanner] Photo captured - starting progressive story');
        this.photoAlreadySaved = true;

        // Store captured photo immediately for background
        if (data.capturedPhoto) {
          const photoUrl = URL.createObjectURL(data.capturedPhoto);
          this.capturedPhotoUrl.set(photoUrl);
        }

        this.startProgressiveStoryMode(data);
      }
    });

    // Show success screen when photo captured
    // effect(() => {
    //   const data = this.carpetData();
    //   if (data.photoTaken && data.capturedPhoto) {
    //     console.log('✅ [CarpetScanner] Photo captured successfully - showing success screen');
    //     this.showSuccessScreen.set(true);
    //   }
    // });

    // Watch for carpet detection via signals
    effect(() => {
      const carpetDetected = this._carpetService.carpetDetectedSignal();
      if (carpetDetected) {
        console.log('🎯 [CarpetScanner] Carpet detected - starting auto-trigger timer');
        this.handleCarpetDetected(carpetDetected);
      }
    });

    // Watch for quality ready
    effect(() => {
      const qualityReady = this._carpetService.qualityReadySignal();
      if (qualityReady) {
        console.log('✨ [CarpetScanner] Quality conditions ready');
      }
    });

    // Watch for capture ready
    effect(() => {
      const captureReady = this._carpetService.captureReadySignal();
      if (captureReady) {
        console.log('📸 [CarpetScanner] All capture conditions ready');
        this.handleCaptureReady(captureReady);
      }
    });
  }

  override ngOnInit(): void {
    console.log('🎬 [CarpetScanner] Component initialized');
    this.startScanning();

    // Desktop testing mode for development
    if (DEV_FEATURES.DESKTOP_TESTING_MODE) {
      setTimeout(async () => {
        console.log('🧪 [DEV-MODE] Forcing LLM detection first for desktop testing');
        try {
          // First trigger LLM detection
          await this._carpetService.triggerLLMDetection();

          // Wait for LLM response, then capture photo
          setTimeout(async () => {
            console.log('🧪 [DEV-MODE] Now forcing photo capture after LLM');
            await this._carpetService.manualCapture();
          }, LLM_TO_PHOTO_DELAY);
        } catch (error) {
          console.log('🧪 [DEV-MODE] LLM/capture failed, forcing state directly');
          // Force the state if everything fails
          (this._carpetService as any)._updateData({
            photoTaken: true,
            capturedPhoto: new Blob(['fake'], { type: 'image/jpeg' }),
            llmCarpetDetected: true,
            llmLastResult: { story: ['Test story 1', 'Test story 2', 'Test story 3'] },
            photoFormat: 'jpeg',
            photoSizeKB: 100
          });
        }
      }, DESKTOP_TESTING_DELAY);
    }
  }

  ngOnDestroy(): void {
    console.log('🚪 [CarpetScanner] Component destroyed');
    this.clearTimeouts();
    this.stopScanning();

    // Clean up photo URL to prevent memory leak
    const photoUrl = this.capturedPhotoUrl();
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }
  }

  private clearTimeouts(): void {
    if (this.autoTriggerTimeout) {
      clearTimeout(this.autoTriggerTimeout);
      this.autoTriggerTimeout = null;
    }
    if (this.resultDisplayTimeout) {
      clearTimeout(this.resultDisplayTimeout);
      this.resultDisplayTimeout = null;
    }
  }

  private handleCarpetDetected(data: CarpetRecognitionData): void {
    console.log('🎯 [CarpetScanner] Handling carpet detection');

    // Clear any existing auto-trigger
    if (this.autoTriggerTimeout) {
      clearTimeout(this.autoTriggerTimeout);
    }

    // If carpet detected, trigger capture immediately for smooth UX
    if (true) { // TEMP: Always detect carpet for desktop testing
      console.log('✅ [CarpetScanner] Carpet detected - triggering immediate capture');
      // No delay - immediate capture
      this.attemptAutoCapture();
    }
  }

  private handleCaptureReady(data: CarpetRecognitionData): void {
    console.log('📸 [CarpetScanner] Handling capture ready - SIMPLIFIED');
    // Simple immediate capture when ready
    this.attemptAutoCapture();
  }

  private async attemptAutoCapture(): Promise<void> {
    const data = this.carpetData();

    // Skip if photo already taken
    if (data.photoTaken) {
      console.log('⏭️ [CarpetScanner] Photo already captured, skipping auto-capture');
      return;
    }

    // Skip if carpet not detected
    // if (!data.llmCarpetDetected) { // TEMP: Disabled for desktop testing
    //   console.log('⏭️ [CarpetScanner] No carpet detected, skipping auto-capture');
    //   return;
    // }

    try {
      console.log('📸 [CarpetScanner] Attempting auto-capture via service');
      await this._carpetService.manualCapture();
    } catch (error) {
      console.error('❌ [CarpetScanner] Auto-capture failed:', error);
    }
  }

  protected onExitScanner(): void {
    console.log('🚪 [CarpetScanner] Exit scanner requested');
    this.stopScanning();
    this.exitScanner.emit();
  }

  protected toggleDebug(): void {
    const newState = !this.showDebug();
    console.log(`🐛 [CarpetScanner] Debug panel: ${newState}`);
    this.showDebug.set(newState);
  }

  protected async startScanning(): Promise<void> {
    console.log('🎬 [CarpetScanner] Starting WebP scanning...');

    // Block underlying page interaction with SSR safety
    this._platform.onlyOnBrowser(() => {
      document.body.classList.add('scanner-active');
      document.body.style.overflow = 'hidden';
    });

    try {
      this.cameraError.set(null);

      // Start recognition - this will handle camera access via CameraService
      await this._carpetService.startRecognition();
      console.log('✅ [CarpetScanner] Recognition started');

      // Get the stream from CameraService to display in our video element
      const stream = this._cameraService.currentStream;

      if (stream && this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
        await this.videoElement.nativeElement.play();
        this.cameraReady.set(true);
        console.log('📹 [CarpetScanner] Video element ready with CameraService stream');
      } else {
        console.warn('❌ [CarpetScanner] No stream available from CameraService');
      }

    } catch (error: any) {
      console.error('❌ [CarpetScanner] Camera error:', error);
      this.handleCameraError(error);
    }
  }

  private stopCameraStream(): void {
    console.log('📹 [CarpetScanner] Stopping camera stream only');

    // Stop the video element
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.pause();
      this.videoElement.nativeElement.srcObject = null;
    }

    // Stop camera service stream
    this._cameraService.releaseCamera();
    this.cameraReady.set(false);
  }

  protected stopScanning(): void {
    console.log('🛑 [CarpetScanner] Stopping scanning...');

    // Restore normal page interaction with SSR safety
    this._platform.onlyOnBrowser(() => {
      document.body.classList.remove('scanner-active');
      document.body.style.overflow = '';
    });

    this._carpetService.stopRecognition();
    this.cameraReady.set(false);
    this.cameraError.set(null);
    this.showSuccessScreen.set(false);
    this.photoAlreadySaved = false;
  }

  private handleCameraError(error: any): void {
    let errorMessage = 'Camera unavailable';

    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera permission denied';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera found';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'Camera not supported';
    }

    console.error(`❌ [CarpetScanner] Camera error: ${errorMessage}`, error);
    this.cameraError.set(errorMessage);
  }

  protected get statusMessage(): string {
    // Show story message when in progressive story mode
    if (this.progressiveStoryMode() && this.storyMessage()) {
      return this.storyMessage()!;
    }

    const data = this.carpetData();

    if (this.cameraError()) {
      return `${CARPET_SCANNER_MESSAGES.CAMERA_ERROR}: ${this.cameraError()}`;
    }

    if (!this.cameraReady()) {
      return CARPET_SCANNER_MESSAGES.STARTING_CAMERA;
    }

    // Prioritize component's persistent result message
    if (this.persistentResultMessage()) {
      return this.persistentResultMessage()!;
    }

    if (data.llmProcessing) {
      // Show simple analyzing message instead of streaming text for smoother UX
      return CARPET_SCANNER_MESSAGES.ANALYZING_CARPET;
    }

    if (data.photoTaken) {
      return CARPET_SCANNER_MESSAGES.PHOTO_CAPTURED(data.photoFormat, data.photoSizeKB);
    }

    if (data.llmCarpetDetected && data.pubName) {
      return CARPET_SCANNER_MESSAGES.WELCOME_TO_PUB(data.pubName);
    }

    if (data.llmCarpetDetected) {
      return CARPET_SCANNER_MESSAGES.CARPET_DETECTED;
    }

    if (data.canCheckIn && !data.isSharp) {
      return CARPET_SCANNER_MESSAGES.HOLD_STEADY;
    }

    if (data.canCheckIn) {
      return CARPET_SCANNER_MESSAGES.ALL_CONDITIONS_MET;
    }

    if (data.llmLastResult === 'No carpet detected') {
      return CARPET_SCANNER_MESSAGES.STILL_SCANNING;
    }

    return CARPET_SCANNER_MESSAGES.POINT_AT_CARPET;
  }

  private startProgressiveStoryMode(data: any): void {
    console.log('📖 [CarpetScanner] Starting progressive story mode');
    this.progressiveStoryMode.set(true);

    // Stop camera immediately for battery/privacy
    this.stopCameraStream();

    // Clear any existing story timeouts
    this.storyTimeouts.forEach(timeout => clearTimeout(timeout));
    this.storyTimeouts = [];
    this.currentStoryIndex = 0;

    // Get all the story observations
    this.storyArray = this.extractCarpetDetails(data);

    // Step 1: Photo captured
    this.storyMessage.set('📸 Photo captured!');

    // Step 2: Add mystique - analyzing discovery
    this.storyTimeouts.push(setTimeout(() => {
      this.storyMessage.set('🔍 Analyzing your discovery...');
    }, 1500));

    // Step 3: Cycle through carpet story observations
    this.storyTimeouts.push(setTimeout(() => {
      this.cycleStoryObservations();
    }, 3000));

    // Step 4: Show pub information after all observations
    const storyDelay = 2500; // 2.5 seconds per story
    const totalStoryTime = 3000 + (this.storyArray.length * storyDelay);

    // Add mystique before revealing pub name
    this.storyTimeouts.push(setTimeout(() => {
      this.storyMessage.set('✨ Discovering your location...');
    }, totalStoryTime));

    this.storyTimeouts.push(setTimeout(() => {
      const pubInfo = this.extractPubInfo(data);
      this.storyMessage.set(pubInfo);
    }, totalStoryTime + 1500));

    // Step 5: Processing check-in (don't exit scanner yet)
    this.storyTimeouts.push(setTimeout(() => {
      this.storyMessage.set('🎉 Recording your visit...');
      this.processCheckIn(data);

      // Wait for success modal to be ready, then show it over blurred background
      this.waitForSuccessModal();
    }, totalStoryTime + 3000));
  }

  private cycleStoryObservations(): void {
    if (this.currentStoryIndex < this.storyArray.length) {
      this.storyMessage.set(this.storyArray[this.currentStoryIndex]);
      this.currentStoryIndex++;

      // Schedule next observation
      this.storyTimeouts.push(setTimeout(() => {
        this.cycleStoryObservations();
      }, 2500)); // 2.5 seconds per observation for readability
    }
  }

  private extractCarpetDetails(data: any): string[] {
    // console.log('🔍 [CarpetScanner] Extracting carpet details from data:', data);

    // Try to get story array from LLM response
    if (data.llmLastResult && data.llmLastResult.story && Array.isArray(data.llmLastResult.story)) {
      console.log('✅ [CarpetScanner] Found story array:', data.llmLastResult.story);
      return data.llmLastResult.story;
    }

    // Check if we have raw streaming text that might contain JSON
    if (data.llmStreamingText) {
      console.log('📝 [CarpetScanner] LLM streaming text:', data.llmStreamingText);

      // Try to parse JSON from streaming text
      try {
        const jsonMatch = data.llmStreamingText.match(/\{[^}]*\}/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.story && Array.isArray(parsed.story)) {
            console.log('✅ [CarpetScanner] Parsed story from JSON:', parsed.story);
            return parsed.story;
          }
        }
      } catch (e) {
        // console.warn('❌ [CarpetScanner] Failed to parse JSON from streaming text', e.message);
      }

      // Simple fallback with streaming text
      const text = data.llmStreamingText.toLowerCase();
      if (text.includes('red') || text.includes('blue') || text.includes('pattern')) {
        return [`🎨 ${data.llmStreamingText.slice(0, 50)}...`];
      }
    }

    // Fallback to technical details
    console.log('⚠️ [CarpetScanner] Using technical fallback');
    const edges = data.edgeCount || 0;
    const sharpness = data.blurScore || 0;
    return [
      `🔍 Carpet analysis complete`,
      `📐 ${edges} edges detected`,
      `✨ ${sharpness}% sharpness score`
    ];
  }

  private extractPubInfo(data: any): string {
    // Try to get pub name from data or context
    if (data.pubName) {
      return `🍺 Welcome to ${data.pubName}!`;
    }

    // Check if we can get pub info from checkinStore
    const pubId = this.checkinStore?.needsCarpetScan();
    if (pubId && typeof pubId === 'string') {
      // Get pub details from PubStore using the pubId
      const pub = this.pubStore.get(pubId);
      if (pub?.name) {
        return `🍺 Welcome to ${pub.name}!`;
      }
    }

    return '🍺 Great carpet spotted at this pub!';
  }

  private processCheckIn(data: any): void {
    // Trigger the actual check-in process
    console.log('🚀 [CarpetScanner] Triggering check-in process...');

    // Emit the carpet confirmed event to start the normal flow
    const carpetPhotoData: CarpetPhotoData = {
      blob: data.capturedPhoto,
      filename: data.photoFilename || `carpet_${Date.now()}.${data.photoFormat}`,
      format: data.photoFormat,
      sizeKB: data.photoSizeKB,
      metadata: {
        edgeCount: data.edgeCount || 0,
        blurScore: data.blurScore,
        confidence: data.overallConfidence,
        orientationAngle: data.orientationAngle
      }
    };

    this.carpetConfirmed.emit(carpetPhotoData);

    // Wait a bit then show success message
    this.storyTimeouts.push(setTimeout(() => {
      this.storyMessage.set('🎉 Check-in complete! Calculating rewards...');
    }, 1500));
  }

  private waitForSuccessModal(): void {
    console.log('⏳ [CarpetScanner] Waiting for success modal...');

    // Watch for check-in results
    const checkResults = () => {
      const results = this.checkinStore.checkinResults();
      if (results) {
        console.log('🎉 [CarpetScanner] Check-in results ready, keeping scanner open for modal');

        // Don't show modal here - let FooterNav handle it
        // Just keep the scanner open with the blurred background

        // DON'T clear results - let FooterNav handle it

        return true;
      }
      return false;
    };

    // Check immediately
    if (checkResults()) return;

    // Poll for results every 500ms for up to 10 seconds
    let attempts = 0;
    const maxAttempts = 20;

    const pollInterval = setInterval(() => {
      attempts++;

      if (checkResults() || attempts >= maxAttempts) {
        clearInterval(pollInterval);

        if (attempts >= maxAttempts) {
          console.warn('⚠️ [CarpetScanner] Timeout waiting for success modal');
          // Don't exit - just stay on the blurred background
        }
      }
    }, 500);
  }

  // COMMENTED OUT FOR DEV - SIMPLIFYING FLOW
  // private async autoSaveCarpet(data: any): Promise<void> {
  //   if (this.photoAlreadySaved) {
  //     console.log('🔒 [CarpetScanner] Photo already saved, skipping duplicate save');
  //     return;
  //   }

  //   this.photoAlreadySaved = true;

  //   try {
  //     console.log('💾 [CarpetScanner] Auto-saving carpet photo...');

  //     if (!data.capturedPhoto) {
  //       console.error('❌ [CarpetScanner] No photo blob available for saving');
  //       return;
  //     }

  //     const carpetPhotoData: CarpetPhotoData = {
  //       blob: data.capturedPhoto,
  //       filename: data.photoFilename || `carpet_${Date.now()}.${data.photoFormat}`,
  //       format: data.photoFormat,
  //       sizeKB: data.photoSizeKB,
  //       metadata: {
  //         edgeCount: data.edgeCount || 0,
  //         blurScore: data.blurScore,
  //         confidence: data.overallConfidence,
  //         orientationAngle: data.orientationAngle
  //       }
  //     };

  //     console.log('📤 [CarpetScanner] Emitting carpet confirmed event...');
  //     this.carpetConfirmed.emit(carpetPhotoData);

  //   } catch (error) {
  //     console.error('❌ [CarpetScanner] Failed to auto-save carpet:', error);
  //     this.photoAlreadySaved = false;
  //   }
  // }
}
