import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit } from '@angular/core';
import { BaseComponent } from '@shared/data-access/base.component';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-carpet-scanner',
  templateUrl: './carpet-scanner.component.html',
  styleUrl: './carpet-scanner.component.scss',
  imports: [ DecimalPipe ]
})
export class CarpetScannerComponent extends BaseComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private readonly _carpetService = inject(CarpetRecognitionService);

  protected readonly carpetData = this._carpetService.data;
  protected readonly isScanning = signal(false);
  protected readonly cameraReady = signal(false);
  protected readonly showDebug = signal(false);
  protected readonly cameraError = signal<string | null>(null);

  override async ngOnInit(): Promise<void> {
    await this.startScanning();
  }

  protected toggleDebug(): void {
    this.showDebug.set(!this.showDebug());
  }

  async startScanning(): Promise<void> {
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
    this.isScanning.set(false);
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

    if (data.canCheckIn) {
      return '✅ Carpet detected! Ready to check in';
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
      return `🔍 Looking for carpet texture... (edges: ${data.edgeCount || 0})`;
    }

    return '🔍 Analyzing...';
  }

  ngOnDestroy(): void {
    this.stopScanning();
  }
}
