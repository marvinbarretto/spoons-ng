import { Injectable, computed, signal } from '@angular/core';
import { CheckinGate } from './gate.interface';
import { CHECKIN_GATE_THRESHOLDS } from './checkin-thresholds.config';
import { extractEnhancedColors, type ColorProfile } from '../../utils';

@Injectable({ providedIn: 'root' })
export class EnhancedColorVarianceGate implements CheckinGate {
  readonly name = 'Enhanced Color Variance';
  readonly description = 'Advanced color analysis with multi-region sampling';
  readonly threshold = 50; // Variance threshold for carpet detection

  // Internal state
  private readonly _colorProfile = signal<ColorProfile | null>(null);
  private readonly _isAnalyzing = signal(false);

  // Public signals
  readonly colorProfile = this._colorProfile.asReadonly();
  readonly isAnalyzing = this._isAnalyzing.asReadonly();
  
  readonly currentValue = computed(() => {
    const profile = this._colorProfile();
    return profile ? Math.round(profile.variance) : null;
  });

  readonly passed = computed(() => {
    const profile = this._colorProfile();
    if (!profile) return false;

    // Enhanced carpet detection using multiple factors
    const variancePass = profile.variance > this.threshold;
    const contrastPass = profile.contrastRatio > 0.3; // Good contrast
    const saturationPass = profile.saturationLevel > 0.2; // Some color saturation
    const colorDiversityPass = profile.dominantColors.length >= 3; // Multiple colors

    const passCount = [variancePass, contrastPass, saturationPass, colorDiversityPass].filter(Boolean).length;
    const result = passCount >= 3; // At least 3/4 factors must pass

    console.log('[EnhancedColorVarianceGate] Analysis:', {
      variance: Math.round(profile.variance),
      contrastRatio: Math.round(profile.contrastRatio * 100),
      saturationLevel: Math.round(profile.saturationLevel * 100),
      colorCount: profile.dominantColors.length,
      variancePass,
      contrastPass,
      saturationPass,
      colorDiversityPass,
      passCount,
      result
    });

    return result;
  });

  /**
   * Analyze video frame using enhanced color extraction
   */
  async analyzeFrame(videoElement: HTMLVideoElement): Promise<void> {
    console.log('[EnhancedColorVarianceGate] Starting enhanced color analysis');
    
    this._isAnalyzing.set(true);
    
    try {
      const profile = extractEnhancedColors(videoElement);
      this._colorProfile.set(profile);
      
      console.log('[EnhancedColorVarianceGate] Analysis complete:', {
        variance: Math.round(profile.variance),
        dominantColors: profile.dominantColors.slice(0, 3),
        contrastRatio: Math.round(profile.contrastRatio * 100) + '%',
        saturationLevel: Math.round(profile.saturationLevel * 100) + '%',
        processingTime: Math.round(profile.processingTime) + 'ms'
      });
      
    } catch (error) {
      console.error('[EnhancedColorVarianceGate] Analysis failed:', error);
      this._colorProfile.set(null);
    } finally {
      this._isAnalyzing.set(false);
    }
  }

  /**
   * Get detailed analysis results for debugging
   */
  getAnalysisDetails(): string {
    const profile = this._colorProfile();
    if (!profile) return 'No analysis data';

    return `Variance: ${Math.round(profile.variance)}, ` +
           `Contrast: ${Math.round(profile.contrastRatio * 100)}%, ` +
           `Colors: ${profile.dominantColors.length}, ` +
           `Saturation: ${Math.round(profile.saturationLevel * 100)}%`;
  }

  /**
   * Reset analysis state
   */
  reset(): void {
    this._colorProfile.set(null);
    this._isAnalyzing.set(false);
  }
}