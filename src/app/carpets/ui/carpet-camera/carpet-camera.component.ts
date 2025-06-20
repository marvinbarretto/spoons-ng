// src/app/carpets/ui/carpet-camera/carpet-camera.component.ts
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, OnDestroy, signal, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarpetConfidenceConfig } from '../../../check-in/data-access/carpet-confidence-config';
import { EnhancedCarpetRecognitionService } from '../../../check-in/data-access/enhanced-carpet-recognition.service';

export type CarpetCameraResult = {
  success: boolean;
  imageKey?: string;
  confidence?: number;
  cancelled?: boolean;
};

@Component({
  selector: 'app-carpet-camera',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="carpet-camera-overlay">
      <div class="camera-container">
        <!-- Camera Preview -->
        <div class="camera-preview">
          <video #videoElement
                 class="video-stream"
                 autoplay
                 playsinline
                 [class.matched]="isMatched()">
          </video>

          <!-- Viewfinder Overlay -->
          <div class="viewfinder" [class.scanning]="isScanning()" [class.matched]="isMatched()">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>

            @if (isScanning()) {
              <div class="scan-line"></div>
            }
          </div>

          <!-- Status Messages -->
          <div class="status-container">
            @if (!hasStarted()) {
              <div class="status-message">
                <div class="icon">📸</div>
                <h3>Point at the carpet</h3>
                <p>Hold your phone steady for best results</p>
              </div>
            }

            @if (hasStarted() && !isMatched()) {
              <div class="status-message scanning">
                <div class="icon rotating">🔍</div>
                <h3>Scanning for carpet...</h3>
                <p>Confidence: {{ (currentConfidence() * 100).toFixed(0) }}%</p>
                <div class="confidence-bar">
                  <div class="confidence-fill"
                       [style.width.%]="currentConfidence() * 100"
                       [class.high]="currentConfidence() > 0.5">
                  </div>
                </div>
              </div>
            }

            @if (isMatched()) {
              <div class="status-message matched">
                <div class="icon">✅</div>
                <h3>Carpet matched!</h3>
                <p>{{ (currentConfidence() * 100).toFixed(0) }}% confidence</p>
              </div>
            }
          </div>
        </div>

        <!-- Controls -->
        <div class="camera-controls">
          <button class="cancel-button" (click)="cancel()">
            Cancel
          </button>

          @if (isMatched()) {
            <button class="capture-button primary" (click)="capture()">
              Save Carpet Photo
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .carpet-camera-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .camera-container {
      width: 100%;
      max-width: 500px;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .camera-preview {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: #000;
    }

    .video-stream {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: filter 0.3s ease;
    }

    .video-stream.matched {
      filter: brightness(1.1) contrast(1.1);
    }

    /* Viewfinder */
    .viewfinder {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      max-width: 350px;
      aspect-ratio: 1;
      pointer-events: none;
    }

    .corner {
      position: absolute;
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.5);
      transition: all 0.3s ease;
    }

    .viewfinder.scanning .corner {
      border-color: #FFC107;
    }

    .viewfinder.matched .corner {
      border-color: #4CAF50;
      transform: scale(1.1);
    }

    .corner.top-left {
      top: 0;
      left: 0;
      border-right: none;
      border-bottom: none;
    }

    .corner.top-right {
      top: 0;
      right: 0;
      border-left: none;
      border-bottom: none;
    }

    .corner.bottom-left {
      bottom: 0;
      left: 0;
      border-right: none;
      border-top: none;
    }

    .corner.bottom-right {
      bottom: 0;
      right: 0;
      border-left: none;
      border-top: none;
    }

    /* Scan line animation */
    .scan-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg,
        transparent 0%,
        #FFC107 50%,
        transparent 100%);
      animation: scan 2s linear infinite;
    }

    @keyframes scan {
      0% { top: 0; }
      100% { top: 100%; }
    }

    /* Status messages */
    .status-container {
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      text-align: center;
      color: white;
    }

    .status-message {
      background: rgba(0, 0, 0, 0.8);
      border-radius: 12px;
      padding: 20px;
      backdrop-filter: blur(10px);
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .status-message .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }

    .status-message h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .status-message p {
      margin: 0;
      opacity: 0.9;
      font-size: 16px;
    }

    .rotating {
      animation: rotate 1s linear infinite;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Confidence bar */
    .confidence-bar {
      margin-top: 12px;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
    }

    .confidence-fill {
      height: 100%;
      background: #FFC107;
      transition: width 0.3s ease, background-color 0.3s ease;
    }

    .confidence-fill.high {
      background: #4CAF50;
    }

    /* Matched state */
    .status-message.matched {
      border: 2px solid #4CAF50;
      background: rgba(76, 175, 80, 0.1);
    }

    /* Controls */
    .camera-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px;
      background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .cancel-button,
    .capture-button {
      padding: 16px 32px;
      border-radius: 30px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .cancel-button {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      backdrop-filter: blur(10px);
    }

    .cancel-button:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .capture-button {
      background: #4CAF50;
      color: white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .capture-button:hover {
      background: #45a049;
    }

    /* Responsive */
    @media (max-width: 500px) {
      .camera-container {
        max-width: 100%;
      }

      .viewfinder {
        width: 90%;
      }
    }
  `]
})
export class CarpetCameraComponent implements OnDestroy, AfterViewInit {
  @Input() pubId!: string;
  @Output() result = new EventEmitter<CarpetCameraResult>();

  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;

  // Services
  private carpetRecognition = inject(EnhancedCarpetRecognitionService);

  // State
  protected readonly hasStarted = signal(false);
  protected readonly isScanning = signal(false);
  protected readonly isMatched = signal(false);
  protected readonly currentConfidence = signal(0);

  private mediaStream: MediaStream | null = null;
  private detectionInterval: any;
  private capturedCanvas: HTMLCanvasElement | null = null;

  ngAfterViewInit() {
    this.startCamera();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private async startCamera() {
    try {
      console.log('[CarpetCamera] Starting camera...');

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.srcObject = this.mediaStream;

        // Wait for video to be ready
        await new Promise((resolve) => {
          this.videoRef.nativeElement.onloadedmetadata = resolve;
        });

        // Start detection after a brief delay
        setTimeout(() => {
          this.hasStarted.set(true);
          this.startDetection();
        }, 1000);
      }
    } catch (error) {
      console.error('[CarpetCamera] Camera error:', error);
      this.result.emit({ success: false, cancelled: true });
    }
  }

  private startDetection() {
    console.log('[CarpetCamera] Starting carpet detection...');
    this.isScanning.set(true);

    let frameCount = 0;

    this.detectionInterval = setInterval(() => {
      frameCount++;

      // Create canvas for current frame
      const video = this.videoRef.nativeElement;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      // Real carpet recognition
      this.analyzeCurrentFrame().then(confidence => {
        this.currentConfidence.set(confidence);
        
        console.log(`[CarpetCamera] Frame ${frameCount}: confidence ${(confidence * 100).toFixed(1)}%`);

        // Check for match using dynamic threshold
        const threshold = CarpetConfidenceConfig.SIMILARITY_THRESHOLDS.good;
        if (confidence >= threshold) {
          console.log('[CarpetCamera] Carpet matched!');
          this.capturedCanvas = canvas;
          this.isMatched.set(true);
          this.isScanning.set(false);
          clearInterval(this.detectionInterval);
        }
      }).catch(error => {
        console.error('[CarpetCamera] Frame analysis failed:', error);
      });
    }, 600);
  }

  private async analyzeCurrentFrame(): Promise<number> {
    if (!this.videoRef?.nativeElement) {
      return 0;
    }

    try {
      // Use the enhanced carpet recognition service
      const matches = await this.carpetRecognition.analyzeVideoFrame(this.videoRef.nativeElement);
      
      if (matches.length > 0) {
        // Return the best match confidence as a decimal (0-1)
        const bestMatch = matches[0];
        const confidence = bestMatch.confidence / 100;
        
        console.log(`[CarpetCamera] Best match: ${bestMatch.pubName} (${bestMatch.confidence.toFixed(1)}%)`);
        console.log(`[CarpetCamera] Reasoning: ${bestMatch.reasoning.join(', ')}`);
        
        return confidence;
      }
      
      return 0;
    } catch (error) {
      console.error('[CarpetCamera] Analysis failed:', error);
      return 0;
    }
  }

  capture() {
    console.log('[CarpetCamera] Capturing carpet image...');

    if (this.capturedCanvas) {
      // Emit result
      this.result.emit({
        success: true,
        confidence: this.currentConfidence()
      });
    }
  }

  cancel() {
    console.log('[CarpetCamera] Cancelled by user');
    this.result.emit({
      success: false,
      cancelled: true
    });
  }

  private cleanup() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
  }

  // Public method to get the captured canvas
  getCapturedCanvas(): HTMLCanvasElement | null {
    return this.capturedCanvas;
  }
}
