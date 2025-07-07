import { Injectable, signal } from '@angular/core';
import { CarpetImageMetrics } from '../carpet-image-analysis.service';

/**
 * Mock implementation of CarpetImageAnalysisService for testing
 */
@Injectable()
export class MockCarpetImageAnalysisService {
  // Default mock metrics
  private readonly mockMetrics: CarpetImageMetrics = {
    brightness: 128,
    contrast: 50,
    sharpness: 40,
    dominantColors: ['#808080', '#a0a0a0', '#606060'],
    colorVariance: 30,
    saturation: 40,
    edgeDensity: 25,
    textureComplexity: 35,
    repetition: 45,
    motionLevel: 10,
    isStable: true,
    analysisTime: 25,
    frameSize: '640x480',
    timestamp: Date.now()
  };

  private readonly _metrics = signal<CarpetImageMetrics | null>(this.mockMetrics);
  private readonly _isAnalyzing = signal(false);

  readonly metrics = this._metrics.asReadonly();
  readonly isAnalyzing = this._isAnalyzing.asReadonly();

  clearState(): void {
    console.log('[MockCarpetImageAnalysis] clearState called');
  }

  async analyzeVideoFrame(videoElement: HTMLVideoElement): Promise<CarpetImageMetrics> {
    console.log('[MockCarpetImageAnalysis] analyzeVideoFrame called');
    this._isAnalyzing.set(true);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    this._isAnalyzing.set(false);
    return this.mockMetrics;
  }

  /**
   * Test helper to update mock metrics
   */
  setMockMetrics(metrics: Partial<CarpetImageMetrics>): void {
    this._metrics.set({
      ...this.mockMetrics,
      ...metrics
    });
  }

  /**
   * Test helper to simulate analysis state
   */
  setAnalyzing(analyzing: boolean): void {
    this._isAnalyzing.set(analyzing);
  }
}