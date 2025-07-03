import { Injectable, inject, computed, signal } from '@angular/core';
import { SimpleMetricsService } from './simple-metrics.service';

/**
 * Validates photo readiness for carpet check-ins
 * 
 * SCOPE:
 * - Real-time camera metrics analysis (sharpness, contrast, motion, texture)
 * - Carpet detection confidence scoring (red/yellow/green)
 * - Gate validation rules and threshold management
 * - "Ready to capture" determination based on all validation criteria
 * - Motion tracking and stability detection
 * 
 * DOES NOT HANDLE:
 * - Camera hardware access or photo capture (handled by CameraService)
 * - Device orientation monitoring (handled by CheckinOrientationService)
 * - UI state transitions or flow management (handled by CheckinFlowService)
 * - LLM analysis or carpet detection logic (handled by CheckinAnalysisService)
 */
@Injectable({
  providedIn: 'root'
})
export class CheckinPhotoValidationService {
  private readonly metricsService = inject(SimpleMetricsService);

  // Gate validation state
  private readonly _isMonitoring = signal(false);
  readonly isMonitoring = this._isMonitoring.asReadonly();

  // Expose metrics from SimpleMetricsService
  readonly metrics = this.metricsService.metrics;
  readonly isAnalyzing = this.metricsService.isAnalyzing;

  /**
   * Compute gate validation status for all check-in requirements
   * 
   * Evaluates all technical requirements for carpet photo capture:
   * - Image quality gates (sharpness, contrast)
   * - Motion and stability gates
   * - Texture and edge detection for carpet identification
   * - Carpet confidence scoring system
   * 
   * @param deviceOriented Whether device is properly oriented (from CheckinOrientationService)
   * @param isStable Whether device is stable (from CheckinOrientationService)
   * @returns Object with detailed gate validation results
   */
  readonly computeGatesPassed = computed(() => {
    const data = this.metrics();
    
    if (!data) {
      return {
        deviceOriented: false,
        isStable: false,
        goodSharpness: false,
        goodContrast: false,
        lowMotion: false,
        hasEdges: false,
        hasTexture: false,
        carpetConfidence: 'red' as 'red' | 'yellow' | 'green'
      };
    }

    // Image quality gates
    const goodSharpness = data.sharpness >= 25;
    const goodContrast = data.contrast >= 30;
    const lowMotion = data.motionLevel <= 15;

    // Pattern detection gates
    const hasEdges = data.edgeDensity >= 25;
    const hasTexture = data.textureComplexity >= 15;

    // Carpet confidence calculation
    const carpetConfidence = this.calculateCarpetConfidence(data);

    console.log('[PhotoValidation] 🚦 Gate validation:', {
      sharpness: data.sharpness,
      contrast: data.contrast,
      motionLevel: data.motionLevel,
      edgeDensity: data.edgeDensity,
      textureComplexity: data.textureComplexity,
      carpetConfidence,
      gates: {
        goodSharpness,
        goodContrast,
        lowMotion,
        hasEdges,
        hasTexture
      }
    });

    return {
      deviceOriented: false, // This will be provided by CheckinOrientationService
      isStable: false,       // This will be provided by CheckinOrientationService
      goodSharpness,
      goodContrast,
      lowMotion,
      hasEdges,
      hasTexture,
      carpetConfidence
    };
  });

  /**
   * Check if all validation gates are passed and ready for photo capture
   * 
   * @param deviceOriented Whether device is properly oriented
   * @param isStable Whether device is stable
   * @returns true if all gates are passed
   */
  readonly computeAllGatesPassed = computed(() => {
    return false; // Will be updated when integrated with orientation service
  });

  /**
   * Start monitoring camera metrics for validation
   * Integrates with SimpleMetricsService to begin analysis
   * 
   * @param videoElement Video element to analyze
   */
  startMonitoring(videoElement: HTMLVideoElement): void {
    console.log('[PhotoValidation] 🔍 Starting photo validation monitoring');
    this._isMonitoring.set(true);
    
    // Start metrics analysis through SimpleMetricsService
    // The service will handle the interval and analysis
    this.metricsService.startAnalysis?.(videoElement);
  }

  /**
   * Stop monitoring camera metrics
   */
  stopMonitoring(): void {
    console.log('[PhotoValidation] 🔍 Stopping photo validation monitoring');
    this._isMonitoring.set(false);
    
    // Stop metrics analysis
    this.metricsService.stopAnalysis?.();
  }

  /**
   * Calculate carpet detection confidence based on metrics
   * 
   * SCOPE:
   * - Analyzes image metrics to determine carpet likelihood
   * - Uses sharpness, edge density, and texture complexity
   * - Returns confidence level as color-coded system
   * 
   * @param metrics Current image analysis metrics
   * @returns Confidence level: 'red' (poor), 'yellow' (borderline), 'green' (good)
   */
  private calculateCarpetConfidence(metrics: any): 'red' | 'yellow' | 'green' {
    const { sharpness, edgeDensity, textureComplexity } = metrics;

    console.log('[PhotoValidation] 🎯 Calculating carpet confidence:', {
      sharpness,
      edgeDensity,
      textureComplexity
    });

    // GREEN: Strong carpet indicators
    // High texture complexity suggests pattern, good sharpness for detail, edges for structure
    if (textureComplexity >= 20 && sharpness >= 30 && edgeDensity >= 30) {
      return 'green';
    }

    // GREEN: Alternative high-confidence pattern (very high texture even with lower other metrics)
    if (textureComplexity >= 35) {
      return 'green';
    }

    // RED: Clear non-carpet indicators
    // Very low values across all metrics suggest smooth surfaces (walls, tables, floors)
    if (sharpness < 15 && edgeDensity < 25 && textureComplexity < 12) {
      return 'red';
    }

    // YELLOW: Borderline detection - might be carpet but not confident
    return 'yellow';
  }

  /**
   * Get motion history for debugging display
   * 
   * @returns String representation of motion data
   */
  getMotionHistoryString(): string {
    // This would need to be implemented in SimpleMetricsService
    // For now, return debug placeholder
    return 'Debug mode';
  }

  /**
   * Clean up validation state and stop monitoring
   */
  cleanup(): void {
    console.log('[PhotoValidation] 🧹 Cleaning up photo validation service');
    this.stopMonitoring();
    this.metricsService.clearState?.();
  }
}