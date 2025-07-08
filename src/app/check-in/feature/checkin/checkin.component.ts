import { Component, inject, OnDestroy, signal, ElementRef, ViewChild, OnInit, AfterViewInit, computed, effect, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@shared/base/base.component';
import { CheckInStore } from '../../data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import {
  CarpetImageAnalysisService,
  CheckinCameraService,
  CheckinCaptureService,
  CheckinStateMachineService,
  CheckinGateCoordinator,
  SimpleOrientationGate,
  CHECKIN_UI_MESSAGES,
  CHECKIN_TIMINGS,
  CHECKIN_ANALYSIS_MESSAGES
} from '../../data-access';
import { LLMService } from '@shared/data-access/llm.service';
import { CarpetStorageService } from '../../../carpets/data-access/carpet-storage.service';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import type { CarpetDetectionResult } from '@shared/utils/llm-types';

@Component({
  selector: 'app-checkin',
  imports: [CommonModule],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.scss'
})
export class CheckinComponent extends BaseComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  // Core services
  protected readonly activatedRoute = inject(ActivatedRoute);
  protected readonly checkinStore = inject(CheckInStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly llmService = inject(LLMService);
  protected readonly carpetStorageService = inject(CarpetStorageService);

  // New refactored services
  protected readonly cameraService = inject(CheckinCameraService);
  protected readonly captureService = inject(CheckinCaptureService);
  protected readonly stateService = inject(CheckinStateMachineService);
  protected readonly analysisService = inject(CarpetImageAnalysisService);
  protected readonly gateCoordinator = inject(CheckinGateCoordinator);
  protected readonly orientationGate = inject(SimpleOrientationGate);

  // UI state
  protected readonly pubId = signal<string | null>(null);
  protected readonly currentAnalysisMessage = signal(CHECKIN_UI_MESSAGES.CAMERA_STARTING);

  // Intervals
  private metricsAnalysisInterval: number | null = null;
  private gateMonitoringInterval: number | null = null;
  private analysisMessageInterval: number | null = null;

  // LLM state
  private llmResponse: CarpetDetectionResult | null = null;

  // Constants
  protected readonly ACTIVE_DEVELOPMENT_MODE = environment.ACTIVE_DEVELOPMENT_MODE;
  protected readonly LLM_CHECK = environment.LLM_CHECK;
  protected readonly UI_MESSAGES = CHECKIN_UI_MESSAGES;

  // Expose signals from services for template
  protected readonly currentPhase = this.stateService.phase;
  protected readonly metrics = this.analysisService.metrics;
  protected readonly isAnalyzing = this.analysisService.isAnalyzing;
  protected readonly deviceOrientation = this.orientationGate.orientation;
  protected readonly gatesPassed = this.gateCoordinator.gateStatus;
  protected readonly allGatesPassed = this.gateCoordinator.allGatesPassed;
  protected readonly capturedPhotoUrl = computed(() => this.captureService.photoDataUrl());

  // Results from CheckInStore
  protected readonly pointsEarned = computed(() => {
    const result = this.checkinStore.checkinResults();
    return result?.success ? (result.points?.total || 0) : 0;
  });

  protected readonly badgesEarned = computed(() => {
    const result = this.checkinStore.checkinResults();
    return result?.success ? (result.badges || []) : [];
  });

  protected readonly pubName = computed(() => {
    const id = this.pubId();
    return id ? this.pubStore.get(id)?.name || 'Unknown Pub' : 'Unknown Pub';
  });

  constructor() {
    super();
    console.log('[Checkin] 🎬 Component initialized with refactored services');

    // Set up reactive effects
    this.setupReactiveEffects();
  }

  private setupReactiveEffects(): void {
    // Auto-capture when all gates pass
    effect(() => {
      if (this.allGatesPassed() && this.currentPhase() === 'WAITING_FOR_GATES') {
        console.log('[Checkin] ✅ All gates passed - auto-capturing');
        this.capturePhoto();
      }
    });

    // Clean up intervals when phase changes
    effect(() => {
      const phase = this.currentPhase();
      if (phase !== 'WAITING_FOR_GATES') {
        this.cleanupIntervals();
      }
    });
  }

  override ngOnInit(): void {
    const pubIdParam = this.activatedRoute.snapshot.paramMap.get('pubId');

    if (!pubIdParam) {
      console.log('[Checkin] ❌ No pub ID provided, navigating to homepage');
      this.router.navigate(['/']);
      return;
    }

    this.pubId.set(pubIdParam);
    console.log('[Checkin] 🚀 Starting check-in for pub:', pubIdParam);
  }

  ngAfterViewInit(): void {
    console.log('[Checkin] 📹 View initialized - starting camera');
    this.startCamera();
  }

  ngOnDestroy(): void {
    console.log('[Checkin] 🚪 Component destroyed - cleaning up');
    this.cleanup();
  }

  private async startCamera(): Promise<void> {
    try {
      await this.cameraService.startCamera(this.videoElement.nativeElement);
      this.stateService.transitionTo('WAITING_FOR_GATES');
      this.startGateMonitoring();
    } catch (error) {
      console.error('[Checkin] ❌ Failed to start camera:', error);
      this.stateService.setError('Failed to start camera');
    }
  }

  private startGateMonitoring(): void {
    console.log('[Checkin] 🚦 Starting gate monitoring');

    // Clean up any existing intervals
    this.cleanupIntervals();

    // Start metrics analysis
    this.startMetricsAnalysis();

    // DEV MODE: Auto-capture after delay
    if (this.ACTIVE_DEVELOPMENT_MODE) {
      console.log('[Checkin] 🧪 DEV MODE: Auto-capture in', CHECKIN_TIMINGS.DEV_MODE_AUTO_CAPTURE, 'ms');
      setTimeout(() => {
        console.log('[Checkin] 🧪 DEV MODE: Triggering auto-capture');
        this.capturePhoto();
      }, CHECKIN_TIMINGS.DEV_MODE_AUTO_CAPTURE);
    }
  }

  private startMetricsAnalysis(): void {
    console.log('[Checkin] 🔬 Starting metrics analysis');

    this.metricsAnalysisInterval = window.setInterval(async () => {
      if (this.videoElement?.nativeElement && this.cameraService.canCapture()) {
        try {
          await this.analysisService.analyzeVideoFrame(this.videoElement.nativeElement);
        } catch (error) {
          console.error('[Checkin] ❌ Analysis error:', error);
        }
      }
    }, CHECKIN_TIMINGS.METRICS_ANALYSIS_INTERVAL);
  }

  protected async capturePhoto(): Promise<void> {
    console.log('[Checkin] 📸 Capturing photo');

    try {
      const video = this.videoElement.nativeElement;
      const photo = await this.captureService.capturePhoto(video);

      // Stop camera after capture
      this.cameraService.stopCamera();

      this.stateService.transitionTo('PHOTO_CAPTURED');
      this.startLLMAnalysis();
    } catch (error) {
      console.error('[Checkin] ❌ Photo capture failed:', error);
      this.stateService.setError('Failed to capture photo');
    }
  }

  private async startLLMAnalysis(): Promise<void> {
    console.log('[Checkin] 🤖 Starting LLM analysis');

    this.stateService.transitionTo('LLM_THINKING');
    this.startAnalysisMessageCycling();

    try {
      const photoData = this.captureService.photoDataUrl();
      if (!photoData) {
        throw new Error('No photo data available');
      }

      // Check if LLM is enabled
      if (!this.LLM_CHECK) {
        console.log('[Checkin] 🔧 LLM check disabled - assuming carpet');
        await new Promise(resolve => setTimeout(resolve, CHECKIN_TIMINGS.LLM_BYPASS_DELAY));

        this.llmResponse = {
          isCarpet: true,
          confidence: 0.95,
          reasoning: 'LLM check disabled - assuming carpet detected',
          visualElements: ['mock-pattern']
        };

        this.stopAnalysisMessageCycling();
        this.executeCheckin();
        return;
      }

      // Real LLM analysis
      const result = await this.llmService.detectCarpet(photoData);
      this.stopAnalysisMessageCycling();

      if (result.success && result.data.isCarpet) {
        console.log('[Checkin] ✅ Carpet detected! Confidence:', result.data.confidence);
        this.llmResponse = result.data;
        this.executeCheckin();
      } else {
        console.log('[Checkin] ❌ Not a carpet');
        this.stateService.transitionTo('NOT_CARPET_DETECTED');

        setTimeout(() => {
          this.exitToHomepage();
        }, CHECKIN_TIMINGS.RETRY_DELAY);
      }
    } catch (error) {
      console.error('[Checkin] ❌ LLM analysis error:', error);
      this.stopAnalysisMessageCycling();
      this.stateService.transitionTo('NOT_CARPET_DETECTED');

      setTimeout(() => {
        this.exitToHomepage();
      }, CHECKIN_TIMINGS.RETRY_DELAY);
    }
  }

  private async executeCheckin(): Promise<void> {
    console.log('[Checkin] ✅ Executing check-in');
    this.stateService.transitionTo('CHECK_IN_PROCESSING');

    const pubId = this.pubId();
    if (!pubId) {
      console.error('[Checkin] ❌ No pub ID for check-in');
      return;
    }

    try {
      // Store carpet image if we have it
      const photo = this.captureService.capturedPhoto();
      if (photo && this.llmResponse) {
        console.log('[Checkin] 💾 Storing carpet image');
        await this.carpetStorageService.saveCarpetImage(
          photo.canvas,
          pubId,
          this.pubName()
        );
      }

      // Execute check-in
      await this.checkinStore.checkinToPub(pubId);
      console.log('[Checkin] ✅ Check-in submitted successfully');

    } catch (error: any) {
      console.error('[Checkin] ❌ Check-in error:', error);
      this.showError(`Check-in failed: ${error?.message || 'Unknown error'}`);
    }
  }

  private startAnalysisMessageCycling(): void {
    let messageIndex = 0;
    this.currentAnalysisMessage.set(CHECKIN_ANALYSIS_MESSAGES[messageIndex]);

    this.analysisMessageInterval = window.setInterval(() => {
      messageIndex = (messageIndex + 1) % CHECKIN_ANALYSIS_MESSAGES.length;
      this.currentAnalysisMessage.set(CHECKIN_ANALYSIS_MESSAGES[messageIndex]);
    }, CHECKIN_TIMINGS.ANALYSIS_MESSAGE_CYCLE);
  }

  private stopAnalysisMessageCycling(): void {
    if (this.analysisMessageInterval) {
      clearInterval(this.analysisMessageInterval);
      this.analysisMessageInterval = null;
    }
  }

  protected exitToHomepage(): void {
    console.log('[Checkin] 🏠 Navigating to homepage');
    this.cleanup();
    this.router.navigate(['/']);
  }

  protected getMotionHistoryString(): string {
    return 'Debug mode'; // Simplified for now
  }

  private cleanupIntervals(): void {
    console.log('[Checkin] 🧹 Cleaning up intervals');

    if (this.gateMonitoringInterval) {
      clearInterval(this.gateMonitoringInterval);
      this.gateMonitoringInterval = null;
    }

    if (this.metricsAnalysisInterval) {
      clearInterval(this.metricsAnalysisInterval);
      this.metricsAnalysisInterval = null;
    }

    this.stopAnalysisMessageCycling();
  }

  // Device Orientation Event Handler
  @HostListener('window:deviceorientation', ['$event'])
  onDeviceOrientation(event: DeviceOrientationEvent): void {
    // Round beta to integer
    const roundedBeta = event.beta !== null ? Math.round(event.beta) : null;

    // Update the simple orientation gate
    this.orientationGate.updateBeta(roundedBeta);
  }

  private cleanup(): void {
    console.log('[Checkin] 🧹 Comprehensive cleanup');

    // Clean up intervals
    this.cleanupIntervals();

    // Clean up services
    this.cameraService.cleanup();
    this.captureService.cleanup();
    this.analysisService.clearState();
    this.gateCoordinator.cleanup();

    // Reset state
    this.stateService.reset();
  }
}
