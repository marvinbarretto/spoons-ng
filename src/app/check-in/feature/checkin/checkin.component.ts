import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, AfterViewInit, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@shared/base/base.component';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { SimpleMetricsService } from '../../data-access/simple-metrics.service';
import { LLMService } from '@shared/data-access/llm.service';
import { CarpetStorageService } from '../../../carpets/data-access/carpet-storage.service';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import type { CarpetDetectionResult } from '@shared/utils/llm-types';

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
              <div class="status-message">{{ currentAnalysisMessage() }}</div>
              <div class="thinking-spinner">🤖</div>
            }

            @case ('CHECK_IN_PROCESSING') {
              <div class="status-message">{{ pubName() }}</div>
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
export class CheckinComponent extends BaseComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly checkinStore = inject(CheckInStore);
  private readonly pubStore = inject(PubStore);
  private readonly _metricsService = inject(SimpleMetricsService);
  private readonly llmService = inject(LLMService);
  private readonly carpetStorageService = inject(CarpetStorageService);

  // State with comprehensive logging
  private readonly _currentPhase = signal<CheckinPhase>('CAMERA_STARTING');
  protected readonly currentPhase = computed(() => {
    const phase = this._currentPhase();
    const shouldShowVideo = phase === 'CAMERA_STARTING' || phase === 'WAITING_FOR_GATES';
    console.log(`[Checkin] 📺 === TEMPLATE VIDEO VISIBILITY CHECK ===`);
    console.log(`[Checkin] 📺 Current phase: ${phase}`);
    console.log(`[Checkin] 📺 Should show video: ${shouldShowVideo}`);
    console.log(`[Checkin] 📺 Video element exists: ${!!this.videoElement?.nativeElement}`);
    if (this.videoElement?.nativeElement) {
      console.log(`[Checkin] 📺 Video dimensions: ${this.videoElement.nativeElement.videoWidth}x${this.videoElement.nativeElement.videoHeight}`);
      console.log(`[Checkin] 📺 Video readyState: ${this.videoElement.nativeElement.readyState}`);
      console.log(`[Checkin] 📺 Video srcObject: ${this.videoElement.nativeElement.srcObject ? 'present' : 'null'}`);
    }
    return phase;
  });

  // Helper method to set phase with logging
  private setPhase(newPhase: CheckinPhase): void {
    const oldPhase = this._currentPhase();
    console.log(`[Checkin] 🔄 === PHASE TRANSITION ===`);
    console.log(`[Checkin] 🔄 From: ${oldPhase} → To: ${newPhase}`);
    console.log(`[Checkin] 🔄 Video will be shown: ${newPhase === 'CAMERA_STARTING' || newPhase === 'WAITING_FOR_GATES'}`);

    // Clean up intervals when leaving WAITING_FOR_GATES (the only phase that runs monitoring)
    if (oldPhase === 'WAITING_FOR_GATES' && newPhase !== 'WAITING_FOR_GATES') {
      this.cleanupIntervals();
    }

    this._currentPhase.set(newPhase);

  }
  protected readonly pubId = signal<string | null>(null);
  protected readonly capturedPhotoUrl = signal<string | null>(null);
  protected readonly capturedPhotoBlob = signal<Blob | null>(null);
  private capturedCanvas: HTMLCanvasElement | null = null;

  // LLM Analysis state
  protected readonly currentAnalysisMessage = signal('Starting analysis...');
  private readonly analysisMessages = [
    'Analyzing sharpness...',
    'Checking contrast levels...',
    'Evaluating edge density...',
    'Measuring texture complexity...',
    'Examining pattern repetition...',
    'Assessing color variance...',
    'Detecting carpet features...'
  ];
  private analysisMessageInterval: number | null = null;
  private llmResponse: CarpetDetectionResult | null = null;

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
  protected readonly ACTIVE_DEVELOPMENT_MODE = environment.ACTIVE_DEVELOPMENT_MODE;

  // Helper for motion history display
  protected getMotionHistoryString(): string {
    // Access motion history from service for debugging display
    return 'Debug mode'; // Placeholder - service doesn't expose history
  }

  // Camera readiness validation
  private isCameraReady(video: HTMLVideoElement): boolean {
    const isReady = video.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                   video.videoWidth > 0 &&
                   video.videoHeight > 0;

    console.log('[Checkin] 🔍 Camera readiness check:', {
      readyState: video.readyState,
      dimensions: `${video.videoWidth}x${video.videoHeight}`,
      isReady
    });

    return isReady;
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
  private metricsAnalysisInterval: number | null = null;
  private videoEventCleanups: (() => void)[] = [];

  // Device orientation cleanup
  private deviceOrientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  // Timeout tracking for cleanup
  private activeTimeouts: Set<number> = new Set();

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
  }

  ngAfterViewInit(): void {
    // Camera initialization requires video element to be available
    // This ensures @ViewChild videoElement is guaranteed to exist
    console.log('[Checkin] 📹 View initialized - starting camera');
    this.startCamera();
  }

  ngOnDestroy(): void {
    console.log('[Checkin] 🚪 Component destroyed - starting comprehensive cleanup');

    // Defensive cleanup - clear all intervals first to prevent any ongoing work
    this.cleanupIntervals();

    // Clear all timeouts to prevent delayed callbacks
    this.cleanupTimeouts();

    // Full cleanup
    this.cleanup();

    console.log('[Checkin] ✅ Component destruction cleanup completed');
  }

  private startDeviceOrientationMonitoring(): void {
    console.log('[Checkin] 📱 Starting device orientation monitoring');
    console.log('[Checkin] 🔧 DeviceOrientationEvent available?', 'DeviceOrientationEvent' in window);
    console.log('[Checkin] 🔧 User agent:', navigator.userAgent);

    if ('DeviceOrientationEvent' in window) {
      // Create bound handler that can be properly removed
      this.deviceOrientationHandler = this.handleDeviceOrientation.bind(this);

      // Check if we need permission (iOS 13+)
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        console.log('[Checkin] 🔐 Requesting device orientation permission...');
        (DeviceOrientationEvent as any).requestPermission().then((response: string) => {
          console.log('[Checkin] 🔐 Permission response:', response);
          if (response === 'granted' && this.deviceOrientationHandler) {
            window.addEventListener('deviceorientation', this.deviceOrientationHandler);
          }
        });
      } else {
        console.log('[Checkin] 📱 Adding device orientation listener (no permission needed)');
        window.addEventListener('deviceorientation', this.deviceOrientationHandler);
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
    console.log('[Checkin] 📹 === STARTING CAMERA ===');
    console.log('[Checkin] 📹 Video element available:', !!this.videoElement?.nativeElement);
    console.log('[Checkin] 📹 Current phase:', this.currentPhase());

    // Defensive cleanup - ensure any previous camera state is cleared
    if (this.stream) {
      console.log('[Checkin] 📹 Found existing stream, cleaning up first');
      this.stopCamera();
    }

    if (!this.videoElement?.nativeElement) {
      console.log('[Checkin] ❌ === CRITICAL: VIDEO ELEMENT NOT AVAILABLE ===');
      console.log('[Checkin] ❌ Phase:', this.currentPhase());
      console.log('[Checkin] ❌ ViewChild exists:', !!this.videoElement);
      console.log('[Checkin] ❌ NativeElement exists:', !!this.videoElement?.nativeElement);

      return;
    }

    try {
      console.log('[Checkin] 📹 Requesting user media...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      console.log('[Checkin] 📹 User media stream created successfully');

      const video = this.videoElement.nativeElement;
      console.log('[Checkin] 📹 Assigning stream to video element...');
      video.srcObject = this.stream;
      console.log('[Checkin] 📹 Stream assigned, waiting for video to be ready...');

      // Wait for video to actually load frame data, not just start playing
      await this.waitForVideoReady(video);

      console.log('[Checkin] 📹 === CAMERA STARTED SUCCESSFULLY ===');
      console.log('[Checkin] 📹 Final video state:', {
        dimensions: `${video.videoWidth}x${video.videoHeight}`,
        readyState: video.readyState,
        srcObject: video.srcObject ? 'present' : 'null'
      });

      // Only set phase if we're in initial camera start (not retry)
      if (this.currentPhase() === 'CAMERA_STARTING') {
        this.setPhase('WAITING_FOR_GATES');
      }
      this.startGateMonitoring();
    } catch (error) {
      console.error('[Checkin] ❌ === CAMERA START FAILED ===');
      console.error('[Checkin] ❌ Error:', error);
    }
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    console.log('[Checkin] ⏳ Waiting for video to be ready...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Video ready timeout after 5 seconds'));
      }, 5000);

      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
        // Remove this cleanup from the global tracking array
        const index = this.videoEventCleanups.indexOf(cleanup);
        if (index > -1) {
          this.videoEventCleanups.splice(index, 1);
        }
      };

      // CRITICAL: Track this cleanup function so it can be called during component destruction
      this.videoEventCleanups.push(cleanup);

      const checkReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          console.log('[Checkin] ✅ Video ready:', {
            readyState: video.readyState,
            dimensions: `${video.videoWidth}x${video.videoHeight}`
          });
          cleanup();
          resolve();
          return true;
        }
        return false;
      };

      const onLoadedMetadata = () => {
        console.log('[Checkin] 📐 Video metadata loaded');
        checkReady();
      };

      const onCanPlay = () => {
        console.log('[Checkin] 🎬 Video can play');
        checkReady();
      };

      const onError = () => {
        console.error('[Checkin] ❌ Video error during loading');
        cleanup();
        reject(new Error('Video loading error'));
      };

      // Add event listeners
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);

      // Start playing and check if already ready
      video.play().then(() => {
        console.log('[Checkin] 🎬 Video play() completed');
        checkReady();
      }).catch((error) => {
        console.error('[Checkin] ❌ Video play() failed:', error);
        cleanup();
        reject(error);
      });
    });
  }

  private startGateMonitoring(): void {
    console.log('[Checkin] 🚦 Starting simple metrics analysis monitoring');

    // Clean up any existing intervals first
    this.cleanupIntervals();

    // Start simple metrics analysis
    this.startSimpleAnalysis();

    // DEV MODE: Auto-bypass all gates after 1 second
    if (this.ACTIVE_DEVELOPMENT_MODE) {
      console.log('[Checkin] 🧪 DEV MODE: Auto-capture will trigger in 1 second (bypassing all gates)');
      this.safeSetTimeout(() => {
        console.log('[Checkin] 🧪 DEV MODE: 1 second elapsed - triggering auto-capture!');

        // Stop gate monitoring since we're bypassing to next phase
        if (this.gateMonitoringInterval) {
          clearInterval(this.gateMonitoringInterval);
          this.gateMonitoringInterval = null;
          console.log('[Checkin] 🧪 DEV MODE: Gate monitoring stopped');
        }

        this.capturePhoto();
      }, 1000);
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


    // Then run continuously
    this.metricsAnalysisInterval = window.setInterval(async () => {
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

    if (!this.videoElement?.nativeElement) {
      console.error('[Checkin] ❌ No video element available for capture');
      return;
    }

    const video = this.videoElement.nativeElement;

    // Validate camera readiness
    if (!this.isCameraReady(video)) {
      console.error('[Checkin] ❌ Camera not ready for capture, skipping');
      return;
    }

    // Capture video dimensions BEFORE stopping camera
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Validate dimensions are valid
    if (videoWidth <= 0 || videoHeight <= 0) {
      console.error('[Checkin] ❌ Invalid video dimensions for capture:', { videoWidth, videoHeight });
      return;
    }

    console.log('[Checkin] 📐 Capturing with dimensions:', videoWidth, 'x', videoHeight);

    // Create canvas with captured dimensions
    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw the video frame to canvas BEFORE stopping camera
      ctx.drawImage(video, 0, 0);

      // Now we can safely stop the camera
      this.stopCamera();

      // Store canvas for later use by CarpetStorageService
      this.capturedCanvas = canvas;

      // Base64 for UI background and LLM API
      const photoUrl = canvas.toDataURL('image/jpeg');
      this.capturedPhotoUrl.set(photoUrl);

      // Blob for efficient IndexedDB storage (only stored after LLM confirms carpet)
      canvas.toBlob((blob) => {
        if (blob) {
          this.capturedPhotoBlob.set(blob);
          console.log('[Checkin] capturePhoto() - 📸 Photo captured as Blob:', (blob.size / 1024).toFixed(1) + 'KB');
        }

        console.log('[Checkin] capturePhoto() - 📸 Photo captured, camera stopped');
        console.log('[Checkin] capturePhoto() - 🖼️ Background set to blurred snapshot');

        // Move phase transition here to ensure photo URL is available before template renders
        this.setPhase('PHOTO_CAPTURED');
        this.startLLMAnalysis();
      }, 'image/jpeg', 0.8);
    }
  }

  private async startLLMAnalysis(): Promise<void> {
    console.log('[Checkin] startLLMAnalysis() - 🤖 LLM analysis started');
    console.log('[Checkin] startLLMAnalysis() - 💭 Starting message cycling');

    this.setPhase('LLM_THINKING');
    this.startAnalysisMessageCycling();

    try {
      const photoData = this.capturedPhotoUrl();
      if (!photoData) {
        console.error('[Checkin] ❌ No photo data available for LLM analysis');
        this.stopAnalysisMessageCycling();
        this.handleLLMError('No photo data available');
        return;
      }

      // STUB: Replace LLM service call for debugging
      console.log('[Checkin] 🧪 STUBBED LLM - always returning carpet detected');
      const result = { 
        success: true, 
        data: { 
          isCarpet: true, 
          confidence: 0.9, 
          reasoning: 'Stubbed response - always detects carpet for debugging',
          visualElements: ['stubbed carpet pattern']
        } 
      };
      
      this.stopAnalysisMessageCycling();
      console.log('[Checkin] 🤖 LLM analysis complete (STUBBED):', result);

      if (result.success && result.data.isCarpet) {
        console.log('[Checkin] ✅ LLM confirmed carpet detected! Confidence:', result.data.confidence);
        console.log('[Checkin] 🗨️ LLM reasoning:', result.data.reasoning);

        this.llmResponse = result.data;
        this.executeCheckin();
      } else {
        console.log('[Checkin] ❌ LLM did not detect carpet or failed');
        console.log('[Checkin] 🗨️ LLM reasoning:', result.data?.reasoning || 'No reasoning provided');

        // Show negative result briefly, then return to gates
        const identification = this.getLLMIdentification(result.data);
        this.currentAnalysisMessage.set(`Not a carpet - ${identification}`);

        console.log('[Checkin] 🔄 Returning to gate monitoring after negative LLM result');
        this.resetForRetry().then(() => {
          this.startGateMonitoring();
        });
      }
    } catch (error) {
      console.error('[Checkin] ❌ LLM analysis error:', error);
      this.stopAnalysisMessageCycling();
      this.handleLLMError((error as any)?.message || 'LLM analysis failed');
    }
  }

  private handleLLMError(errorMessage: string): void {
    console.log('[Checkin] 🔧 Handling LLM error, returning to gates instead of exiting');

    // Show error message briefly, then return to gates
    this.currentAnalysisMessage.set(`Analysis error - ${errorMessage}`);

    console.log('[Checkin] 🔄 Returning to gate monitoring after LLM error');
    this.resetForRetry().then(() => {
      this.startGateMonitoring();
    });
  }

  private startAnalysisMessageCycling(): void {
    let messageIndex = 0;
    this.currentAnalysisMessage.set(this.analysisMessages[messageIndex]);

    this.analysisMessageInterval = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % this.analysisMessages.length;
      this.currentAnalysisMessage.set(this.analysisMessages[messageIndex]);
    }, 800);
  }

  private stopAnalysisMessageCycling(): void {
    if (this.analysisMessageInterval) {
      clearInterval(this.analysisMessageInterval);
      this.analysisMessageInterval = null;
      console.log('[Checkin] 🔄 Analysis message cycling stopped');
    }
  }

  private getLLMIdentification(llmData: any): string {
    // Extract what LLM thinks it saw from the reasoning
    if (!llmData?.reasoning) return 'unknown surface';

    // Try to extract identification from reasoning (usually first sentence)
    const reasoning = llmData.reasoning.toLowerCase();

    // Common patterns the LLM might say
    if (reasoning.includes('floor') || reasoning.includes('hardwood') || reasoning.includes('tile')) {
      return 'floor surface';
    }
    if (reasoning.includes('wall') || reasoning.includes('brick') || reasoning.includes('concrete')) {
      return 'wall surface';
    }
    if (reasoning.includes('table') || reasoning.includes('desk') || reasoning.includes('furniture')) {
      return 'furniture';
    }
    if (reasoning.includes('ground') || reasoning.includes('pavement') || reasoning.includes('asphalt')) {
      return 'ground surface';
    }

    // Fallback: use first few words of reasoning
    const firstSentence = llmData.reasoning.split('.')[0] || llmData.reasoning;
    return firstSentence.substring(0, 30) + (firstSentence.length > 30 ? '...' : '');
  }

  private async resetForRetry(): Promise<void> {
    console.log('[Checkin] 🔄 === RESETTING FOR RETRY ATTEMPT ===');

    // Clear captured photo data for fresh attempt
    this.capturedPhotoUrl.set(null);
    this.capturedPhotoBlob.set(null);
    if (this.capturedCanvas) {
      const ctx = this.capturedCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.capturedCanvas.width, this.capturedCanvas.height);
      }
      this.capturedCanvas = null;
    }
    this.llmResponse = null;

    // Reset analysis message
    this.currentAnalysisMessage.set('Starting analysis...');

    // Log current state before restart
    console.log('[Checkin] 📊 Current state before camera restart:', {
      hasStream: !!this.stream,
      hasVideoElement: !!this.videoElement?.nativeElement,
      videoSrcObject: this.videoElement?.nativeElement?.srcObject ? 'present' : 'null',
      videoDimensions: this.videoElement?.nativeElement ?
        `${this.videoElement.nativeElement.videoWidth}x${this.videoElement.nativeElement.videoHeight}` : 'no-video',
      videoReadyState: this.videoElement?.nativeElement?.readyState || 'no-video'
    });

    // Always restart camera on retry (don't check stream state)
    console.log('[Checkin] 📹 === RESTARTING CAMERA FOR RETRY ===');

    // Stop current camera first (clean up properly)
    this.stopCamera();

    // CRITICAL: Set phase to trigger video element visibility BEFORE starting camera
    console.log('[Checkin] 🔄 Setting phase to WAITING_FOR_GATES to ensure video element visibility');
    this.setPhase('WAITING_FOR_GATES');

    console.log('[Checkin] 📺 Video element available after phase change:', !!this.videoElement?.nativeElement);

    // Start fresh camera
    try {
      await this.startCamera();
    } catch (error) {
      console.error('[Checkin] ❌ Failed to restart camera:', error);
      // Don't propagate the error - let the component remain in current state
    }

    console.log('[Checkin] ✅ === CAMERA RESTART COMPLETED ===');
    console.log('[Checkin] 📊 Final state after camera restart:', {
      hasStream: !!this.stream,
      videoSrcObject: this.videoElement?.nativeElement?.srcObject ? 'present' : 'null',
      videoDimensions: this.videoElement?.nativeElement ?
        `${this.videoElement.nativeElement.videoWidth}x${this.videoElement.nativeElement.videoHeight}` : 'no-video',
      videoReadyState: this.videoElement?.nativeElement?.readyState || 'no-video'
    });
  }

  private async executeCheckin(): Promise<void> {
    console.log('[Checkin] ✅ LLM confirmed carpet - executing check-in');
    this.setPhase('CHECK_IN_PROCESSING');

    const pubId = this.pubId();
    if (!pubId) return;

    try {
      // Store validated carpet image using CarpetStorageService
      if (this.capturedCanvas && this.llmResponse) {
        console.log('[Checkin] 💾 Storing carpet image to IndexedDB');
        console.log('[Checkin] 🖼️ Canvas dimensions:', this.capturedCanvas.width, 'x', this.capturedCanvas.height);
        
        const pubName = this.pubName();
        await this.carpetStorageService.saveCarpetImage(this.capturedCanvas, pubId, pubName);
        console.log('[Checkin] ✅ Carpet image stored successfully');
      }

      // Simulate check-in processing
      this.safeSetTimeout(() => {
        // Fake results
        this.pointsEarned.set(25);
        this.badgesEarned.set(['first-visit']);

        console.log('[Checkin] 🎯 Points awarded:', this.pointsEarned());
        console.log('[Checkin] 🏅 Badges awarded:', this.badgesEarned());
        console.log('[Checkin] 🎉 Success modal displayed');

        this.setPhase('SUCCESS_MODAL');
      }, 2000);

    } catch (error) {
      console.error('[Checkin] ❌ Error storing carpet image:', error);
      // Continue with check-in even if storage fails
      this.setPhase('SUCCESS_MODAL');
    }
  }

  protected exitToHomepage(): void {
    console.log('[Checkin] 🏠 Navigating to homepage');
    this.emergencyCleanup();
    this.router.navigate(['/']);
  }

  private emergencyCleanup(): void {
    console.log('[Checkin] 🆘 Emergency cleanup initiated');

    // Force stop all intervals and timeouts immediately
    this.cleanupIntervals();
    this.cleanupTimeouts();

    // Force stop camera
    this.stopCamera();

    // Clear device orientation listener
    this.cleanupDeviceOrientationListener();

    // Clear metrics service state
    this._metricsService.clearState?.();

    // Clear canvas resources
    this.cleanupCanvasResources();

    console.log('[Checkin] 🆘 Emergency cleanup completed');
  }

  private stopCamera(): void {
    if (this.stream) {
      console.log('[Checkin] 📹 Stopping camera with', this.stream.getTracks().length, 'tracks');
      this.stream.getTracks().forEach(track => {
        console.log('[Checkin] 📹 Stopping track:', track.kind, track.readyState);
        track.stop();
      });

      // Clear video element source
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = null;
        console.log('[Checkin] 📹 Video element srcObject cleared');
      }

      this.stream = null;
      console.log('[Checkin] 📹 Camera stopped and resources cleaned');
    }
  }

  private cleanupIntervals(): void {
    console.log('[Checkin] 🧹 Cleaning up intervals');

    if (this.gateMonitoringInterval) {
      clearInterval(this.gateMonitoringInterval);
      this.gateMonitoringInterval = null;
      console.log('[Checkin] 🧹 Gate monitoring interval cleared');
    }

    if (this.metricsAnalysisInterval) {
      clearInterval(this.metricsAnalysisInterval);
      this.metricsAnalysisInterval = null;
      console.log('[Checkin] 🧹 Metrics analysis interval cleared');
    }
  }

  private cleanup(): void {
    this.stopCamera();
    this.stopAnalysisMessageCycling();
    this.cleanupIntervals();
    this.cleanupVideoEventListeners();
    this.cleanupDeviceOrientationListener();
    this.cleanupTimeouts();
    this.cleanupCanvasResources();

    const photoUrl = this.capturedPhotoUrl();
    if (photoUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      // Only revoke if it's an object URL (starts with blob:)
      if (photoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoUrl);
      }
    }
  }

  private cleanupVideoEventListeners(): void {
    console.log('[Checkin] 🧹 Cleaning up video event listeners');
    // Call all pending video event cleanups to prevent memory leaks
    while (this.videoEventCleanups.length > 0) {
      const cleanup = this.videoEventCleanups.pop();
      if (cleanup) {
        cleanup();
      }
    }
    console.log('[Checkin] 🧹 All video event listeners cleaned up');
  }

  private cleanupCanvasResources(): void {
    console.log('[Checkin] 🧹 Cleaning up canvas resources');

    // Clear captured canvas reference
    if (this.capturedCanvas) {
      // Clear the canvas
      const ctx = this.capturedCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.capturedCanvas.width, this.capturedCanvas.height);
      }
      this.capturedCanvas = null;
      console.log('[Checkin] 🧹 Captured canvas cleared');
    }

    // Clear blob URL
    const blob = this.capturedPhotoBlob();
    if (blob) {
      this.capturedPhotoBlob.set(null);
      console.log('[Checkin] 🧹 Photo blob reference cleared');
    }

    // Ask metrics service to clear its accumulated state
    this._metricsService.clearState?.();
  }

  private cleanupDeviceOrientationListener(): void {
    if (this.deviceOrientationHandler) {
      console.log('[Checkin] 🧹 Removing device orientation listener');
      window.removeEventListener('deviceorientation', this.deviceOrientationHandler);
      this.deviceOrientationHandler = null;
    }
  }

  private cleanupTimeouts(): void {
    console.log('[Checkin] 🧹 Clearing active timeouts:', this.activeTimeouts.size);
    this.activeTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();
  }

  private safeSetTimeout(callback: () => void, delay: number): number {
    const timeoutId = window.setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      callback();
    }, delay);
    this.activeTimeouts.add(timeoutId);
    return timeoutId;
  }
}
