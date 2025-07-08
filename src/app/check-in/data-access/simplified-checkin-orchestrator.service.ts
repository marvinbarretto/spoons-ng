// src/app/check-in/data-access/simplified-checkin-orchestrator.service.ts

import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CheckInStore } from './check-in.store';
import { LLMService } from '@shared/data-access/llm.service';
import { CarpetStorageService } from '../../carpets/data-access/carpet-storage.service';
import { environment } from '../../../environments/environment';

type SimplifiedCheckinStage = 
  | 'INITIALIZING'
  | 'CAMERA_STARTING' 
  | 'SCANNING'
  | 'CONDITIONS_MET'
  | 'CAPTURING'
  | 'LLM_CHECKING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED';

type DeviceOrientation = {
  beta: number;  // front-to-back tilt
  gamma: number; // left-to-right tilt
};

type StabilityMetrics = {
  isStable: boolean;
  motionLevel: number;
};

@Injectable({ providedIn: 'root' })
export class SimplifiedCheckinOrchestrator {
  private readonly router = inject(Router);
  private readonly checkinStore = inject(CheckInStore);
  private readonly llmService = inject(LLMService);
  private readonly carpetStorageService = inject(CarpetStorageService);

  // ===================================
  // 🏗️ STATE SIGNALS
  // ===================================
  
  private readonly _stage = signal<SimplifiedCheckinStage>('INITIALIZING');
  private readonly _pubId = signal<string | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _photoDataUrl = signal<string | null>(null);
  private readonly _orientation = signal<DeviceOrientation>({ beta: 0, gamma: 0 });
  private readonly _stability = signal<StabilityMetrics>({ isStable: false, motionLevel: 0 });

  // Camera and video tracking
  private videoElement: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private monitoringInterval: number | null = null;
  private orientationListener: ((event: DeviceOrientationEvent) => void) | null = null;
  private previousOrientation: DeviceOrientation = { beta: 0, gamma: 0 };

  // ===================================
  // 🔍 PUBLIC READONLY SIGNALS
  // ===================================

  readonly stage = this._stage.asReadonly();
  readonly pubId = this._pubId.asReadonly();
  readonly error = this._error.asReadonly();
  readonly photoDataUrl = this._photoDataUrl.asReadonly();
  readonly orientation = this._orientation.asReadonly();
  readonly stability = this._stability.asReadonly();

  // ===================================
  // 🧮 COMPUTED CONDITIONS
  // ===================================

  readonly showCamera = computed(() => {
    const stage = this.stage();
    return stage === 'CAMERA_STARTING' || stage === 'SCANNING' || stage === 'CONDITIONS_MET';
  });

  readonly devicePointingDown = computed(() => {
    const { beta } = this.orientation();
    return beta > -5 && beta < 45; // Device held naturally pointing down
  });

  readonly deviceStable = computed(() => this.stability().isStable);

  readonly conditionsMet = computed(() => {
    return this.devicePointingDown() && this.deviceStable() && this.stage() === 'SCANNING';
  });

  readonly statusMessage = computed(() => {
    const stage = this.stage();
    switch (stage) {
      case 'INITIALIZING': return 'Initializing...';
      case 'CAMERA_STARTING': return 'Starting camera...';
      case 'SCANNING': {
        if (!this.devicePointingDown()) return 'Point device down at carpet';
        if (!this.deviceStable()) return 'Hold steady...';
        return 'Ready to scan';
      }
      case 'CONDITIONS_MET': return 'Conditions met - capturing!';
      case 'CAPTURING': return 'Capturing photo...';
      case 'LLM_CHECKING': return 'Analyzing carpet...';
      case 'PROCESSING': return 'Processing check-in...';
      case 'SUCCESS': return 'Success!';
      case 'FAILED': return this.error() || 'Something went wrong';
      default: return '';
    }
  });

  constructor() {
    // Set up auto-capture effect
    this.setupAutoCapture();
  }

  // ===================================
  // 🚀 MAIN ORCHESTRATION
  // ===================================

