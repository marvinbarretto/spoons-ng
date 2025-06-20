/**
 * Configuration for carpet recognition confidence calculations
 * These values can be adjusted based on real-world testing and machine learning insights
 */

export interface ConfidenceWeights {
  color: number;
  pattern: number;
  texture: number;
}

export interface SimilarityThresholds {
  excellent: number;
  good: number;
  moderate: number;
  weak: number;
}

export interface PatternMatchScores {
  exactMatch: number;
  closeMatch: number;
  relatedMatch: number;
  partialMatch: number;
  noMatch: number;
}

export interface LocationBasedConfidence {
  singlePubBase: number;
  multiplePubsBase: number;
  maxConfidence: number;
}

export class CarpetConfidenceConfig {
  // Main feature weights for overall confidence calculation
  static readonly FEATURE_WEIGHTS: ConfidenceWeights = {
    color: 0.35,    // Color is important but not the only factor
    pattern: 0.40,  // Pattern is most distinctive for carpets
    texture: 0.25   // Texture provides additional confirmation
  };

  // Similarity thresholds for matching
  static readonly SIMILARITY_THRESHOLDS: SimilarityThresholds = {
    excellent: 0.85,
    good: 0.70,
    moderate: 0.55,
    weak: 0.40
  };

  // Pattern matching scores based on pattern type comparison
  static readonly PATTERN_SCORES: PatternMatchScores = {
    exactMatch: 0.95,      // Same pattern type
    closeMatch: 0.85,      // Related patterns (e.g., geometric vs square)
    relatedMatch: 0.75,    // Similar complexity patterns
    partialMatch: 0.60,    // Some shared characteristics
    noMatch: 0.30         // Different patterns
  };

  // Location-based confidence adjustments
  // Since pubs are far apart, location alone provides very high confidence
  static readonly LOCATION_CONFIDENCE: LocationBasedConfidence = {
    singlePubBase: 90,     // Very high confidence when only one pub nearby
    multiplePubsBase: 30,  // Much lower base when multiple options (rare)
    maxConfidence: 98      // Can be very confident due to location
  };

  // Visual matching bonuses (smaller since location is already strong indicator)
  static readonly COLOR_MATCH_BONUSES = {
    excellent: 8,
    good: 6,
    moderate: 4,
    weak: 2
  };

  // Pattern matching bonus (smaller due to strong location signal)
  static readonly PATTERN_MATCH_BONUS = 5;

  // Texture complexity thresholds
  static readonly TEXTURE_COMPLEXITY = {
    high: 0.7,
    medium: 0.4,
    low: 0.2
  };

  // Distance thresholds for location-based confidence
  static readonly DISTANCE_THRESHOLDS = {
    veryClose: 0.05,      // 50m - extremely high confidence
    close: 0.1,           // 100m - very high confidence
    moderate: 0.2,        // 200m - good confidence
    far: 0.5             // 500m - lower confidence
  };

  /**
   * Calculate dynamic weights based on image characteristics
   */
  static getDynamicWeights(imageFeatures: {
    colorVariance: number;
    patternClarity: number;
    textureDetail: number;
  }): ConfidenceWeights {
    // Adjust weights based on what features are most prominent in the image
    const totalQuality = imageFeatures.colorVariance + imageFeatures.patternClarity + imageFeatures.textureDetail;
    
    if (totalQuality === 0) {
      return this.FEATURE_WEIGHTS; // Use defaults if no features detected
    }

    return {
      color: (imageFeatures.colorVariance / totalQuality) * 0.4 + 0.2,
      pattern: (imageFeatures.patternClarity / totalQuality) * 0.4 + 0.2,
      texture: (imageFeatures.textureDetail / totalQuality) * 0.4 + 0.2
    };
  }

  /**
   * Get location-based confidence boost
   */
  static getLocationConfidenceBoost(distance: number, nearbyPubCount: number): number {
    if (nearbyPubCount === 1) {
      // Single pub nearby - very high confidence boost
      if (distance <= this.DISTANCE_THRESHOLDS.veryClose) return 95;
      if (distance <= this.DISTANCE_THRESHOLDS.close) return 90;
      if (distance <= this.DISTANCE_THRESHOLDS.moderate) return 85;
      if (distance <= this.DISTANCE_THRESHOLDS.far) return 75;
      return 60; // Still good confidence even if further
    } else if (nearbyPubCount === 2) {
      // Two pubs nearby - moderate confidence, need visual confirmation
      return 50;
    } else {
      // Multiple pubs - low base confidence, rely on visual matching
      return 30;
    }
  }

