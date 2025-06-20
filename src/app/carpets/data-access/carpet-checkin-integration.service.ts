// src/app/carpets/data-access/carpet-checkin-integration.service.ts
import { Injectable, inject } from '@angular/core';
import { DynamicCarpetMatcherService } from './dynamic-carpet-matcher.service';
import { DeviceCarpetStorageService } from './device-carpet-storage.service';
import { ReferenceImageAnalyzerService } from './reference-image-analyzer.service';
import { PubStore } from '../../pubs/data-access/pub.store';
import { OverlayService } from '@shared/data-access/overlay.service';
import { CarpetCameraComponent, CarpetCameraResult } from '../ui/carpet-camera/carpet-camera.component';

export type CarpetDetectionResult = {
  success: boolean;
  imageKey?: string;
  confidence?: number;
  matchType?: string;
  error?: string;
};

@Injectable({ providedIn: 'root' })
export class CarpetCheckinIntegrationService {
  private readonly carpetMatcherService = inject(DynamicCarpetMatcherService);
  private readonly deviceStorageService = inject(DeviceCarpetStorageService);
  private readonly referenceAnalyzerService = inject(ReferenceImageAnalyzerService);
  private readonly pubStore = inject(PubStore);
  private readonly overlayService = inject(OverlayService);

  private detectionActive = false;
  private mediaStream: MediaStream | null = null;

  /**
   * Check if pub has carpet references
   */
  async pubHasCarpetReferences(pubId: string): Promise<boolean> {
    console.log('[CarpetIntegration] Checking references for pub:', pubId);

    try {
      // For now, assume all pubs have carpet references
      // TODO: Implement actual reference checking when service is ready
      const hasReferences = true;

      console.log('[CarpetIntegration]', hasReferences ? '✅ Pub has carpet references' : '❌ No references found');
      return hasReferences;
    } catch (error) {
      console.error('[CarpetIntegration] Error checking references:', error);
      return false;
    }
  }

/**
   * Main detection and capture flow - now with UI
   */
async detectAndCaptureCarpet(pubId: string): Promise<CarpetDetectionResult> {
  console.log('[CarpetIntegration] Starting carpet detection for pub:', pubId);

  try {
    // Initialize storage
    await this.deviceStorageService.initialize();

    // Dynamically import and open camera component
    const { CarpetCameraComponent } = await import('../ui/carpet-camera/carpet-camera.component');

    console.log('[CarpetIntegration] Opening carpet camera UI...');

    const { componentRef, result } = this.overlayService.open<CarpetCameraComponent, CarpetCameraResult>(
      CarpetCameraComponent,
      {}, // overlay config
      { pubId } // component inputs
    );

    // Wait for camera result
    const cameraResult = await result;
    console.log('[CarpetIntegration] Camera result:', cameraResult);

    if (!cameraResult || !cameraResult.success || cameraResult.cancelled) {
      console.log('[CarpetIntegration] User cancelled or camera failed');
      return {
        success: false,
        error: 'Camera cancelled by user'
      };
    }

    // Get the captured canvas from the component
    const canvas = componentRef.instance.getCapturedCanvas();

    if (!canvas) {
      console.log('[CarpetIntegration] No canvas captured');
      return {
        success: false,
        error: 'No image captured'
      };
    }

    // Save the captured image
    const pub = this.pubStore.get(pubId);
    const imageKey = await this.deviceStorageService.captureCarpetImage(
      canvas,
      pubId,
      pub?.name || 'Unknown Pub'
    );

    console.log('[CarpetIntegration] Image saved successfully:', imageKey);

    return {
      success: true,
      imageKey,
      confidence: cameraResult.confidence || 0,
      matchType: 'user-captured'
    };

  } catch (error: any) {
    console.error('[CarpetIntegration] Detection error:', error);
    return {
      success: false,
      error: error.message || 'Camera access failed'
    };
  }
}




  /**
   * Stop detection manually
   */
  stopDetection(): void {
    console.log('[CarpetIntegration] Stopping detection...');
    this.detectionActive = false;
    this.cleanup();
  }

  /**
 * Simple confidence calculation for carpet matching
 */
private async calculateCarpetConfidence(canvas: HTMLCanvasElement, pubId: string): Promise<number> {
  // For now, return a random confidence for testing
  // TODO: Implement actual carpet matching logic
  const baseConfidence = 0.3 + Math.random() * 0.5; // 0.3 to 0.8

  // Simulate some variability
  if (Math.random() > 0.7) {
    return Math.min(0.95, baseConfidence + 0.2); // Sometimes get a good match
  }

  return baseConfidence;
}


  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.detectionActive = false;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
      console.log('[CarpetIntegration] Camera stream stopped');
    }
  }
}
