import { Component, inject, OnDestroy, signal, ElementRef, ViewChild } from '@angular/core';
import { BaseComponent } from '@shared/data-access/base.component';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-carpet-scanner',
  templateUrl: './carpet-scanner.component.html',
  styleUrl: './carpet-scanner.component.scss',
  imports: [ DecimalPipe ]
})
export class CarpetScannerComponent extends BaseComponent implements OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private readonly _carpetService = inject(CarpetRecognitionService);

  protected readonly carpetData = this._carpetService.data;
  protected readonly isScanning = signal(false);
  protected readonly cameraReady = signal(false);
  protected readonly showDebug = signal(false);


  protected toggleDebug(): void {
    this.showDebug.set(!this.showDebug());
  }

  protected async startScanning(): Promise<void> {
    this.isScanning.set(true);

    try {
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
      this.isScanning.set(false);
    }
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

    if (!this.isScanning()) return 'Ready to scan';
    if (!this.cameraReady()) return 'Starting camera...';

    if (data.canCheckIn) {
      return '✅ Carpet detected! Ready to check in';
    }

    if (!data.isPhoneDown) {
      return '📱 Point your phone down at the carpet';
    }

    return '🔍 Analyzing carpet texture...';
  }

  ngOnDestroy(): void {
    this.stopScanning();
  }
}
