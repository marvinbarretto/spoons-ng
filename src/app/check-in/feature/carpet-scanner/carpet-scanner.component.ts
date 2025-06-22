import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, effect, output } from '@angular/core';
import { BaseComponent } from '@shared/data-access/base.component';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
import { CARPET_RECOGNITION_CONFIG } from '../../data-access/carpet-recognition.config';
import { DecimalPipe } from '@angular/common';
import { CarpetSuccessComponent } from '../../ui/carpet-success/carpet-success.component';

@Component({
  selector: 'app-carpet-scanner',
  templateUrl: './carpet-scanner.component.html',
  styleUrl: './carpet-scanner.component.scss',
  imports: [DecimalPipe, CarpetSuccessComponent]
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

  // Outputs
  readonly carpetConfirmed = output<string>(); // Base64 image data
  readonly exitScanner = output<void>();

  constructor() {
    super();

    // Auto-show success screen when photo is captured
    effect(() => {
      const data = this.carpetData();
      if (data.photoTaken && data.capturedPhoto) {
        console.log('✅ [CarpetScanner] Photo captured, showing success screen');
        this.showSuccessScreen.set(true);
        // Auto-stop scanning to save battery
        setTimeout(() => this.stopScanning(), 1000);
      }
    });
  }

  override async ngOnInit(): Promise<void> {
    console.log('🎬 [CarpetScanner] Component initializing...');
    await this.startScanning();
  }

  // Success component events
  protected onCarpetConfirmed(): void {
    console.log('✅ [CarpetScanner] Carpet confirmed by user');
    const photo = this.carpetData().capturedPhoto;
    if (photo) {
      this.carpetConfirmed.emit(photo);
    }
  }

  protected async onScanAgain(): Promise<void> {
    console.log('🔄 [CarpetScanner] Scan again requested');

    // Reset state
    this._carpetService.resetCapture();
    this.showSuccessScreen.set(false);
    this.cameraError.set(null);

    // Wait a bit for cleanup
    setTimeout(async () => {
      console.log('🔄 [CarpetScanner] Restarting scanner...');
      await this.startScanning();
    }, 500);
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
    console.log('🎬 [CarpetScanner] Starting scanning...');

    try {
      this.cameraError.set(null);

      // Get camera stream
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

  protected stopScanning(): void {
    console.log('🛑 [CarpetScanner] Stopping scanning...');

    this.cameraReady.set(false);
    this._carpetService.stopRecognition();

    // Stop video stream
    if (this.videoElement?.nativeElement?.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        console.log(`🔇 [CarpetScanner] Stopping video track: ${track.kind}`);
        track.stop();
      });
      this.videoElement.nativeElement.srcObject = null;
    }
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
      return '✅ Perfect! Carpet photographed';
    }

    if (data.canCheckIn && !data.isSharp) {
      return '📷 Hold steady... capturing photo';
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
    this.stopScanning();
  }
}
