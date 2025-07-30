import { Injectable, computed, inject, signal } from '@angular/core';
import { FeatureFlagService } from '../../../shared/data-access/feature-flag.service';
import { LocationAwareThresholdService } from '../location-aware-threshold.service';
import { CarpetEdgeDensityGate } from './carpet-edge-density.gate';
import { CarpetPatternRecognitionGate } from './carpet-pattern-recognition.gate';
import { CarpetTextureGate } from './carpet-texture.gate';
import { EnhancedColorVarianceGate } from './enhanced-color-variance.gate';
import { ImageContrastGate } from './image-contrast.gate';
import { ImageSharpnessGate } from './image-sharpness.gate';
import { MotionStabilityGate } from './motion-stability.gate';
import { SimpleOrientationGate } from './simple-orientation.gate';

export type IntelligentGateStatus = {
  // Basic gates (always available)
  deviceOriented: boolean;
  isStable: boolean;
  lowMotion: boolean;
  goodSharpness: boolean;
  goodContrast: boolean;
  hasTexture: boolean;
  hasEdges: boolean;

  // Enhanced gates (optional)
  enhancedColorAnalysis?: boolean;
  patternRecognition?: boolean;

  // Meta information
  carpetConfidence: 'no' | 'possible' | 'likely' | 'certain';
  intelligenceLevel: 'basic' | 'enhanced' | 'advanced';
  confidenceScore: number; // 0-100
  failedGates: string[];

  // Location-aware
  isLocationOptimized: boolean;
  thresholdSource: string;
};

export type IntelligentGateConfig = {
  useEnhancedAnalysis: boolean;
  useLocationOptimization: boolean;
  dynamicWeighting: boolean;
  fallbackToBasic: boolean;
};

@Injectable({ providedIn: 'root' })
export class CheckinGateCoordinator {
  // Inject all gates
  private readonly simpleOrientationGate = inject(SimpleOrientationGate);
  private readonly motionStabilityGate = inject(MotionStabilityGate);
  private readonly imageSharpnessGate = inject(ImageSharpnessGate);
  private readonly imageContrastGate = inject(ImageContrastGate);
  private readonly carpetTextureGate = inject(CarpetTextureGate);
  private readonly carpetEdgeDensityGate = inject(CarpetEdgeDensityGate);

  // Enhanced gates (optional)
  private readonly enhancedColorGate = inject(EnhancedColorVarianceGate);
  private readonly patternRecognitionGate = inject(CarpetPatternRecognitionGate);

  // Location service
  private readonly locationService = inject(LocationAwareThresholdService);

  // Feature flag service
  private readonly featureFlagService = inject(FeatureFlagService);

  // Configuration
  private readonly _config = signal<IntelligentGateConfig>({
    useEnhancedAnalysis: true,
    useLocationOptimization: true,
    dynamicWeighting: true,
    fallbackToBasic: true,
  });

  readonly config = this._config.asReadonly();

  // Intelligent gate status with dynamic analysis
  readonly intelligentGateStatus = computed((): IntelligentGateStatus => {
    const config = this._config();

    // Always get basic gate status
    const basicStatus = this.getBasicGateStatus();

    // Get enhanced analysis if enabled
    const enhancedStatus = config.useEnhancedAnalysis ? this.getEnhancedGateStatus() : {};

    // Calculate intelligent carpet confidence
    const carpetConfidence = this.calculateIntelligentConfidence(
      basicStatus,
      enhancedStatus,
      config
    );

    // Calculate overall confidence score
    const confidenceScore = this.calculateConfidenceScore(basicStatus, enhancedStatus, config);

    // Determine intelligence level
    const intelligenceLevel = this.determineIntelligenceLevel(config);

    // Get failed gates
    const failedGates = this.getFailedGates(basicStatus, enhancedStatus);

    const result: IntelligentGateStatus = {
      ...basicStatus,
      ...enhancedStatus,
      carpetConfidence,
      intelligenceLevel,
      confidenceScore,
      failedGates,
      isLocationOptimized: this.locationService.isLocationOptimized(),
      thresholdSource: this.locationService.adaptiveThresholds().source,
    };

    console.log('[IntelligentGateCoordinator] Intelligent analysis complete:', {
      carpetConfidence,
      confidenceScore,
      intelligenceLevel,
      failedGatesCount: failedGates.length,
      isLocationOptimized: result.isLocationOptimized,
    });

    return result;
  });

