import { Injectable, signal, computed } from '@angular/core';
import {
  getCarpetByPubId,
  getCarpetsByLocation,
  type CarpetData,
  type CarpetSignature
} from '../utils/carpet-database.utils';
import { CHECKIN_GATE_THRESHOLDS } from './gates/checkin-thresholds.config';

export type LocationContext = {
  pubId?: string;
  latitude?: number;
  longitude?: number;
};

export type AdaptiveThresholds = {
  sharpness: number;
  contrast: number;
  edgeDensity: number;
  textureComplexity: number;
  motionLevel: number;
  source: 'pub-specific' | 'location-based' | 'pattern-based' | 'default';
  confidence: number; // 0-1, how confident we are in these thresholds
  carpetInfo?: {
    patternType: CarpetSignature['pattern'];
    description: string;
    expectedColors: string[];
  };
};

@Injectable({ providedIn: 'root' })
export class LocationAwareThresholdService {
  // Current context
  private readonly _locationContext = signal<LocationContext>({});
  private readonly _adaptiveThresholds = signal<AdaptiveThresholds>(this.getDefaultThresholds());

  // Public readonly signals
  readonly locationContext = this._locationContext.asReadonly();
  readonly adaptiveThresholds = this._adaptiveThresholds.asReadonly();

  // Computed helpers
  readonly hasPubData = computed(() => {
    const context = this._locationContext();
    return !!context.pubId && !!getCarpetByPubId(context.pubId);
  });

  readonly hasLocationData = computed(() => {
    const context = this._locationContext();
    return context.latitude !== undefined && context.longitude !== undefined;
  });

  /**
   * Update location context and recalculate thresholds
   */
  updateLocation(context: LocationContext): void {
    console.log('[LocationAwareThreshold] Updating location context:', context);

    this._locationContext.set(context);
    const thresholds = this.calculateAdaptiveThresholds(context);
    this._adaptiveThresholds.set(thresholds);

    console.log('[LocationAwareThreshold] Adaptive thresholds calculated:', {
      source: thresholds.source,
      confidence: Math.round(thresholds.confidence * 100) + '%',
      thresholds: {
        sharpness: thresholds.sharpness,
        contrast: thresholds.contrast,
        edgeDensity: thresholds.edgeDensity,
        textureComplexity: thresholds.textureComplexity
      },
      carpetInfo: thresholds.carpetInfo
    });
  }

  /**
   * Calculate adaptive thresholds based on location context
   */
  private calculateAdaptiveThresholds(context: LocationContext): AdaptiveThresholds {
    // Strategy 1: Pub-specific data (highest confidence)
    if (context.pubId) {
      const pubCarpet = getCarpetByPubId(context.pubId);
      if (pubCarpet) {
        return this.createPubSpecificThresholds(pubCarpet);
      }
    }

    // Strategy 2: Location-based data (medium confidence)
    if (context.latitude !== undefined && context.longitude !== undefined) {
      const nearbyCarpets = getCarpetsByLocation(context.latitude, context.longitude, 0.5); // 500m radius
      if (nearbyCarpets.length > 0) {
        return this.createLocationBasedThresholds(nearbyCarpets);
      }
    }

    // Strategy 3: Pattern-based generic (low confidence)
    // Could be enhanced with pattern detection from video feed in the future

    // Strategy 4: Default fallback
    return this.getDefaultThresholds();
  }

  /**
   * Create thresholds based on specific pub data
   */
  private createPubSpecificThresholds(carpet: CarpetData): AdaptiveThresholds {
    const signature = carpet.signature;

    // Convert 0-1 signature values to gate threshold ranges
    const baseSharpness = Math.round(signature.textureScore * 30); // 0-30 range
    const baseContrast = Math.round(signature.contrast * 60); // 0-60 range
    const baseEdges = Math.round(signature.complexity * 40); // 0-40 range
    const baseTexture = Math.round(signature.complexity * 30); // 0-30 range

    // Apply pattern-specific adjustments
    const patternAdjustments = this.getPatternAdjustments(signature.pattern);

    return {
      sharpness: Math.max(5, baseSharpness + patternAdjustments.sharpness),
      contrast: Math.max(10, baseContrast + patternAdjustments.contrast),
      edgeDensity: Math.max(8, baseEdges + patternAdjustments.edgeDensity),
      textureComplexity: Math.max(5, baseTexture + patternAdjustments.textureComplexity),
      motionLevel: CHECKIN_GATE_THRESHOLDS.deviceStability.maxMovement, // Keep motion threshold standard
      source: 'pub-specific',
      confidence: 0.9,
      carpetInfo: {
        patternType: signature.pattern,
        description: carpet.description,
        expectedColors: signature.colors
      }
    };
  }

