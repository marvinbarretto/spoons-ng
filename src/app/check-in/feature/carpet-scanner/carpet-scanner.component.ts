import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, effect, output } from '@angular/core';
import { BaseComponent } from '@shared/data-access/base.component';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
import { CARPET_RECOGNITION_CONFIG } from '../../data-access/carpet-recognition.config';
import { DecimalPipe } from '@angular/common';
import { CarpetSuccessComponent } from '../../ui/carpet-success/carpet-success.component';
import { CarpetPhotoData } from '../../../shared/data-access/photo-storage.service';

@Component({
  selector: 'app-carpet-scanner',
  templateUrl: './carpet-scanner.component.html',
  styleUrl: './carpet-scanner.component.scss',
  imports: [ CarpetSuccessComponent]
})
export class CarpetScannerComponent extends BaseComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private readonly _carpetService = inject(CarpetRecognitionService);

  // Signals
  protected readonly carpetData = this._carpetService.data;
  protected readonly cameraReady = signal(false);
  protected readonly cameraError = signal<string | null>(null);
  protected readonly showDebug = signal(false);
  protected readonly showSuccessScreen = signal(false);

  // Outputs - now emits structured photo data
  readonly carpetConfirmed = output<CarpetPhotoData>();
  readonly exitScanner = output<void>();

  constructor() {
    super();

    // ✅ Fixed effect - prevent loops with proper guards
    effect(() => {
      const data = this.carpetData();
      const currentlyShowingSuccess = this.showSuccessScreen();

      // ✅ Only show success screen if photo was taken AND we're not already showing it
      if (data.photoTaken && data.capturedPhoto && !currentlyShowingSuccess) {
        console.log('✅ [CarpetScanner] WebP photo captured, showing success screen');
        this.showSuccessScreen.set(true);

        // ✅ Stop scanning immediately but safely
        this.stopScanning();
      }
    });
  }
  override async ngOnInit(): Promise<void> {
    console.log('🎬 [CarpetScanner] Component initializing...');
    await this.startScanning();
  }

  // Success component events
  protected onCarpetConfirmed(): void {
    const data = this.carpetData();

    if (data.capturedPhoto && data.photoFilename && data.photoDisplayUrl) {
      console.log('[CarpetScanner] ✅ Creating CarpetPhotoData object:', {
        filename: data.photoFilename,
        format: data.photoFormat,
        sizeKB: data.photoSizeKB,
        blobSize: data.capturedPhoto.size
      });

      // ✅ Create the complete CarpetPhotoData object
      const carpetPhotoData: CarpetPhotoData = {
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

      console.log('[CarpetScanner] ✅ Emitting CarpetPhotoData:', carpetPhotoData);
      this.carpetConfirmed.emit(carpetPhotoData);

    } else {
      console.error('[CarpetScanner] ❌ Missing required data for CarpetPhotoData:', {
        hasBlob: !!data.capturedPhoto,
        hasFilename: !!data.photoFilename,
        hasDisplayUrl: !!data.photoDisplayUrl
      });
    }
  }


// ✅ REPLACE your stopScanning method with this:
protected stopScanning(): void {
  console.log('🛑 [CarpetScanner] Stopping scanning...');

  // ✅ Prevent multiple calls
  if (!this._carpetService.data().photoTaken) {
    this._carpetService.stopRecognition();
  }
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
    const data = this.carpetData();
    if (data.photoDisplayUrl) {
      URL.revokeObjectURL(data.photoDisplayUrl);
      console.log('[CarpetScanner] 🧹 Cleaned up photo display URL');
    }
    this._carpetService.stopRecognition();
  }
}
