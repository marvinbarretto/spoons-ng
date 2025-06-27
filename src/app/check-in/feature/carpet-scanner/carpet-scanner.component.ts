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
import { CarpetPhotoData, PhotoStats } from '@shared/utils/carpet-photo.models';

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

  // Signals
  protected readonly carpetData = this._carpetService.data;
  protected readonly cameraReady = signal(false);
  protected readonly cameraError = signal<string | null>(null);
  protected readonly showDebug = signal(false);
  protected readonly showSuccessScreen = signal(false);
  protected readonly persistentResultMessage = signal<string | null>(null);

  private photoAlreadySaved = false;
  private autoTriggerTimeout: ReturnType<typeof setTimeout> | null = null;
  private resultDisplayTimeout: ReturnType<typeof setTimeout> | null = null;

  // Outputs - now emits structured photo data
  readonly carpetConfirmed = output<CarpetPhotoData>();
  readonly exitScanner = output<void>();

  constructor() {
    super();

    // Auto-save photo when captured
    effect(() => {
      const data = this.carpetData();
      if (data.photoTaken && data.capturedPhoto && !this.photoAlreadySaved) {
        console.log('🔥 [CarpetScanner] Photo captured - auto-saving...');
        this.autoSaveCarpet(data);
      }
    });

    // Show success screen when photo captured
    effect(() => {
      const data = this.carpetData();
      if (data.photoTaken && data.capturedPhoto) {
        console.log('✅ [CarpetScanner] Photo captured successfully - showing success screen');
        this.showSuccessScreen.set(true);
      }
    });

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
  }

  ngOnDestroy(): void {
    console.log('🚪 [CarpetScanner] Component destroyed');
    this.clearTimeouts();
    this.stopScanning();
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
    
    // Set persistent result message
    const resultMessage = data.llmCarpetDetected ? 'Carpet detected!' : 'No carpet detected';
    this.persistentResultMessage.set(resultMessage);
    
    // Clear any existing auto-trigger
    if (this.autoTriggerTimeout) {
      clearTimeout(this.autoTriggerTimeout);
    }

    // Start auto-trigger timer (1.5 seconds to show result message)
    this.autoTriggerTimeout = setTimeout(async () => {
      console.log('⏰ [CarpetScanner] Auto-trigger timeout - attempting capture');
      await this.attemptAutoCapture();
    }, 1500);

    // Set up persistent result display timeout (5 seconds)
    this.setupResultDisplayTimeout();
  }

  private handleCaptureReady(data: CarpetRecognitionData): void {
    console.log('📸 [CarpetScanner] Handling capture ready');
    
    // If we have an auto-trigger pending, trigger it immediately
    if (this.autoTriggerTimeout) {
      clearTimeout(this.autoTriggerTimeout);
      this.autoTriggerTimeout = null;
      
      console.log('🚀 [CarpetScanner] Conditions optimal - triggering immediate capture');
      setTimeout(async () => {
        await this.attemptAutoCapture();
      }, 100); // Small delay for UI
    }
  }

  private async attemptAutoCapture(): Promise<void> {
    const data = this.carpetData();
    
    // Skip if photo already taken
    if (data.photoTaken) {
      console.log('⏭️ [CarpetScanner] Photo already captured, skipping auto-capture');
      return;
    }

    // Skip if carpet not detected
    if (!data.llmCarpetDetected) {
      console.log('⏭️ [CarpetScanner] No carpet detected, skipping auto-capture');
      return;
    }

    try {
      console.log('📸 [CarpetScanner] Attempting auto-capture via service');
      await this._carpetService.manualCapture();
    } catch (error) {
      console.error('❌ [CarpetScanner] Auto-capture failed:', error);
    }
  }

  private setupResultDisplayTimeout(): void {
    // Clear any existing timeout
    if (this.resultDisplayTimeout) {
      clearTimeout(this.resultDisplayTimeout);
    }

    // Set 5-second timeout to clear persistent result
    this.resultDisplayTimeout = setTimeout(() => {
      console.log('⏰ [CarpetScanner] Clearing persistent result display');
      this.persistentResultMessage.set(null);
    }, 5000);
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
    this.persistentResultMessage.set(null);
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
      // Show streaming text if available, otherwise default message
      return data.llmStreamingText || CARPET_SCANNER_MESSAGES.ANALYZING_CARPET;
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

  private async autoSaveCarpet(data: any): Promise<void> {
    if (this.photoAlreadySaved) {
      console.log('🔒 [CarpetScanner] Photo already saved, skipping duplicate save');
      return;
    }

    this.photoAlreadySaved = true;

    try {
      console.log('💾 [CarpetScanner] Auto-saving carpet photo...');

      if (!data.capturedPhoto) {
        console.error('❌ [CarpetScanner] No photo blob available for saving');
        return;
      }

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

      console.log('📤 [CarpetScanner] Emitting carpet confirmed event...');
      this.carpetConfirmed.emit(carpetPhotoData);

    } catch (error) {
      console.error('❌ [CarpetScanner] Failed to auto-save carpet:', error);
      this.photoAlreadySaved = false;
    }
  }
}
