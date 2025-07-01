import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@shared/base/base.component';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { SimpleMetricsService } from '../../data-access/simple-metrics.service';
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
                <!-- Core device gates -->
                <div class="gate" [class.passed]="gatesPassed().deviceOriented">📱 Device Oriented: {{ gatesPassed().deviceOriented ? 'YES' : 'NO' }}</div>
                <div class="gate" [class.passed]="gatesPassed().isStable">🎥 Camera Stable: {{ gatesPassed().isStable ? 'YES' : 'NO' }}</div>
                
                <!-- Raw data only -->
                <div class="gate simple">🔬 Analysis Count: {{ metrics()?.timestamp ? 'YES' : 'NO DATA' }}</div>
                <div class="gate simple">📊 Processing: {{ (metrics()?.analysisTime ?? 0) | number:'1.0-0' }}ms</div>
                
                <!-- Real-time metrics - always show if available -->
                @if (metrics()) {
                  <!-- Image quality -->
                  <div class="gate simple" [class.passed]="gatesPassed().goodSharpness">🔍 Sharpness: {{ metrics()!.sharpness }}/100</div>
                  <div class="gate simple" [class.passed]="gatesPassed().goodContrast">⚡ Contrast: {{ metrics()!.contrast }}/100</div>
                  <div class="gate simple">💡 Brightness: {{ metrics()!.brightness }}/255</div>
                  <div class="gate simple" [class.passed]="gatesPassed().lowMotion">🏃 Motion Level: {{ metrics()!.motionLevel }}/100</div>
                  <div class="gate simple">📊 Motion History: [{{ getMotionHistoryString() }}]</div>
                  
                  <!-- Color analysis -->
                  <div class="gate simple">🌈 Dominant Colors: {{ metrics()!.dominantColors.join(', ') }}</div>
                  
                  <!-- Pattern analysis -->
                  <div class="gate" [class.carpet-red]="gatesPassed().carpetConfidence === 'red'" 
                       [class.carpet-yellow]="gatesPassed().carpetConfidence === 'yellow'"
                       [class.carpet-green]="gatesPassed().carpetConfidence === 'green'">🎯 Carpet Detection: {{ gatesPassed().carpetConfidence.toUpperCase() }}</div>
                  <div class="gate simple" [class.passed]="gatesPassed().hasEdges">📐 Edge Density: {{ metrics()!.edgeDensity }}%</div>
                  <div class="gate simple" [class.passed]="gatesPassed().hasTexture">🧵 Texture Complexity: {{ metrics()!.textureComplexity }}%</div>
                  
                  <!-- Technical info -->
                  <div class="gate simple">⏱️ Analysis Time: {{ metrics()!.analysisTime | number:'1.0-0' }}ms</div>
                }
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

    .gate.enhanced {
      background: rgba(138, 43, 226, 0.2);
      border-left: 3px solid blueviolet;
      font-size: 0.9rem;
    }

    .gate.enhanced.passed {
      background: rgba(138, 43, 226, 0.4);
    }

    .gate.simple {
      background: rgba(34, 139, 34, 0.2);
      border-left: 3px solid forestgreen;
      font-size: 0.9rem;
    }

    .gate.simple.passed {
      background: rgba(34, 139, 34, 0.4);
    }

    .gate.carpet-red {
      background: rgba(255, 0, 0, 0.4) !important;
      border-left: 3px solid red !important;
      font-weight: bold;
    }

    .gate.carpet-yellow {
      background: rgba(255, 255, 0, 0.4) !important;
      border-left: 3px solid yellow !important;
      font-weight: bold;
      color: black;
    }

    .gate.carpet-green {
      background: rgba(0, 255, 0, 0.4) !important;
      border-left: 3px solid green !important;
      font-weight: bold;
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
  private readonly _metricsService = inject(SimpleMetricsService);

  // State
  protected readonly currentPhase = signal<CheckinPhase>('CAMERA_STARTING');
  protected readonly pubId = signal<string | null>(null);
  protected readonly capturedPhotoUrl = signal<string | null>(null);

  // Simple real-time metrics
  protected readonly metrics = this._metricsService.metrics;
  protected readonly isAnalyzing = this._metricsService.isAnalyzing;
  
  // Device orientation tracking
  protected readonly deviceOrientation = signal({ beta: 0, gamma: 0, stable: false });
  private lastOrientationUpdate = 0;

  // Results
  protected readonly pointsEarned = signal(0);
  protected readonly badgesEarned = signal<any[]>([]);

  // Constants
  protected readonly ACTIVE_DEVELOPMENT_MODE = ACTIVE_DEVELOPMENT_MODE;
  
  // Helper for motion history display
  protected getMotionHistoryString(): string {
    // Access motion history from service for debugging display
    return 'Debug mode'; // Placeholder - service doesn't expose history
  }

  // Computed
  protected readonly pubName = () => {
    const id = this.pubId();
    return id ? this.pubStore.get(id)?.name || 'Unknown Pub' : 'Unknown Pub';
  };

  protected readonly gatesPassed = computed(() => {
    const data = this.metrics();
    const orientation = this.deviceOrientation();
    
    console.log('[Checkin] 🧮 Computing gates with orientation:', orientation);
    
    // ANALYSIS: Orientation logic was backwards! When pointing DOWN at carpet, we want YES
    // When looking UP (beta near 0), we want NO. So we need LESS than 45 degrees for pointing down
    const deviceOriented = Math.abs(orientation.beta) < 45; // Phone pointing down at carpet
    const deviceStable = orientation.stable; // Movement stability from orientation events

    console.log('[Checkin] 🚦 Gate calculations:', {
      beta: orientation.beta,
      betaAbs: Math.abs(orientation.beta),
      deviceOriented,
      deviceStable,
      stable: orientation.stable
    });

    // 3-TIER CARPET DETECTION THRESHOLDS based on real data:
    // RED (not carpet): Sharpness <20, Edges <30%, Texture <15%
    // YELLOW (borderline): Sharpness 20-30, Edges 30-45%, Texture 15-22%  
    // GREEN (carpet): Sharpness >30, Edges >45%, Texture >22%
    const carpetConfidence = this.calculateCarpetConfidence(data);

    return {
      deviceOriented,
      isStable: data ? data.isStable : false,
      lowMotion: data ? data.motionLevel < 20 : false, // Increased from 10 to 20
      metricsReady: data !== null,
      carpetConfidence, // 'red', 'yellow', 'green'
      goodSharpness: data ? data.sharpness > 20 : false,
      goodContrast: data ? data.contrast > 20 : false,
      hasTexture: data ? data.textureComplexity > 15 : false,
      hasEdges: data ? data.edgeDensity > 30 : false
    };
  });

  private calculateCarpetConfidence(data: any): 'red' | 'yellow' | 'green' {
    if (!data) return 'red';
    
    const { sharpness, edgeDensity, textureComplexity } = data;
    
    // GREEN: Definite carpet (2 of 3 metrics must pass - more forgiving)
    const sharpnessPass = sharpness > 25;  // Reduced from 30
    const edgesPass = edgeDensity > 40;    // Reduced from 45  
    const texturePass = textureComplexity > 18; // Reduced from 22
    const passCount = [sharpnessPass, edgesPass, texturePass].filter(Boolean).length;
    
    if (passCount >= 2) {
      return 'green';
    }
    
    // RED: Definitely not carpet (all metrics low)
    if (sharpness < 15 && edgeDensity < 25 && textureComplexity < 12) {
      return 'red';
    }
    
    // YELLOW: Borderline detection
    return 'yellow';
  }

  protected readonly allGatesPassed = computed(() => {
    const gates = this.gatesPassed();
    
    // ALL gates must be green/passed for auto check-in
    const allPassed = gates.deviceOriented && 
                     gates.isStable && 
                     gates.carpetConfidence === 'green' &&
                     gates.goodSharpness &&
                     gates.goodContrast &&
                     gates.hasTexture &&
                     gates.hasEdges &&
                     gates.lowMotion;
    
    console.log('[Checkin] 🚦 All gates check:', {
      deviceOriented: gates.deviceOriented,
      isStable: gates.isStable,
      carpetConfidence: gates.carpetConfidence,
      goodSharpness: gates.goodSharpness,
      goodContrast: gates.goodContrast,
      hasTexture: gates.hasTexture,
      hasEdges: gates.hasEdges,
      lowMotion: gates.lowMotion,
      allPassed
    });
    
    return allPassed;
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

    this.startDeviceOrientationMonitoring();
    this.startCamera();
  }

  ngOnDestroy(): void {
    console.log('[Checkin] 🚪 Component destroyed');
    this.cleanup();
  }

  private startDeviceOrientationMonitoring(): void {
    console.log('[Checkin] 📱 Starting device orientation monitoring');
    console.log('[Checkin] 🔧 DeviceOrientationEvent available?', 'DeviceOrientationEvent' in window);
    console.log('[Checkin] 🔧 User agent:', navigator.userAgent);
    
    if ('DeviceOrientationEvent' in window) {
      // Check if we need permission (iOS 13+)
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        console.log('[Checkin] 🔐 Requesting device orientation permission...');
        (DeviceOrientationEvent as any).requestPermission().then((response: string) => {
          console.log('[Checkin] 🔐 Permission response:', response);
          if (response === 'granted') {
            window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
          }
        });
      } else {
        console.log('[Checkin] 📱 Adding device orientation listener (no permission needed)');
        window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
      }
    } else {
      console.warn('[Checkin] ⚠️ Device orientation not supported - desktop mode');
      // Desktop fallback - set reasonable defaults but mark as unsupported
      this.deviceOrientation.set({ beta: 0, gamma: 0, stable: false });
    }
  }

  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    const beta = event.beta || 0;   // Front-to-back tilt
    const gamma = event.gamma || 0; // Left-to-right tilt
    const alpha = event.alpha || 0; // Compass direction
    
    console.log('[Checkin] 📐 Raw orientation:', { alpha, beta, gamma });
    
    // Check for stability - if movement is minimal for a period
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastOrientationUpdate;
    
    const prevOrientation = this.deviceOrientation();
    const movement = Math.abs(beta - prevOrientation.beta) + Math.abs(gamma - prevOrientation.gamma);
    
    console.log('[Checkin] 📊 Movement calculation:', {
      prevBeta: prevOrientation.beta,
      newBeta: beta,
      prevGamma: prevOrientation.gamma, 
      newGamma: gamma,
      movement,
      timeSinceLastUpdate
    });
    
    // Consider stable if movement is small and enough time has passed
    const stable = movement < 5 && timeSinceLastUpdate > 1000;
    
    console.log('[Checkin] 📱 Orientation update:', { beta, gamma, stable, movement });
    
    this.deviceOrientation.set({ beta, gamma, stable });
    this.lastOrientationUpdate = now;
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
    console.log('[Checkin] 🚦 Starting simple metrics analysis monitoring');

    // Start simple metrics analysis
    this.startSimpleAnalysis();

    // DISABLED: Dev mode auto-capture - just observing metrics
    if (this.ACTIVE_DEVELOPMENT_MODE) {
      console.log('[Checkin] 🧪 DEV MODE: Auto-capture DISABLED - metrics observation only');
    }

    // Monitor simple metrics status
    this.gateMonitoringInterval = window.setInterval(() => {
      const gates = this.gatesPassed();
      console.log('[Checkin] 🚦 Simple metrics gates status:', gates);

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

  private startSimpleAnalysis(): void {
    console.log('[Checkin] 🔬 FORCE STARTING ANALYSIS');
    console.log('[Checkin] 🔧 Service exists?', !!this._metricsService);
    
    // Test the service immediately with full debugging
    setTimeout(() => {
      console.log('[Checkin] 🧪 STARTING DEBUG TEST');
      console.log('[Checkin] 📹 Video element:', !!this.videoElement?.nativeElement);
      
      if (this.videoElement?.nativeElement) {
        const video = this.videoElement.nativeElement;
        console.log('[Checkin] 📐 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        console.log('[Checkin] 🎬 Video ready state:', video.readyState);
        console.log('[Checkin] 🔧 Calling service...');
        
        this._metricsService.analyzeVideoFrame(video).then((result) => {
          console.log('[Checkin] ✅ SERVICE RETURNED:', result);
        }).catch((error) => {
          console.error('[Checkin] ❌ SERVICE ERROR:', error);
        });
      } else {
        console.error('[Checkin] ❌ NO VIDEO ELEMENT');
      }
    }, 1000);
    
    // Then run continuously
    setInterval(async () => {
      if (this.videoElement?.nativeElement) {
        try {
          await this._metricsService.analyzeVideoFrame(this.videoElement.nativeElement);
        } catch (error) {
          console.error('[Checkin] ❌ Interval error:', error);
        }
      }
    }, 500); // Fast response for real-time feedback
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

    // Simple metrics service doesn't need explicit cleanup - it's stateless

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