  /**
   * Create thresholds based on nearby carpets
   */
  private createLocationBasedThresholds(nearbyCarpets: CarpetData[]): AdaptiveThresholds {
    // Calculate average signature values from nearby carpets
    const avgSignature = {
      textureScore: nearbyCarpets.reduce((sum, c) => sum + c.signature.textureScore, 0) / nearbyCarpets.length,
      contrast: nearbyCarpets.reduce((sum, c) => sum + c.signature.contrast, 0) / nearbyCarpets.length,
      complexity: nearbyCarpets.reduce((sum, c) => sum + c.signature.complexity, 0) / nearbyCarpets.length
    };

    // Find most common pattern type
    const patternCounts = nearbyCarpets.reduce((counts, carpet) => {
      counts[carpet.signature.pattern] = (counts[carpet.signature.pattern] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const mostCommonPattern = Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as CarpetSignature['pattern'] || 'mixed';

    return {
      sharpness: Math.round(avgSignature.textureScore * 25),
      contrast: Math.round(avgSignature.contrast * 50),
      edgeDensity: Math.round(avgSignature.complexity * 35),
      textureComplexity: Math.round(avgSignature.complexity * 25),
      motionLevel: CHECKIN_GATE_THRESHOLDS.deviceStability.maxMovement,
      source: 'location-based',
      confidence: 0.7,
      carpetInfo: {
        patternType: mostCommonPattern,
        description: `Area typical pattern: ${mostCommonPattern} (${nearbyCarpets.length} nearby carpets)`,
        expectedColors: []
      }
    };
  }

  /**
   * Get pattern-specific threshold adjustments
   */
  private getPatternAdjustments(pattern: CarpetSignature['pattern']) {
    switch (pattern) {
      case 'geometric':
        return {
          sharpness: 5,      // Geometric patterns have sharp edges
          contrast: 10,      // High contrast
          edgeDensity: 8,    // Clear edges
          textureComplexity: 0 // Usually simpler textures
        };

      case 'ornamental':
        return {
          sharpness: -2,     // Softer edges
          contrast: -5,      // Lower contrast
          edgeDensity: 2,    // Some edge definition
          textureComplexity: 8 // Complex textures
        };

      case 'plain':
        return {
          sharpness: -5,     // Very soft
          contrast: -10,     // Low contrast
          edgeDensity: -5,   // Few edges
          textureComplexity: -3 // Simple texture
        };

      case 'mixed':
      default:
        return {
          sharpness: 0,      // Balanced
          contrast: 0,
          edgeDensity: 0,
          textureComplexity: 0
        };
    }
  }

  /**
   * Get default thresholds when no location data available
   */
  private getDefaultThresholds(): AdaptiveThresholds {
    return {
      sharpness: CHECKIN_GATE_THRESHOLDS.sharpness.min,
      contrast: CHECKIN_GATE_THRESHOLDS.contrast.min,
      edgeDensity: CHECKIN_GATE_THRESHOLDS.edgeDensity.min,
      textureComplexity: CHECKIN_GATE_THRESHOLDS.textureComplexity.min,
      motionLevel: CHECKIN_GATE_THRESHOLDS.deviceStability.maxMovement,
      source: 'default',
      confidence: 0.5
    };
  }

  /**
   * Get carpet information for current location
   */
  getCarpetInfo(): string {
    const thresholds = this._adaptiveThresholds();
    if (thresholds.carpetInfo) {
      return `${thresholds.carpetInfo.patternType} pattern: ${thresholds.carpetInfo.description}`;
    }
    return `Using ${thresholds.source} thresholds with ${Math.round(thresholds.confidence * 100)}% confidence`;
  }

  /**
   * Check if current thresholds are location-optimized
   */
  isLocationOptimized(): boolean {
    const thresholds = this._adaptiveThresholds();
    return thresholds.source === 'pub-specific' || thresholds.source === 'location-based';
  }

  /**
   * Reset to default thresholds
   */
  reset(): void {
    this._locationContext.set({});
    this._adaptiveThresholds.set(this.getDefaultThresholds());
  }
}
