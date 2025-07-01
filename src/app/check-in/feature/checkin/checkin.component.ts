import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@shared/base/base.component';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { CarpetRecognitionService } from '../../data-access/carpet-recognition.service';
import { CARPET_RECOGNITION_CONFIG } from '../../data-access/carpet-recognition.config';
import { ACTIVE_DEVELOPMENT_MODE } from '@shared/utils/dev-mode.constants';
import { CommonModule } from '@angular/common';

// State machine phases
type CheckinPhase =
  | 'CAMERA_STARTING'
  | 'WAITING_FOR_GATES'
  | 'PHOTO_CAPTURED'
  | 'LLM_THINKING'
  | 'CHECK_IN_PROCESSING'
  | 'SUCCESS_MODAL';

@Component({
  selector: 'app-checkin',
  imports: [CommonModule],
  template: `
    <div class="checkin-container">

      <!-- Camera View -->
      @if (currentPhase() === 'CAMERA_STARTING' || currentPhase() === 'WAITING_FOR_GATES') {
        <video #videoElement
               class="camera-view"
               playsinline
               muted
               autoplay>
        </video>
      }

      <!-- Blurred Background (after photo captured) -->
      @if (capturedPhotoUrl()) {
        <div class="blurred-background"
             [style.background-image]="'url(' + capturedPhotoUrl() + ')'">
        </div>
      }

      <!-- Status Overlay -->
      <div class="status-overlay">
        <div class="status-content">

          <!-- Phase-specific content -->
          @switch (currentPhase()) {

            @case ('CAMERA_STARTING') {
              <div class="status-message">Starting camera...</div>
            }

            @case ('WAITING_FOR_GATES') {
              <div class="status-message">Point at the carpet</div>
              <div class="gates-status">
                <!-- Core gates -->
                <div class="gate" [class.passed]="gatesPassed().orientation">📱 Orientation: {{ (carpetData().orientationConfidence || 0) | number:'1.2-2' }}</div>
                <div class="gate" [class.passed]="gatesPassed().stable">⚖️ Device Stable: {{ carpetData().deviceStable ? 'YES' : 'NO' }}</div>
                
                <!-- Multiple carpet detection experiments -->
                <div class="gate experimental" [class.passed]="gatesPassed().varianceIntensity">🔬 Variance Intensity: {{ carpetData().varianceIntensity || 0 }}</div>
                <div class="gate experimental">🧵 Fiber Direction: {{ carpetData().fiberDirection || 0 }}</div>
                <div class="gate experimental winner" [class.passed]="gatesPassed().colorComplexity">🌈 Color Complexity: {{ carpetData().colorComplexity || 0 }} ⭐</div>
                <div class="gate experimental" [class.passed]="gatesPassed().frequencyAnalysis">📊 Frequency Analysis: {{ carpetData().frequencyAnalysis || 0 }}%</div>
                <div class="gate experimental">🔍 Local Contrast: {{ carpetData().localContrast || 0 }}</div>
                <div class="gate experimental">📐 Gradient Density: {{ carpetData().gradientDensity || 0 }}%</div>
                <div class="gate experimental broken">⚖️ Texture Uniformity: {{ carpetData().textureUniformity || 0 }}%</div>
                
                <!-- Original metrics for comparison -->
                <div class="gate original">🎨 Pattern Density: {{ ((carpetData().textureRatio || 0) * 100) | number:'1.0-0' }}%</div>
                <div class="gate original">🔧 Texture Coherence: {{ carpetData().edgeCount || 0 }}</div>
              </div>
              @if (allGatesPassed()) {
                <button class="capture-btn" (click)="capturePhoto()">
                  All conditions met - Take Photo
                </button>
              }
            }

            @case ('PHOTO_CAPTURED') {
              <div class="status-message">Photo captured! Processing...</div>
            }

            @case ('LLM_THINKING') {
              <div class="status-message">AI is thinking...</div>
              <div class="thinking-spinner">🤖</div>
            }

            @case ('CHECK_IN_PROCESSING') {
              <div class="status-message">Checking in to {{ pubName() }}...</div>
            }

            @case ('SUCCESS_MODAL') {
              <div class="success-modal">
                <h2>Check-in Successful!</h2>
                <p>Welcome to {{ pubName() }}</p>
                <div class="success-details">
                  <div>Points earned: {{ pointsEarned() }}</div>
                  <div>Badges earned: {{ badgesEarned().length }}</div>
                </div>
                <button class="exit-btn" (click)="exitToHomepage()">
                  Continue
                </button>
              </div>
            }
          }

        </div>
      </div>

      <!-- Development Mode Warning -->
      @if (ACTIVE_DEVELOPMENT_MODE) {
        <div class="dev-mode-warning">
          🚨 DEVELOPMENT MODE ACTIVE
        </div>
      }

      <!-- Debug Info -->
      <div class="debug-info">
        <div>Phase: {{ currentPhase() }}</div>
        <div>Pub: {{ pubName() }}</div>
        @if (ACTIVE_DEVELOPMENT_MODE) {
          <div>🚨 DEV MODE ON</div>
        }
      </div>

      <!-- Exit Button (always available) -->
      <button class="exit-button" (click)="exitToHomepage()">
        Exit
      </button>

    </div>
  `,
  styles: `
    .checkin-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      color: white;
    }

    .camera-view {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .blurred-background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      filter: blur(10px);
    }

    .status-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
    }

    .status-content {
      text-align: center;
      padding: 2rem;
    }

    .status-message {
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }

    .gates-status {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .gate {
      padding: 0.5rem;
      background: rgba(255, 0, 0, 0.3);
      border-radius: 4px;
    }

    .gate.passed {
      background: rgba(0, 255, 0, 0.3);
    }

    .gate.experimental {
      background: rgba(255, 165, 0, 0.2);
      border-left: 3px solid orange;
      font-size: 0.9rem;
    }

    .gate.original {
      background: rgba(0, 123, 255, 0.2);
      border-left: 3px solid blue;
    }

    .gate.winner {
      background: rgba(255, 215, 0, 0.3) !important;
      border-left: 3px solid gold !important;
      font-weight: bold;
    }

    .gate.broken {
      background: rgba(128, 128, 128, 0.2) !important;
      border-left: 3px solid gray !important;
      opacity: 0.6;
    }

    .capture-btn, .exit-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1.1rem;
      cursor: pointer;
      margin: 0.5rem;
    }

    .success-modal {
      background: rgba(0, 0, 0, 0.9);
      padding: 2rem;
      border-radius: 12px;
      max-width: 400px;
    }

    .success-details {
      margin: 1rem 0;
    }

    .thinking-spinner {
      font-size: 3rem;
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .dev-mode-warning {
      position: absolute;
      top: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: bold;
      font-size: 0.9rem;
      z-index: 1000;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .debug-info {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .exit-button {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255, 0, 0, 0.7);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
  `
})
export class CheckinComponent extends BaseComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly checkinStore = inject(CheckInStore);
  private readonly pubStore = inject(PubStore);
  private readonly _carpetService = inject(CarpetRecognitionService);

  // State
  protected readonly currentPhase = signal<CheckinPhase>('CAMERA_STARTING');
  protected readonly pubId = signal<string | null>(null);
  protected readonly capturedPhotoUrl = signal<string | null>(null);

  // Real carpet recognition data
  protected readonly carpetData = this._carpetService.data;

  // Results
  protected readonly pointsEarned = signal(0);
  protected readonly badgesEarned = signal<any[]>([]);

  // Constants
  protected readonly ACTIVE_DEVELOPMENT_MODE = ACTIVE_DEVELOPMENT_MODE;

  // Computed
  protected readonly pubName = () => {
    const id = this.pubId();
    return id ? this.pubStore.get(id)?.name || 'Unknown Pub' : 'Unknown Pub';
  };

  protected readonly gatesPassed = computed(() => {
    const data = this.carpetData();
    const config = CARPET_RECOGNITION_CONFIG;

    return {
      edges: (data.edgeCount || 0) > config.texture.edgeThreshold,
      orientation: (data.orientationConfidence || 0) > config.orientation.minConfidence,
      stable: data.deviceStable || false,
      sharp: (data.blurScore || 0) > config.blur.sharpnessThreshold,
      // New carpet-specific gates based on real data
      colorComplexity: (data.colorComplexity || 0) > config.carpetMetrics.colorComplexity,
      varianceIntensity: (data.varianceIntensity || 0) > config.carpetMetrics.varianceIntensity,
      frequencyAnalysis: (data.frequencyAnalysis || 0) > config.carpetMetrics.frequencyAnalysis
    };
  });

  protected readonly allGatesPassed = computed(() => {
    const gates = this.gatesPassed();
    // Use the best-performing metrics: Color Complexity as primary + orientation/stable
    return gates.colorComplexity && gates.orientation && gates.stable;
  });

  // Camera stream
  private stream: MediaStream | null = null;
  private gateMonitoringInterval: number | null = null;

  constructor() {
    super();
    console.log('[Checkin] 🎬 Component initialized');
  }

  override ngOnInit(): void {
    const pubIdParam = this.route.snapshot.paramMap.get('pubId');

    if (!pubIdParam) {
      console.log('[Checkin] ❌ No pub ID provided, navigating to homepage');
      this.router.navigate(['/']);
      return;
    }

    this.pubId.set(pubIdParam);
    console.log('[Checkin] 🚀 Starting check-in for pub:', pubIdParam);

    this.startCamera();
  }

  ngOnDestroy(): void {
    console.log('[Checkin] 🚪 Component destroyed');
    this.cleanup();
  }

  private async startCamera(): Promise<void> {
    console.log('[Checkin] 📹 Starting camera...');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        await this.videoElement.nativeElement.play();
        console.log('[Checkin] 📹 Camera started successfully');

        this.currentPhase.set('WAITING_FOR_GATES');
        this.startGateMonitoring();
      }
    } catch (error) {
      console.error('[Checkin] ❌ Camera failed:', error);
    }
  }

  private startGateMonitoring(): void {
    console.log('[Checkin] 🚦 Starting real gate monitoring via CarpetRecognitionService');

    // Start the carpet recognition service for real camera analysis
    this._carpetService.startRecognition();

    // Dev mode shortcut - still check gates but faster timeout
    if (this.ACTIVE_DEVELOPMENT_MODE) {
      setTimeout(() => {
        console.log('[Checkin] 🧪 DEV MODE: Checking gates after 2 seconds');
        if (this.allGatesPassed()) {
          console.log('[Checkin] 🧪 DEV MODE: All gates passed! Auto-capturing photo');
          this.capturePhoto();
        }
      }, 2000);
    }

    // Monitor real gate status using computed signal
    this.gateMonitoringInterval = window.setInterval(() => {
      const gates = this.gatesPassed();
      console.log('[Checkin] 🚦 Real gates status:', gates);

      // Auto-trigger photo capture when all gates pass
      if (this.allGatesPassed()) {
        console.log('[Checkin] startGateMonitoring() - ✅ ALL GATES PASSED! Auto-capturing photo');

        // Stop gate monitoring since we're moving to next phase
        if (this.gateMonitoringInterval) {
          clearInterval(this.gateMonitoringInterval);
          this.gateMonitoringInterval = null;
          console.log('[Checkin] startGateMonitoring() - 🛑 Gate monitoring stopped');
        }

        this.capturePhoto();
      }
    }, 1000);
  }

  protected capturePhoto(): void {
    console.log('[Checkin] capturePhoto() - 📸 Photo capture triggered');

    if (!this.videoElement?.nativeElement) return;

    // Stop camera immediately
    this.stopCamera();

    // Create fake photo URL (in real implementation, capture from video)
    const canvas = document.createElement('canvas');
    const video = this.videoElement.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const photoUrl = canvas.toDataURL('image/jpeg');
      this.capturedPhotoUrl.set(photoUrl);
      console.log('[Checkin] capturePhoto() - 📸 Photo captured, camera stopped');
      console.log('[Checkin] capturePhoto() - 🖼️ Background set to blurred snapshot');
    }

    this.currentPhase.set('PHOTO_CAPTURED');

    // Move to LLM thinking phase
    console.log('[Checkin] capturePhoto() - ⏰ Moving to LLM analysis in 500ms');
    setTimeout(() => {
      this.startLLMAnalysis();
    }, 500);
  }

  private startLLMAnalysis(): void {
    console.log('[Checkin] startLLMAnalysis() - 🤖 LLM analysis started');
    console.log('[Checkin] startLLMAnalysis() - 💭 Showing "thinking" message');

    this.currentPhase.set('LLM_THINKING');

    // Simulate LLM response
    setTimeout(() => {
      const confidence = 0.85; // High confidence
      console.log('[Checkin] startLLMAnalysis() - 🤖 LLM response: confidence=' + confidence);

      if (confidence > 0.7) {
        this.executeCheckin();
      } else {
        console.log('[Checkin] ❌ Low confidence, aborting check-in');
        this.exitToHomepage();
      }
    }, 3000);
  }

  private executeCheckin(): void {
    console.log('[Checkin] ✅ High confidence - executing check-in');
    this.currentPhase.set('CHECK_IN_PROCESSING');

    const pubId = this.pubId();
    if (!pubId) return;

    // Simulate check-in processing
    setTimeout(() => {
      // Fake results
      this.pointsEarned.set(25);
      this.badgesEarned.set(['first-visit']);

      console.log('[Checkin] 🎯 Points awarded:', this.pointsEarned());
      console.log('[Checkin] 🏅 Badges awarded:', this.badgesEarned());
      console.log('[Checkin] 🎉 Success modal displayed');

      this.currentPhase.set('SUCCESS_MODAL');
    }, 2000);
  }

  protected exitToHomepage(): void {
    console.log('[Checkin] 🏠 Navigating to homepage');
    this.cleanup();
    this.router.navigate(['/']);
  }

  private stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      console.log('[Checkin] 📹 Camera stopped');
    }
  }

  private cleanup(): void {
    this.stopCamera();

    // Stop carpet recognition service
    this._carpetService.stopRecognition();

    if (this.gateMonitoringInterval) {
      clearInterval(this.gateMonitoringInterval);
      this.gateMonitoringInterval = null;
    }

    const photoUrl = this.capturedPhotoUrl();
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }
  }
}
