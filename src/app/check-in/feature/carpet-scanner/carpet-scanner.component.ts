import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, effect, output } from '@angular/core';
import { BaseComponent } from '@shared/base/base.component';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
import { CarpetRecognitionData } from '../../utils/carpet.models';
import { CameraService } from '../../../shared/data-access/camera.service';
import { SsrPlatformService } from '../../../shared/utils/ssr/ssr-platform.service';
import { CARPET_RECOGNITION_CONFIG } from '../../data-access/carpet-recognition.config';
import { CARPET_SCANNER_MESSAGES } from '../../utils/carpet-scanner.messages';
import { CarpetStorageService } from '../../../carpets/data-access/carpet-storage.service';
import { DEV_FEATURES, DESKTOP_TESTING_DELAY, LLM_TO_PHOTO_DELAY } from '@shared/utils/dev-mode.constants';
import { CarpetPhotoData, PhotoStats } from '@shared/utils/carpet-photo.models';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { CheckInModalService } from '../../data-access/check-in-modal.service';
import { PubStore } from '../../../pubs/data-access/pub.store';

@Component({
  selector: 'app-carpet-scanner',
  templateUrl: './carpet-scanner.component.html',
  styleUrl: './carpet-scanner.component.scss',
  imports: []
})
export class CarpetScannerComponent extends BaseComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private readonly _carpetService = inject(CarpetRecognitionService);
  private readonly _cameraService = inject(CameraService);
  private readonly _platform = inject(SsrPlatformService);
  private readonly photoStorage = inject(CarpetStorageService);
  private readonly checkinStore = inject(CheckInStore);
  private readonly checkInModalService = inject(CheckInModalService);
  private readonly pubStore = inject(PubStore);

  // Signals
  protected readonly carpetData = this._carpetService.data;
  protected readonly cameraReady = signal(false);
  protected readonly cameraError = signal<string | null>(null);
  protected readonly showDebug = signal(false);
  protected readonly capturedPhotoUrl = signal<string | null>(null);
  protected readonly isProcessingCheckIn = signal(false);

  private photoAlreadySaved = false;


  // Outputs - now emits structured photo data
  readonly carpetConfirmed = output<CarpetPhotoData>();
  readonly exitScanner = output<void>();

  constructor() {
    super();

    // COMMENTED OUT: Process photo when captured - causing infinite loops
    // effect(() => {
    //   const data = this.carpetData();
    //   if (data.photoTaken && data.capturedPhoto && !this.photoAlreadySaved) {
    //     console.log('🔥 [CarpetScanner] Photo captured - processing check-in');
    //     this.photoAlreadySaved = true;
    //     
    //     // Store photo for background
    //     const photoUrl = URL.createObjectURL(data.capturedPhoto);
    //     this.capturedPhotoUrl.set(photoUrl);
    //     
    //     this.processCheckIn(data);
    //   }
    // });


    // COMMENTED OUT: Handle carpet detection - causing infinite loops
    // effect(() => {
    //   const carpetDetected = this._carpetService.carpetDetectedSignal();
    //   if (carpetDetected && !this.photoAlreadySaved) {
    //     this.handleCarpetDetected(carpetDetected);
    //   }
    // });

    // COMMENTED OUT: Keep this effect for check-in completion - also causing issues
    // effect(() => {
    //   const results = this.checkinStore.checkinResults();
    //   if (results) {
    //     console.log('🎉 [CarpetScanner] Check-in complete - exiting');
    //     this.onExitScanner();
    //   }
    // });
  }

  override ngOnInit(): void {
    console.log('🎬 [CarpetScanner] Component initialized');
    this.startScanning();

    // Fake LLM validation for development
    if (DEV_FEATURES.DESKTOP_TESTING_MODE) {
      setTimeout(async () => {
        console.log('🧪 [DEV-MODE] Starting fake photo validation...');
        const isValid = await this.isValidPhoto();
        if (isValid) {
          console.log('🧪 [DEV-MODE] Fake validation passed - taking photo');
          this.manualCapture();
        }
      }, DESKTOP_TESTING_DELAY);
    }
  }

  ngOnDestroy(): void {
    console.log('🚪 [CarpetScanner] Component destroyed');
    this.stopScanning();

    // Clean up photo URL to prevent memory leak
    const photoUrl = this.capturedPhotoUrl();
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }
  }


  // COMMENTED OUT: preventing infinite loops
  // private handleCarpetDetected(data: CarpetRecognitionData): void {
  //   if (this.photoAlreadySaved) {
  //     return;
  //   }
  //   console.log('🎯 [CarpetScanner] Carpet detected - capturing photo');
  //   this.attemptAutoCapture();
  // }

  // Fake photo validation for development
  private async isValidPhoto(): Promise<boolean> {
    console.log('🧪 [DEV-MODE] Validating photo...');
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('🧪 [DEV-MODE] Photo validation complete - VALID');
        resolve(true);
      }, 2000);
    });
  }

  // Manual capture method
  async manualCapture(): Promise<void> {
    if (this.photoAlreadySaved) {
      console.log('🧪 [CarpetScanner] Photo already captured, ignoring');
      return;
    }

    try {
      console.log('🧪 [CarpetScanner] Manual capture triggered');
      this.photoAlreadySaved = true;
      
      // Call carpet service to capture
      await this._carpetService.manualCapture();
      
      // The carpet service will emit the photo data which we can then process
      const data = this.carpetData();
      if (data.capturedPhoto) {
        console.log('🧪 [CarpetScanner] Photo captured, processing check-in');
        this.processCheckIn(data);
      }
    } catch (error) {
      console.error('❌ [CarpetScanner] Manual capture failed:', error);
      this.photoAlreadySaved = false;
    }
  }

  // Re-enable processCheckIn for manual flow
  private processCheckIn(data: any): void {
    console.log('🚀 [CarpetScanner] Processing check-in');
    
    // Stop camera stream
    this.stopCameraStream();
    this.isProcessingCheckIn.set(true);

    // Create carpet photo data and emit
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
    console.log('🛑 [CarpetScanner] Current state:', {
      cameraReady: this.cameraReady(),
      isProcessing: this.isProcessingCheckIn(),
      photoSaved: this.photoAlreadySaved
    });

    // Restore normal page interaction with SSR safety
    this._platform.onlyOnBrowser(() => {
      document.body.classList.remove('scanner-active');
      document.body.style.overflow = '';
    });

    // Stop carpet service (which should stop camera via CameraService)
    console.log('🛑 [CarpetScanner] Calling carpet service stopRecognition...');
    this._carpetService.stopRecognition();

    // Reset component state
    this.cameraReady.set(false);
    this.cameraError.set(null);
    this.photoAlreadySaved = false;

    console.log('🛑 [CarpetScanner] Scanner stop complete - all cleanup done');
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

    console.log('🎯 [CarpetScanner] Status check:', {
      cameraError: this.cameraError(),
      cameraReady: this.cameraReady(),
      isProcessingCheckIn: this.isProcessingCheckIn(),
      photoTaken: data.photoTaken,
      llmProcessing: data.llmProcessing,
      llmCarpetDetected: data.llmCarpetDetected,
      canCheckIn: data.canCheckIn,
      isSharp: data.isSharp
    });

    if (this.cameraError()) {
      return `${CARPET_SCANNER_MESSAGES.CAMERA_ERROR}: ${this.cameraError()}`;
    }

    if (!this.cameraReady()) {
      return CARPET_SCANNER_MESSAGES.STARTING_CAMERA;
    }

    if (this.isProcessingCheckIn()) {
      return 'Processing check-in...';
    }

    if (data.llmProcessing) {
      return CARPET_SCANNER_MESSAGES.ANALYZING_CARPET;
    }

    if (data.photoTaken) {
      return 'Photo captured!';
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

    return CARPET_SCANNER_MESSAGES.POINT_AT_CARPET;
  }


  // COMMENTED OUT: preventing infinite loops
  // private processCheckIn(data: any): void {
  //   console.log('🚀 [CarpetScanner] Processing check-in');
  //   
  //   // Stop camera stream
  //   this.stopCameraStream();
  //   this.isProcessingCheckIn.set(true);

  //   // Create carpet photo data and emit
  //   const carpetPhotoData: CarpetPhotoData = {
  //     blob: data.capturedPhoto,
  //     filename: data.photoFilename || `carpet_${Date.now()}.${data.photoFormat}`,
  //     format: data.photoFormat,
  //     sizeKB: data.photoSizeKB,
  //     metadata: {
  //       edgeCount: data.edgeCount || 0,
  //       blurScore: data.blurScore,
  //       confidence: data.overallConfidence,
  //       orientationAngle: data.orientationAngle
  //     }
  //   };

  //   this.carpetConfirmed.emit(carpetPhotoData);
  // }

}
