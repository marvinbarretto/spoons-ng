import { Injectable, computed, signal } from '@angular/core';
import { analyzeAdvancedTexture, type TextureFeatures } from '../../utils';
import { CheckinGate } from './gate.interface';

@Injectable({ providedIn: 'root' })
export class CarpetPatternRecognitionGate implements CheckinGate {
  readonly name = 'Carpet Pattern Recognition';
  readonly description = 'Advanced pattern detection for carpet identification';
  readonly threshold = 60; // Combined score threshold for carpet patterns

  // Internal state
  private readonly _textureFeatures = signal<TextureFeatures | null>(null);
  private readonly _isAnalyzing = signal(false);

  // Public signals
  readonly textureFeatures = this._textureFeatures.asReadonly();
  readonly isAnalyzing = this._isAnalyzing.asReadonly();

  readonly currentValue = computed(() => {
    const features = this._textureFeatures();
    return features ? this.calculateCombinedScore(features) : null;
  });

  readonly passed = computed(() => {
    const features = this._textureFeatures();
    if (!features) return false;

    const combinedScore = this.calculateCombinedScore(features);
    const result = combinedScore > this.threshold;

    console.log('[CarpetPatternRecognitionGate] Analysis:', {
      patternType: features.patternType,
      contrast: features.contrast,
      edgeDensity: features.edgeDensity,
      repetitionScore: features.repetitionScore,
      colorComplexity: features.colorComplexity,
      combinedScore,
      threshold: this.threshold,
      passed: result,
    });

    return result;
  });

  /**
   * Analyze video frame for carpet patterns
   */
  async analyzeFrame(videoElement: HTMLVideoElement): Promise<void> {
    console.log('[CarpetPatternRecognitionGate] Starting pattern analysis');

    this._isAnalyzing.set(true);

    try {
      const features = analyzeAdvancedTexture(videoElement);
      this._textureFeatures.set(features);

      console.log('[CarpetPatternRecognitionGate] Analysis complete:', {
        patternType: features.patternType,
        combinedScore: this.calculateCombinedScore(features),
        processingTime: Math.round(features.processingTime) + 'ms',
      });
    } catch (error) {
      console.error('[CarpetPatternRecognitionGate] Analysis failed:', error);
      this._textureFeatures.set(null);
    } finally {
      this._isAnalyzing.set(false);
    }
  }

  /**
   * Calculate combined carpet pattern score
   */
  private calculateCombinedScore(features: TextureFeatures): number {
    // Weight different features based on carpet detection importance
    const weights = this.getPatternWeights(features.patternType);

    const score =
      features.contrast * weights.contrast +
      features.edgeDensity * weights.edges +
      features.repetitionScore * weights.repetition +
      features.colorComplexity * weights.complexity;

    return Math.round(score);
  }

  /**
   * Get pattern-specific weights
   */
  private getPatternWeights(patternType: TextureFeatures['patternType']) {
    switch (patternType) {
      case 'geometric':
        return {
          contrast: 0.4, // High weight - geometric patterns have strong contrast
          edges: 0.3, // High weight - clear edges
          repetition: 0.2, // Medium weight - regular repetition
          complexity: 0.1, // Low weight - usually simpler colors
        };

      case 'ornamental':
        return {
          contrast: 0.2, // Lower weight - softer contrast
          edges: 0.3, // Medium weight - curved edges
          repetition: 0.2, // Medium weight - organic repetition
          complexity: 0.3, // High weight - complex colors/patterns
        };

      case 'mixed':
        return {
          contrast: 0.25, // Balanced weights for mixed patterns
          edges: 0.25,
          repetition: 0.25,
          complexity: 0.25,
        };

      case 'plain':
      default:
        return {
          contrast: 0.1, // Very low weights - plain carpets are subtle
          edges: 0.2,
          repetition: 0.3,
          complexity: 0.4, // Higher weight on color variation
        };
    }
  }

  /**
   * Get pattern type description
   */
  getPatternDescription(): string {
    const features = this._textureFeatures();
    if (!features) return 'No pattern data';

    const descriptions = {
      geometric: 'Strong geometric patterns with clear edges',
      ornamental: 'Curved ornamental patterns with complex colors',
      mixed: 'Mixed pattern with varied elements',
      plain: 'Plain or simple pattern with subtle variation',
    };

    return descriptions[features.patternType] || 'Unknown pattern';
  }

  /**
   * Check if pattern is carpet-like
   */
  isCarpetLikePattern(): boolean {
    const features = this._textureFeatures();
    if (!features) return false;

    // Carpets typically have some texture and pattern
    const hasTexture = features.edgeDensity > 15;
    const hasComplexity = features.colorComplexity > 20;
    const hasPattern = features.repetitionScore > 10;

    return hasTexture && (hasComplexity || hasPattern);
  }

  /**
   * Reset analysis state
   */
  reset(): void {
    this._textureFeatures.set(null);
    this._isAnalyzing.set(false);
  }
}
