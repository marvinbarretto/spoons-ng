import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, effect, output } from '@angular/core';
import { BaseComponent } from '@shared/data-access/base.component';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
import { CARPET_RECOGNITION_CONFIG } from '../../data-access/carpet-recognition.config';
import { CarpetSuccessComponent } from '../../ui/carpet-success/carpet-success.component';
import { DeviceCarpetStorageService } from '../../../carpets/data-access/device-carpet-storage.service';
import { CarpetPhotoData, PhotoStats } from '@shared/utils/carpet-photo.models';


@Component({
  selector: 'app-carpet-scanner',
  templateUrl: './carpet-scanner.component.html',
  styleUrl: './carpet-scanner.component.scss',
  imports: [ CarpetSuccessComponent]
})
export class CarpetScannerComponent extends BaseComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private readonly _carpetService = inject(CarpetRecognitionService);
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
        console.log('✅ [CarpetScanner] WebP photo captured, showing success screen');
        this.showSuccessScreen.set(true);
        // Camera should already be stopped by autoSaveCarpet() - no need for delayed stop
        console.log('%c*** CAMERA: Success screen shown - camera should already be stopped', 'color: orange; font-weight: bold;');
      }
    });
  }
  override async ngOnInit(): Promise<void> {
    console.log('🎬 [CarpetScanner] Component initializing...');
    await this.startScanning();
  }

    // ✅ NEW: Handle continue from success screen
    protected onContinueScanning(): void {
      console.log('🔄 [CarpetScanner] User chose to continue - exiting scanner');
      this.exitScanner.emit();
    }

    // ✅ NEW: Handle view collection request
    protected onViewCollection(): void {
      console.log('📋 [CarpetScanner] User wants to view collection - navigating to home');
      this.exitScanner.emit();
    }



  private async autoSaveCarpet(data: any): Promise<void> {
    try {
      this.photoAlreadySaved = true; // Prevent duplicate saves

      console.log('💾 [CarpetScanner] === AUTO-SAVING CARPET ===');
      console.log('💾 [CarpetScanner] Photo data:', {
        filename: data.photoFilename,
        format: data.photoFormat,
        sizeKB: data.photoSizeKB,
        blobSize: data.capturedPhoto?.size,
        quality: {
          edges: data.edgeCount,
          blur: data.blurScore,
          confidence: data.overallConfidence
        }
      });

      const photoData: CarpetPhotoData = {
        filename: data.photoFilename,
        format: data.photoFormat,
        sizeKB: data.photoSizeKB,
        blob: data.capturedPhoto,
        metadata: {
          edgeCount: data.edgeCount,
          blurScore: data.blurScore,
          confidence: data.overallConfidence,
          orientationAngle: data.orientationAngle
        }
      };

      // ✅ ADD THIS LINE: Save directly to IndexedDB
      await this.photoStorage.savePhotoFromCarpetData(photoData);
      console.log('✅ [CarpetScanner] Photo saved to IndexedDB database');

      // 🎥 STOP CAMERA IMMEDIATELY - photo captured and saved
      console.log('%c*** CAMERA: 🚨 AUTO-SAVE COMPLETE - STOPPING CAMERA NOW 🚨', 'color: red; font-weight: bold; font-size: 14px;');
      this.stopScanning();
      
      // TODO: Do we still need this event?
      console.log('📤 [CarpetScanner] Emitting carpetConfirmed event...');
      this.carpetConfirmed.emit(photoData);
      console.log('✅ [CarpetScanner] Carpet auto-saved and event emitted!');

      // ✅ Show success message
      setTimeout(() => {
        console.log('🎉 [CarpetScanner] Auto-save complete - photo saved to collection');
      }, 1000);

    } catch (error) {
      console.error('❌ [CarpetScanner] Auto-save failed:', error);
      this.photoAlreadySaved = false; // Allow retry
    }
  }

  // Success component events
  protected onCarpetConfirmed(): void {
    console.log('🔥 [CarpetScanner] === CARPET CONFIRMED BY USER ===');
    console.log('🔥 [CarpetScanner] Button clicked - about to emit event');

    const data = this.carpetData();
    console.log('🔥 [CarpetScanner] Current carpet data:', {
      photoTaken: data.photoTaken,
      hasBlob: !!data.capturedPhoto,
      blobSize: data.capturedPhoto?.size,
      filename: data.photoFilename
    });

    if (data.capturedPhoto && data.photoFilename) {
      const photoData: CarpetPhotoData = {
        filename: data.photoFilename,
        format: data.photoFormat,
        sizeKB: data.photoSizeKB,
        blob: data.capturedPhoto,
        metadata: {
          edgeCount: data.edgeCount,
          blurScore: data.blurScore,
          confidence: data.overallConfidence,
          orientationAngle: data.orientationAngle
        }
      };

      console.log('🔥 [CarpetScanner] About to emit carpetConfirmed with:', photoData);
      this.carpetConfirmed.emit(photoData);
      console.log('🔥 [CarpetScanner] carpetConfirmed event emitted!');
    }
  }


