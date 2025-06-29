import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@shared/base/base.component';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { ACTIVE_DEVELOPMENT_MODE } from '@shared/utils/dev-mode.constants';

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
                <div class="gate" [class.passed]="gatesPassed().edges">📐 Edges: {{ edgeCount() }}</div>
                <div class="gate" [class.passed]="gatesPassed().orientation">📱 Orientation: {{ orientationOk() ? 'OK' : 'Turn phone down' }}</div>
                <div class="gate" [class.passed]="gatesPassed().stable">⚖️ Stable: {{ deviceStable() ? 'YES' : 'NO' }}</div>
                <div class="gate" [class.passed]="gatesPassed().sharp">🔍 Sharp: {{ sharpnessScore() }}</div>
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

  // State
  protected readonly currentPhase = signal<CheckinPhase>('CAMERA_STARTING');
  protected readonly pubId = signal<string | null>(null);
  protected readonly capturedPhotoUrl = signal<string | null>(null);

  // Gate monitoring
  protected readonly edgeCount = signal(0);
  protected readonly orientationOk = signal(false);
  protected readonly deviceStable = signal(false);
  protected readonly sharpnessScore = signal(0);

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

  protected readonly gatesPassed = () => ({
    edges: this.edgeCount() > 50,
    orientation: this.orientationOk(),
    stable: this.deviceStable(),
    sharp: this.sharpnessScore() > 100
  });

  protected readonly allGatesPassed = () => {
    const gates = this.gatesPassed();
    return gates.edges && gates.orientation && gates.stable && gates.sharp;
  };

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
    console.log('[Checkin] 🚦 Starting gate monitoring');

    // Dev mode shortcut - force all gates to pass after 2 seconds
    if (this.ACTIVE_DEVELOPMENT_MODE) {
      setTimeout(() => {
        console.log('[Checkin] 🧪 DEV MODE: All gates forced to pass');
        this.edgeCount.set(75);
        this.orientationOk.set(true);
        this.deviceStable.set(true);
        this.sharpnessScore.set(150);
      }, 2000);
    }
    // Simulate gate monitoring for now
    this.gateMonitoringInterval = window.setInterval(() => {
      if (!this.ACTIVE_DEVELOPMENT_MODE) {
        this.edgeCount.set(Math.floor(Math.random() * 80) + 20); // 20-100, more likely > 50
        this.orientationOk.set(Math.random() > 0.2); // 80% chance
        this.deviceStable.set(Math.random() > 0.3); // 70% chance
        this.sharpnessScore.set(Math.floor(Math.random() * 150) + 50); // 50-200, more likely > 100
      }

      const gates = this.gatesPassed();
      console.log('[Checkin] 🚦 Gates status:', gates);

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
