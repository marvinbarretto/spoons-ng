// src/app/check-in/feature/carpet-checkin/carpet-checkin.component.ts
import { Component, ViewChild, ElementRef, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@shared/data-access/base.component';
import { CheckinStore } from '../../data-access/check-in.store';
import { DynamicCarpetMatcher } from '../../../carpets/data-access/dynamic-carpet-matcher.service';
import { CarpetCheckInIntegration } from '../../../carpets/data-access/carpet-checkin-integration.service';

@Component({
  selector: 'app-carpet-checkin',
  imports: [CommonModule],
  template: `
    <div class="carpet-checkin">

      <!-- Camera View -->
      <div class="camera-container">
        <video
          #videoElement
          class="camera-video"
          autoplay
          playsinline
          muted>
        </video>

        <!-- Carpet Detection Overlay -->
        <div class="detection-overlay">

          @if (carpetMatcher.currentMatch(); as match) {
            <div class="carpet-status" [class.match]="match.isMatch" [class.no-match]="!match.isMatch">

              @if (match.isMatch) {
                <div class="carpet-found">
                  <span class="icon">🎯</span>
                  <div class="info">
                    <div class="message">Carpet Detected!</div>
                    <div class="confidence">{{ match.confidence }}% confident</div>
                    <div class="instruction">Ready for check-in</div>
                  </div>
                </div>
              } @else {
                <div class="carpet-searching">
                  <span class="icon">👀</span>
                  <div class="info">
                    <div class="message">Look for the carpet...</div>
                    <div class="confidence">{{ match.confidence }}% match</div>
                  </div>
                </div>
              }
            </div>
          }

          @if (carpetIntegration.isCapturing()) {
            <div class="capturing">
              <div class="pulse"></div>
              <span>Capturing carpet photo...</span>
            </div>
          }
        </div>

        <!-- Check-In Controls -->
        <div class="checkin-controls">
          <button
            class="checkin-btn"
            [disabled]="!canCheckIn() || checkInStore.loading()"
            (click)="performCarpetCheckIn()"
            [class.ready]="carpetMatcher.isMatch()">

            @if (checkInStore.loading()) {
              <span class="spinner"></span>
              <span>Checking in...</span>
            } @else if (carpetMatcher.isMatch()) {
              <span>✅ Check In with Carpet Photo</span>
            } @else {
              <span>📍 Check In (No Carpet)</span>
            }
          </button>

          @if (lastCarpetPhoto()) {
            <div class="carpet-preview">
              <img [src]="lastCarpetPhoto()" alt="Captured carpet" class="preview-image">
              <span class="preview-label">Carpet captured!</span>
            </div>
          }
        </div>
      </div>

      <!-- Success Overlay -->
      @if (checkInStore.checkinSuccess()) {
        <div class="success-overlay">
          <div class="success-content">
            <h2>🎉 Check-in Complete!</h2>

            @if (lastCarpetPhoto()) {
              <div class="carpet-success">
                <img [src]="lastCarpetPhoto()" alt="Your carpet photo" class="success-carpet">
                <p>Carpet photo captured and saved!</p>
              </div>
            }

            <div class="points-earned">
              <span class="points">{{ checkInStore.checkinSuccess()?.pointsEarned || 0 }} points</span>
              @if (lastCarpetPhoto()) {
                <span class="bonus">+5 carpet bonus!</span>
              }
            </div>

            <button (click)="closeSuccess()" class="close-btn">
              Continue
            </button>
          </div>
        </div>
      }

      <!-- Debug Panel -->
      @if (showDebug()) {
        <div class="debug-panel">
          <h3>Debug Info</h3>
          <div class="debug-stats">
            <div>Carpet Confidence: {{ carpetMatcher.currentMatch()?.confidence || 0 }}%</div>
            <div>References Loaded: {{ carpetMatcher.loadedReferences().length }}</div>
            <div>Can Check In: {{ canCheckIn() }}</div>
          </div>

          @if (carpetMatcher.currentMatch()?.reasoning; as reasoning) {
            <div class="debug-reasoning">
              <h4>Analysis:</h4>
              <ul>
                @for (reason of reasoning; track reason) {
                  <li>{{ reason }}</li>
                }
              </ul>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .carpet-checkin {
      position: relative;
      height: 100vh;
      background: #000;
    }

    .camera-container {
      position: relative;
      height: 100%;
    }

    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .detection-overlay {
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      z-index: 10;
    }

    .carpet-status {
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 16px;
      border-radius: 12px;
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }

    .carpet-status.match {
      border-color: #00ff00;
      background: rgba(0,255,0,0.15);
      animation: pulse-green 2s infinite;
    }

    .carpet-status.no-match {
      border-color: #ff9500;
      background: rgba(255,149,0,0.15);
    }

    .carpet-found, .carpet-searching {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .carpet-found .icon, .carpet-searching .icon {
      font-size: 24px;
    }

    .carpet-found .message {
      font-size: 18px;
      font-weight: bold;
      color: #00ff00;
    }

    .carpet-searching .message {
      font-size: 16px;
      font-weight: bold;
      color: #ff9500;
    }

    .confidence {
      font-size: 14px;
      opacity: 0.8;
    }

    .instruction {
      font-size: 14px;
      color: #00ff00;
      font-weight: bold;
    }

    .capturing {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0,150,255,0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 10px;
    }

    .pulse {
      width: 12px;
      height: 12px;
      background: #fff;
      border-radius: 50%;
      animation: pulse 1s infinite;
    }

    .checkin-controls {
      position: absolute;
      bottom: 30px;
      left: 20px;
      right: 20px;
      z-index: 10;
    }

    .checkin-btn {
      width: 100%;
      padding: 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .checkin-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .checkin-btn.ready {
      background: #28a745;
      box-shadow: 0 0 20px rgba(40,167,69,0.5);
      animation: pulse-ready 2s infinite;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .carpet-preview {
      margin-top: 12px;
      text-align: center;
    }

    .preview-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      border: 2px solid #00ff00;
    }

    .preview-label {
      display: block;
      margin-top: 4px;
      color: white;
      font-size: 12px;
    }

    .success-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-content {
      background: white;
      padding: 30px;
      border-radius: 16px;
      text-align: center;
      max-width: 300px;
      width: 90%;
    }

    .success-content h2 {
      margin: 0 0 20px 0;
      color: #28a745;
    }

    .carpet-success {
      margin: 20px 0;
    }

    .success-carpet {
      width: 120px;
      height: 120px;
      border-radius: 12px;
      border: 3px solid #28a745;
      margin-bottom: 10px;
    }

    .points-earned {
      margin: 20px 0;
    }

    .points {
      font-size: 24px;
      font-weight: bold;
      color: #007bff;
    }

    .bonus {
      display: block;
      font-size: 14px;
      color: #28a745;
      margin-top: 4px;
    }

    .close-btn {
      padding: 12px 24px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
    }

    .debug-panel {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-size: 12px;
      max-width: 300px;
    }

    .debug-stats div {
      margin-bottom: 5px;
    }

    .debug-reasoning {
      margin-top: 10px;
    }

    .debug-reasoning ul {
      margin: 5px 0;
      padding-left: 15px;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes pulse-green {
      0%, 100% { box-shadow: 0 0 10px rgba(0,255,0,0.3); }
      50% { box-shadow: 0 0 20px rgba(0,255,0,0.6); }
    }

    @keyframes pulse-ready {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class CarpetCheckInComponent extends BaseComponent {
  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;

  protected readonly checkInStore = inject(CheckinStore);
  protected readonly carpetMatcher = inject(DynamicCarpetMatcher);
  protected readonly carpetIntegration = inject(CarpetCheckInIntegration);

  // Local state
  private readonly _stream = signal<MediaStream | null>(null);
  private readonly _showDebug = signal(false);
  private readonly _analysisInterval = signal<ReturnType<typeof setInterval> | null>(null);
  private readonly _pubId = signal<string>('test-pub-id'); // Get from route params

  // Computed state
  readonly showDebug = this._showDebug.asReadonly();
  readonly lastCarpetPhoto = this.carpetIntegration.lastCaptureResult;

  constructor() {
    super();

    // Start carpet analysis when component loads
    effect(() => {
      if (this.videoRef?.nativeElement) {
        this.startCarpetAnalysis();
      }
    });
  }

  protected override onInit(): void {
    this.initCamera();
  }

   onDestroy(): void {
    this.stopCarpetAnalysis();
    this.stopCamera();
  }

  private async initCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      });

      this._stream.set(stream);

      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = stream;
          console.log('[CarpetCheckIn] ✅ Camera connected');
        }
      }, 100);

    } catch (error) {
      console.error('[CarpetCheckIn] ❌ Camera access failed:', error);
    }
  }

  private stopCamera(): void {
    const stream = this._stream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this._stream.set(null);
    }
  }

  private startCarpetAnalysis(): void {
    // Analyze carpet every 800ms
    const interval = setInterval(() => {
      if (this.videoRef?.nativeElement) {
        this.carpetMatcher.matchFrame(this.videoRef.nativeElement, 65);
      }
    }, 800);

    this._analysisInterval.set(interval);
  }

  private stopCarpetAnalysis(): void {
    const interval = this._analysisInterval();
    if (interval) {
      clearInterval(interval);
      this._analysisInterval.set(null);
    }
  }

  async performCarpetCheckIn(): Promise<void> {
    if (!this.canCheckIn()) return;

    const videoElement = this.videoRef?.nativeElement;
    if (!videoElement) return;

    try {
      // 1. Capture carpet photo to device (if detected)
      const carpetResult = await this.carpetIntegration.captureForCheckIn(
        videoElement,
        this._pubId(),
        'Test Pub Name', // Get from pub store
        { lat: 51.6565, lng: -0.3973 } // Get from location service
      );

      // 2. Perform regular check-in (no photo upload to server)
      await this.checkInStore.checkinToPub(this._pubId(), null);

      // 3. Add carpet bonus points if detected
      if (carpetResult.carpetDetected) {
        console.log(`🎯 Carpet check-in! +${carpetResult.bonusPoints} bonus points`);
        // Trigger bonus points in your points system
      }

      // 4. Optional: Show storage stats in debug
      const stats = this.carpetIntegration.getUserCarpetStats();
      console.log(`📊 Carpet collection: ${stats.totalCarpets} photos, ${stats.storageUsed}`);

    } catch (error) {
      console.error('[CarpetCheckIn] ❌ Check-in failed:', error);
    }
  }

  canCheckIn(): boolean {
    return this.checkInStore.canCheckInToday(this._pubId());
  }

  closeSuccess(): void {
    this.checkInStore.clearCheckinSuccess();
  }

  toggleDebug(): void {
    this._showDebug.set(!this._showDebug());
  }
}