  async startCheckin(pubId: string): Promise<void> {
    console.log('[SimplifiedOrchestrator] 🚀 Starting check-in for pub:', pubId);
    
    try {
      this._pubId.set(pubId);
      this._error.set(null);
      this._stage.set('INITIALIZING');

      await this.initializeCamera();
      this.startMonitoring();
      this._stage.set('SCANNING');

    } catch (error: any) {
      console.error('[SimplifiedOrchestrator] ❌ Failed to start:', error);
      this.handleError(error.message || 'Failed to start camera');
    }
  }

  stopCheckin(): void {
    console.log('[SimplifiedOrchestrator] 🛑 Stopping check-in');
    this.cleanup();
    this.router.navigate(['/']);
  }

  retryCheckin(): void {
    console.log('[SimplifiedOrchestrator] 🔄 Retrying check-in');
    this._error.set(null);
    this._stage.set('SCANNING');
  }

  // ===================================
  // 📹 CAMERA MANAGEMENT
  // ===================================

  async setVideoElement(video: HTMLVideoElement): Promise<void> {
    this.videoElement = video;
    if (this.mediaStream) {
      video.srcObject = this.mediaStream;
    }
  }

  private async initializeCamera(): Promise<void> {
    console.log('[SimplifiedOrchestrator] 📹 Initializing camera');
    this._stage.set('CAMERA_STARTING');

    try {
      // Request camera access with rear camera preference
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Attach to video element if available
      if (this.videoElement) {
        this.videoElement.srcObject = this.mediaStream;
      }

      console.log('[SimplifiedOrchestrator] ✅ Camera initialized');

    } catch (error: any) {
      console.error('[SimplifiedOrchestrator] ❌ Camera failed:', error);
      throw new Error('Camera access denied');
    }
  }

  // ===================================
  // 🚦 MONITORING & CONDITIONS
  // ===================================

  private startMonitoring(): void {
    console.log('[SimplifiedOrchestrator] 🚦 Starting monitoring');

    // Monitor device orientation
    this.startOrientationMonitoring();

    // Monitor stability and conditions
    this.monitoringInterval = window.setInterval(() => {
      this.updateStability();
    }, 200); // Check 5 times per second

    // DEV MODE: Log that dev mode is active but wait for conditions
    if (environment.ACTIVE_DEVELOPMENT_MODE) {
      console.log('[SimplifiedOrchestrator] 🧪 DEV MODE: Active - waiting for conditions to be met');
    }
  }

  private startOrientationMonitoring(): void {
    if ('DeviceOrientationEvent' in window) {
      this.orientationListener = (event: DeviceOrientationEvent) => {
        this._orientation.set({
          beta: event.beta || 0,
          gamma: event.gamma || 0
        });
      };
      
      window.addEventListener('deviceorientation', this.orientationListener);
    } else {
      console.warn('[SimplifiedOrchestrator] ⚠️ Device orientation not supported');
      // Mock orientation for desktop/testing
      this._orientation.set({ beta: 90, gamma: 0 });
    }
  }

  private updateStability(): void {
    // Simple stability check based on orientation changes
    const currentOrientation = this._orientation();
    
    // Calculate motion level (simplified)
    const betaDiff = Math.abs(currentOrientation.beta - this.previousOrientation.beta);
    const gammaDiff = Math.abs(currentOrientation.gamma - this.previousOrientation.gamma);
    const motionLevel = betaDiff + gammaDiff;

    // Device is stable if motion is minimal
    const isStable = motionLevel < 5; // Threshold for stability

    this._stability.set({
      isStable,
      motionLevel: Math.round(motionLevel)
    });

    // Update previous orientation for next comparison
    this.previousOrientation = { ...currentOrientation };
  }

  private setupAutoCapture(): void {
    effect(() => {
      if (this.conditionsMet()) {
        console.log('[SimplifiedOrchestrator] ✅ Conditions met!');
        this._stage.set('CONDITIONS_MET');
        
        // Brief delay to show user confirmation, then capture
        setTimeout(() => {
          if (this.stage() === 'CONDITIONS_MET') {
            this.capturePhoto();
          }
        }, 500); // Shorter 500ms delay
      }
    });
  }