// ✅ REPLACE your stopScanning method with this:
protected stopScanning(): void {
  console.log('%c*** CAMERA: [CarpetScanner] stopScanning() called', 'color: red; font-weight: bold;');
  
  const data = this._carpetService.data();
  console.log('%c*** CAMERA: Current state - photoTaken:', 'color: red; font-weight: bold;', data.photoTaken);

  // ✅ Always stop recognition - regardless of photo state
  console.log('%c*** CAMERA: Calling _carpetService.stopRecognition()...', 'color: red; font-weight: bold;');
  this._carpetService.stopRecognition();
  
  console.log('%c*** CAMERA: [CarpetScanner] stopScanning() complete', 'color: red; font-weight: bold;');
}

// ✅ REPLACE your onScanAgain method with this:
protected onScanAgain(): void {
  console.log('[CarpetSuccess] 🔄 User wants to scan again');

  // ✅ Reset everything properly
  this._carpetService.resetCapture();
  this.showSuccessScreen.set(false);

  // ✅ Restart scanning after a brief delay
  setTimeout(() => {
    this.startScanning();
  }, 100);
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

    try {
      this.cameraError.set(null);

      // Get high-resolution camera stream for better photo quality
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: CARPET_RECOGNITION_CONFIG.photo.maxWidth },
          height: { ideal: CARPET_RECOGNITION_CONFIG.photo.maxHeight }
        }
      });

      console.log('📹 [CarpetScanner] Camera stream obtained');

      // Set up video element
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
        await this.videoElement.nativeElement.play();
        this.cameraReady.set(true);
        console.log('📹 [CarpetScanner] Video element ready');
      }

      // Start recognition
      await this._carpetService.startRecognition();
      console.log('✅ [CarpetScanner] Recognition started');

    } catch (error: any) {
      console.error('❌ [CarpetScanner] Camera error:', error);
      this.handleCameraError(error);
    }
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
      return `❌ ${this.cameraError()}`;
    }

    if (!this.cameraReady()) {
      return 'Starting camera...';
    }

    if (data.photoTaken) {
      return `✅ Perfect! ${data.photoFormat.toUpperCase()} captured (${data.photoSizeKB}KB)`;
    }

    if (data.canCheckIn && !data.isSharp) {
      return '📷 Hold steady... capturing WebP photo';
    }

    if (data.canCheckIn) {
      return '✅ Carpet detected! Capturing...';
    }

    const hasGoodOrientation = data.isPhoneDown && data.orientationConfidence > CARPET_RECOGNITION_CONFIG.orientation.minConfidence;
    const hasGoodTexture = (data.edgeCount || 0) > CARPET_RECOGNITION_CONFIG.texture.edgeThreshold;

    if (!hasGoodOrientation && !hasGoodTexture) {
      return '📱 Point your phone down at the carpet';
    }

    if (!hasGoodOrientation) {
      return '📱 Angle the phone more toward the ground';
    }

    if (!hasGoodTexture) {
      return `🔍 Scanning edges... ${data.edgeCount || 0}`;
    }

    return '🔍 Analyzing...';
  }

  ngOnDestroy(): void {
    console.log('💀 [CarpetScanner] Component destroying...');

    // Clean up photo display URL
    const currentData = this.carpetData();
    if (currentData.photoDisplayUrl) {
      URL.revokeObjectURL(currentData.photoDisplayUrl);
      console.log('[CarpetScanner] 🧹 Cleaned up photo display URL');
    }

    // Reset save state
    this.photoAlreadySaved = false;

    // Stop recognition
    this._carpetService.stopRecognition();
  }
}
