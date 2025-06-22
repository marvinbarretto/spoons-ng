import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, effect, output } from '@angular/core';
import { BaseComponent } from '@shared/data-access/base.component';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
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

  // ✅ Add missing signals and getters
  protected readonly carpetData = this._carpetService.data;
  protected readonly cameraReady = signal(false);
  protected readonly cameraError = signal<string | null>(null);
  protected readonly showDebug = signal(false);
  protected readonly showSuccessScreen = signal(false);

  readonly carpetConfirmed = output<string>(); // Base64 image data

  constructor() {
    super();

    // Auto-show success screen when photo is captured
    effect(() => {
      const data = this.carpetData();
      if (data.photoTaken && data.capturedPhoto) {
        this.showSuccessScreen.set(true);
        // Auto-stop scanning to save battery
        setTimeout(() => this.stopScanning(), 1000);
      }
    });
  }

  override async ngOnInit(): Promise<void> {
    await this.startScanning();
  }

  // ✅ Handle success component events
  protected onCarpetConfirmed(): void {
    const photo = this.carpetData().capturedPhoto;
    if (photo) {
      this.carpetConfirmed.emit(photo);
    }
  }

  protected onScanAgain(): void {
    this._carpetService.resetCapture();
    this.showSuccessScreen.set(false);
    this.startScanning();
  }

  protected toggleDebug(): void {
    this.showDebug.set(!this.showDebug());
  }

  protected async startScanning(): Promise<void> {
    try {
      this.cameraError.set(null);

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Set up video element
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play();
        this.cameraReady.set(true);
      }

      // Start recognition
      await this._carpetService.startRecognition();

    } catch (error: any) {
      console.error('Camera error:', error);
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

    this.cameraError.set(errorMessage);
  }

  protected stopScanning(): void {
    this.cameraReady.set(false);
    this._carpetService.stopRecognition();

    // Stop video stream
    if (this.videoElement?.nativeElement?.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
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

    const hasGoodOrientation = data.isPhoneDown && data.orientationConfidence > 0.6;
    const hasGoodTexture = (data.edgeCount || 0) > 800;

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
    this.stopScanning();
  }
}