  /**
   * Get similarity threshold description
   */
  static getSimilarityLevel(score: number): string {
    if (score >= this.SIMILARITY_THRESHOLDS.excellent) return 'excellent';
    if (score >= this.SIMILARITY_THRESHOLDS.good) return 'good';
    if (score >= this.SIMILARITY_THRESHOLDS.moderate) return 'moderate';
    if (score >= this.SIMILARITY_THRESHOLDS.weak) return 'weak';
    return 'poor';
  }

  /**
   * Calculate pattern match score based on pattern types
   */
  static getPatternMatchScore(detected: string, reference: string): number {
    const detectedLower = detected.toLowerCase();
    const referenceLower = reference.toLowerCase();

    // Exact match
    if (detectedLower === referenceLower) {
      return this.PATTERN_SCORES.exactMatch;
    }

    // Close matches (related patterns)
    const closeMatches: Record<string, string[]> = {
      'geometric': ['square', 'diamond', 'hexagonal', 'triangular'],
      'ornamental': ['floral', 'leaf', 'vine', 'botanical'],
      'mixed': ['complex', 'intricate', 'detailed'],
      'plain': ['solid', 'uniform', 'simple']
    };

    for (const [key, related] of Object.entries(closeMatches)) {
      if (detectedLower === key && related.some(r => referenceLower.includes(r))) {
        return this.PATTERN_SCORES.closeMatch;
      }
      if (related.includes(detectedLower) && referenceLower.includes(key)) {
        return this.PATTERN_SCORES.closeMatch;
      }
    }

    // Related matches (similar complexity)
    const complexPatterns = ['geometric', 'ornamental', 'mixed', 'complex'];
    const simplePatterns = ['plain', 'solid', 'uniform'];

    if (complexPatterns.includes(detectedLower) && complexPatterns.includes(referenceLower)) {
      return this.PATTERN_SCORES.relatedMatch;
    }
    if (simplePatterns.includes(detectedLower) && simplePatterns.includes(referenceLower)) {
      return this.PATTERN_SCORES.relatedMatch;
    }

    // Partial match if they share some characteristics
    if (detectedLower.includes(referenceLower) || referenceLower.includes(detectedLower)) {
      return this.PATTERN_SCORES.partialMatch;
    }

    // No match
    return this.PATTERN_SCORES.noMatch;
  }

  /**
   * Calculate confidence adjustment based on color similarity
   */
  static getColorMatchBonus(colorSimilarity: number): number {
    if (colorSimilarity >= this.SIMILARITY_THRESHOLDS.excellent) {
      return this.COLOR_MATCH_BONUSES.excellent;
    }
    if (colorSimilarity >= this.SIMILARITY_THRESHOLDS.good) {
      return this.COLOR_MATCH_BONUSES.good;
    }
    if (colorSimilarity >= this.SIMILARITY_THRESHOLDS.moderate) {
      return this.COLOR_MATCH_BONUSES.moderate;
    }
    if (colorSimilarity >= this.SIMILARITY_THRESHOLDS.weak) {
      return this.COLOR_MATCH_BONUSES.weak;
    }
    return 0;
  }

  /**
   * Calculate final confidence score
   */
  static calculateFinalConfidence(
    visualConfidence: number,
    locationBoost: number,
    isLocationBased: boolean
  ): number {
    if (isLocationBased) {
      // When using location, it's the primary factor
      // Visual matching provides minor adjustments
      const baseConfidence = locationBoost;
      const visualAdjustment = (visualConfidence - 50) * 0.2; // ±10% adjustment
      return Math.min(this.LOCATION_CONFIDENCE.maxConfidence, Math.max(0, baseConfidence + visualAdjustment));
    } else {
      // Pure visual matching (no location data)
      return Math.min(85, visualConfidence); // Cap at 85% without location
    }
  }
}