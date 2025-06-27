import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, effect, output } from '@angular/core';
import { BaseComponent } from '@shared/data-access/base.component';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
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

  private photoAlreadySaved = false;

  // Outputs - now emits structured photo data
  readonly carpetConfirmed = output<CarpetPhotoData>();
  readonly exitScanner = output<void>();

  constructor() {
    super();

    effect(() => {
      const data = this.carpetData();
      if (data.photoTaken && data.capturedPhoto && !this.photoAlreadySaved) {
        console.log('🔥 [CarpetScanner] Photo captured - auto-saving...');
        this.autoSaveCarpet(data);
      }
    });

    effect(() => {
      const data = this.carpetData();
      if (data.photoTaken && data.capturedPhoto) {
        console.log('✅ [CarpetScanner] Photo captured successfully - showing success screen');
        this.showSuccessScreen.set(true);
      }
    });
  }

  override ngOnInit(): void {
    console.log('🎬 [CarpetScanner] Component initialized');
    this.startScanning();
  }

  ngOnDestroy(): void {
    console.log('🚪 [CarpetScanner] Component destroyed');
    this.stopScanning();
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

    if (data.llmProcessing) {
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