  // Simple gate status for debugging
  readonly gateStatus = computed(() => {
    return {
      deviceOriented: this.featureFlagService.isEnabled('checkinGates.pointDown')
        ? this.simpleOrientationGate.passed()
        : true,
      motionStable: this.featureFlagService.isEnabled('checkinGates.holdSteady')
        ? this.motionStabilityGate.passed()
        : true,
      goodSharpness: this.featureFlagService.isEnabled('checkinGates.sharpness')
        ? this.imageSharpnessGate.passed()
        : true,
      goodContrast: this.featureFlagService.isEnabled('checkinGates.contrast')
        ? this.imageContrastGate.passed()
        : true,
      hasTexture: this.featureFlagService.isEnabled('checkinGates.texture')
        ? this.carpetTextureGate.passed()
        : true,
      hasEdges: this.featureFlagService.isEnabled('checkinGates.pattern')
        ? this.carpetEdgeDensityGate.passed()
        : true,
      colorVariance: this.featureFlagService.isEnabled('checkinGates.colorVariance')
        ? this.enhancedColorGate.passed()
        : true,
      patternRecognition: this.featureFlagService.isEnabled('checkinGates.patternRecognition')
        ? this.patternRecognitionGate.passed()
        : true,
    };
  });

  // Simple boolean - all gates must pass
  readonly allGatesPassed = computed(() => {
    const status = this.gateStatus();
    const allPassed = Object.values(status).every(Boolean);

    if (allPassed) {
      console.log('[CheckinGateCoordinator] ✅ All gates passed!');
    } else {
      const failedGates = Object.entries(status)
        .filter(([_, passed]) => !passed)
        .map(([gate, _]) => gate);
      console.log('[CheckinGateCoordinator] ❌ Failed gates:', failedGates);
    }

    return allPassed;
  });

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IntelligentGateConfig>): void {
    this._config.update(current => ({ ...current, ...config }));
    console.log('[IntelligentGateCoordinator] Configuration updated:', this._config());
  }

  /**
   * Set location context for adaptive thresholds
   */
  setLocationContext(pubId?: string, latitude?: number, longitude?: number): void {
    console.log('[IntelligentGateCoordinator] Setting location context:', {
      pubId,
      latitude,
      longitude,
    });
    this.locationService.updateLocation({ pubId, latitude, longitude });
  }

  /**
   * Get basic gate status (always available)
   */
  private getBasicGateStatus() {
    return {
      deviceOriented: this.featureFlagService.isEnabled('checkinGates.pointDown')
        ? this.simpleOrientationGate.passed()
        : true,
      isStable: this.featureFlagService.isEnabled('checkinGates.holdSteady')
        ? this.motionStabilityGate.passed()
        : true,
      lowMotion: this.featureFlagService.isEnabled('checkinGates.holdSteady')
        ? this.motionStabilityGate.passed()
        : true,
      goodSharpness: this.featureFlagService.isEnabled('checkinGates.sharpness')
        ? this.imageSharpnessGate.passed()
        : true,
      goodContrast: this.featureFlagService.isEnabled('checkinGates.contrast')
        ? this.imageContrastGate.passed()
        : true,
      hasTexture: this.featureFlagService.isEnabled('checkinGates.texture')
        ? this.carpetTextureGate.passed()
        : true,
      hasEdges: this.featureFlagService.isEnabled('checkinGates.pattern')
        ? this.carpetEdgeDensityGate.passed()
        : true,
    };
  }

  /**
   * Get enhanced gate status (optional)
   */
  private getEnhancedGateStatus() {
    return {
      enhancedColorAnalysis: this.enhancedColorGate.passed(),
      patternRecognition: this.patternRecognitionGate.passed(),
    };
  }

  /**
   * Calculate intelligent carpet confidence using multiple signals
   */
  private calculateIntelligentConfidence(
    basicStatus: any,
    enhancedStatus: any,
    config: IntelligentGateConfig
  ): 'no' | 'possible' | 'likely' | 'certain' {
    // Count basic passes
    const basicPasses = Object.values(basicStatus).filter(Boolean).length;
    const totalBasic = Object.values(basicStatus).length;
    const basicRatio = basicPasses / totalBasic;

    // Count enhanced passes if available
    let enhancedRatio = 0;
    if (config.useEnhancedAnalysis) {
      const enhancedPasses = Object.values(enhancedStatus).filter(Boolean).length;
      const totalEnhanced = Object.values(enhancedStatus).length;
      enhancedRatio = totalEnhanced > 0 ? enhancedPasses / totalEnhanced : 0;
    }

    // Combined analysis
    const combinedRatio = config.useEnhancedAnalysis
      ? basicRatio * 0.6 + enhancedRatio * 0.4
      : basicRatio;

    // Location optimization bonus
    const locationBonus = this.locationService.isLocationOptimized() ? 0.1 : 0;
    const finalRatio = Math.min(1, combinedRatio + locationBonus);

    // Classify confidence
    if (finalRatio >= 0.9) return 'certain';
    if (finalRatio >= 0.7) return 'likely';
    if (finalRatio >= 0.4) return 'possible';
    return 'no';
  }

  /**
   * Calculate overall confidence score (0-100)
   */
  private calculateConfidenceScore(
    basicStatus: any,
    enhancedStatus: any,
    config: IntelligentGateConfig
  ): number {
    // Base score from basic gates
    const basicPasses = Object.values(basicStatus).filter(Boolean).length;
    const basicScore = (basicPasses / Object.values(basicStatus).length) * 60; // Max 60 points

    // Enhanced analysis bonus
    let enhancedBonus = 0;
    if (config.useEnhancedAnalysis) {
      const enhancedPasses = Object.values(enhancedStatus).filter(Boolean).length;
      const enhancedTotal = Object.values(enhancedStatus).length;
      enhancedBonus = enhancedTotal > 0 ? (enhancedPasses / enhancedTotal) * 25 : 0; // Max 25 points
    }

    // Location optimization bonus
    const locationBonus = this.locationService.isLocationOptimized() ? 10 : 5; // Max 10 points

    // Adaptive threshold bonus
    const thresholds = this.locationService.adaptiveThresholds();
    const adaptiveBonus = thresholds.confidence * 5; // Max 5 points

    const totalScore = basicScore + enhancedBonus + locationBonus + adaptiveBonus;
    return Math.min(100, Math.round(totalScore));
  }

  /**
   * Determine current intelligence level
   */
  private determineIntelligenceLevel(
    config: IntelligentGateConfig
  ): 'basic' | 'enhanced' | 'advanced' {
    if (config.useEnhancedAnalysis && config.useLocationOptimization && config.dynamicWeighting) {
      return 'advanced';
    }
    if (config.useEnhancedAnalysis || config.useLocationOptimization) {
      return 'enhanced';
    }
    return 'basic';
  }

  /**
   * Get list of failed gates
   */
  private getFailedGates(basicStatus: any, enhancedStatus: any): string[] {
    const failed: string[] = [];

    Object.entries(basicStatus).forEach(([gate, passed]) => {
      if (!passed) failed.push(gate);
    });

    Object.entries(enhancedStatus).forEach(([gate, passed]) => {
      if (!passed) failed.push(gate);
    });

    return failed;
  }

  /**
   * Traditional all-gates-must-pass logic
   */
  private traditionalAllGatesPassed(status: IntelligentGateStatus): boolean {
    return (
      status.deviceOriented &&
      status.isStable &&
      status.lowMotion &&
      status.goodSharpness &&
      status.goodContrast &&
      status.hasTexture &&
      status.hasEdges &&
      status.carpetConfidence !== 'no'
    );
  }

  /**
   * Get human-readable status summary
   */
  getStatusSummary(): string {
    const status = this.intelligentGateStatus();
    return (
      `${status.carpetConfidence.toUpperCase()} carpet confidence ` +
      `(${status.confidenceScore}%) using ${status.intelligenceLevel} analysis ` +
      `${status.isLocationOptimized ? 'with location optimization' : ''}`
    );
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // SimpleOrientationGate doesn't need cleanup
    this.enhancedColorGate.reset();
    this.patternRecognitionGate.reset();
    this.locationService.reset();
  }
}