  // ===================================
  // 📸 PHOTO CAPTURE & PROCESSING
  // ===================================

  private async capturePhoto(): Promise<void> {
    console.log('[SimplifiedOrchestrator] 📸 Capturing photo');
    this._stage.set('CAPTURING');

    try {
      if (!this.videoElement) {
        throw new Error('No video element available');
      }

      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;
      
      ctx.drawImage(this.videoElement, 0, 0);

      // Convert to data URL for preview
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      this._photoDataUrl.set(photoDataUrl);

      // Stop camera since we have the photo
      this.stopCamera();

      // Process the photo
      if (environment.LLM_CHECK) {
        await this.checkWithLLM(photoDataUrl);
      } else {
        console.log('[SimplifiedOrchestrator] 🧪 DEV MODE: Skipping LLM');
        await this.processCheckin(canvas);
      }

    } catch (error: any) {
      console.error('[SimplifiedOrchestrator] ❌ Capture failed:', error);
      this.handleError('Failed to capture photo');
    }
  }

  private async checkWithLLM(photoDataUrl: string): Promise<void> {
    console.log('[SimplifiedOrchestrator] 🤖 Checking with LLM');
    this._stage.set('LLM_CHECKING');

    try {
      const result = await this.llmService.detectCarpet(photoDataUrl);
      
      if (result.success && result.data.isCarpet) {
        console.log('[SimplifiedOrchestrator] ✅ LLM confirmed carpet');
        // Convert data URL back to canvas for storage
        const canvas = await this.dataUrlToCanvas(photoDataUrl);
        await this.processCheckin(canvas);
      } else {
        console.log('[SimplifiedOrchestrator] ❌ LLM rejected:', result.error);
        this.handleNotCarpet(result.error || 'Not detected as carpet');
      }

    } catch (error: any) {
      console.error('[SimplifiedOrchestrator] ❌ LLM failed:', error);
      this.handleError('Failed to verify carpet');
    }
  }

  private async processCheckin(canvas: HTMLCanvasElement): Promise<void> {
    console.log('[SimplifiedOrchestrator] ⚡ Processing check-in');
    this._stage.set('PROCESSING');

    try {
      const pubId = this._pubId();
      if (!pubId) throw new Error('No pub ID');

      // Store carpet image
      console.log('[SimplifiedOrchestrator] 💾 Storing carpet image');
      await this.carpetStorageService.saveCarpetImage(canvas, pubId, 'Carpet Image');

      // Execute check-in
      await this.checkinStore.checkinToPub(pubId);
      this._stage.set('SUCCESS');
      
      console.log('[SimplifiedOrchestrator] 🎉 Check-in successful!');

    } catch (error: any) {
      console.error('[SimplifiedOrchestrator] ❌ Processing failed:', error);
      this.handleError('Check-in failed');
    }
  }

  private async dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.src = dataUrl;
    });
  }

  // ===================================
  // 🚨 ERROR HANDLING
  // ===================================

  private handleError(message: string): void {
    this._error.set(message);
    this._stage.set('FAILED');
    this.stopMonitoring();
  }

  private handleNotCarpet(reason: string): void {
    this._error.set(`Not a carpet: ${reason}`);
    this._stage.set('FAILED');
    
    // Auto-retry after 3 seconds
    setTimeout(() => {
      if (this.stage() === 'FAILED') {
        this.retryCheckin();
      }
    }, 3000);
  }

  // ===================================
  // 🧹 CLEANUP
  // ===================================

  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.orientationListener) {
      window.removeEventListener('deviceorientation', this.orientationListener);
      this.orientationListener = null;
    }
  }

  cleanup(): void {
    console.log('[SimplifiedOrchestrator] 🧹 Cleaning up');
    
    this.stopCamera();
    this.stopMonitoring();
    
    // Reset state
    this._stage.set('INITIALIZING');
    this._pubId.set(null);
    this._error.set(null);
    this._photoDataUrl.set(null);
    
    this.videoElement = null;
  }
}