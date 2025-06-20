// src/app/carpets/data-access/dynamic-carpet-matcher.service.ts
import { Injectable, signal, computed } from '@angular/core';
import type { CapturedFeatures, MatchResult } from './carpet-reference.types';

@Injectable({ providedIn: 'root' })
export class DynamicCarpetMatcherService {

  // Store loaded references
  private readonly _loadedReferences = signal<any[]>([]);
  private readonly _currentMatch = signal<MatchResult | null>(null);
  private readonly _isAnalyzing = signal(false);

  readonly loadedReferences = this._loadedReferences.asReadonly();
  readonly currentMatch = this._currentMatch.asReadonly();
  readonly isAnalyzing = this._isAnalyzing.asReadonly();
  readonly isMatch = computed(() => this._currentMatch()?.isMatch ?? false);

  /**
   * Load reference data (from generated TypeScript or JSON)
   */
  loadReferences(references: any[]): void {
    this._loadedReferences.set(references);
    console.log(`✅ Loaded ${references.length} carpet references`);
  }

  /**
   * Add single reference dynamically
   */
  addReference(reference: any): void {
    const current = this._loadedReferences();
    this._loadedReferences.set([...current, reference]);
  }

  /**
   * Match camera frame against all loaded references
   */
  matchFrame(videoElement: HTMLVideoElement, confidenceThreshold = 75): MatchResult | null {
    if (this._loadedReferences().length === 0) {
      console.warn('[DynamicMatcher] No references loaded');
      return null;
    }

    this._isAnalyzing.set(true);

    try {
      // Extract features from video frame
      const features = this.extractFeatures(videoElement);

      // Find best match
      const bestMatch = this.findBestMatch(features, confidenceThreshold);

      this._currentMatch.set(bestMatch);
      return bestMatch;

    } finally {
      this._isAnalyzing.set(false);
    }
  }

  /**
   * Check if currently looking at any known carpet
   */
  quickCheck(videoElement: HTMLVideoElement): boolean {
    const match = this.matchFrame(videoElement, 70); // Lower threshold for quick check
    return match?.isMatch ?? false;
  }

  private extractFeatures(videoElement: HTMLVideoElement): CapturedFeatures {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = 320;
    canvas.height = 240;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return {
      colorProfile: this.extractColorProfile(imageData),
      textureProfile: this.extractTextureProfile(imageData),
      geometricFeatures: this.extractGeometricFeatures(imageData)
    };
  }

  private findBestMatch(features: CapturedFeatures, threshold: number): MatchResult | null {
    let bestMatch: MatchResult | null = null;
    let highestConfidence = 0;

    this._loadedReferences().forEach(reference => {
      const match = this.compareWithReference(features, reference, threshold);

      if (match.confidence > highestConfidence) {
        highestConfidence = match.confidence;
        bestMatch = match;
      }
    });

    return bestMatch;
  }

  private compareWithReference(features: CapturedFeatures, reference: any, threshold: number): MatchResult {
    // Color similarity (30% weight)
    const colorSim = this.calculateColorSimilarity(features.colorProfile, reference.colorProfile);

    // Texture similarity (40% weight)
    const textureSim = this.calculateTextureSimilarity(features.textureProfile, reference.textureProfile);

    // Geometric similarity (30% weight)
    const geometricSim = this.calculateGeometricSimilarity(features.geometricFeatures, reference.geometricFeatures);

    // Weighted confidence
    const confidence = (colorSim * 0.3) + (textureSim * 0.4) + (geometricSim * 0.3);
    const confidencePercent = Math.round(confidence * 100);

    const isMatch = confidencePercent >= threshold;

    // Generate reasoning
    const reasoning = this.generateReasoning(colorSim, textureSim, geometricSim, features, reference);

    return {
      referenceId: reference.id,
      referenceName: reference.name,
      confidence: confidencePercent,
      isMatch,
      colorSimilarity: Math.round(colorSim * 100),
      textureSimilarity: Math.round(textureSim * 100),
      geometricSimilarity: Math.round(geometricSim * 100),
      reasoning
    };
  }

  private calculateColorSimilarity(captured: any, reference: any): number {
    const capturedColors = captured.dominant.slice(0, 4);
    const referenceColors = reference.dominant.slice(0, 4);

    let totalSimilarity = 0;
    let comparisons = 0;

    capturedColors.forEach((capturedColor: string) => {
      const bestMatch = referenceColors.reduce((best: number, refColor: string) => {
        const similarity = this.colorDistance(capturedColor, refColor);
        return similarity > best ? similarity : best;
      }, 0);

      totalSimilarity += bestMatch;
      comparisons++;
    });

    const colorMatch = comparisons > 0 ? totalSimilarity / comparisons : 0;

    // Bonus for similar variance and brightness
    const varianceBonus = 1 - Math.abs(captured.variance - reference.variance) / 200;
    const brightnessBonus = 1 - Math.abs(captured.brightness - reference.brightness) / 255;

    return (colorMatch * 0.7) + (Math.max(0, varianceBonus) * 0.15) + (Math.max(0, brightnessBonus) * 0.15);
  }

  private calculateTextureSimilarity(captured: any, reference: any): number {
    const contrastSim = 1 - Math.abs(captured.contrast - reference.contrast) / 1;
    const edgeSim = 1 - Math.abs(captured.edgeDensity - reference.edgeDensity) / 50;
    const repetitionSim = 1 - Math.abs(captured.repetitionScore - reference.repetitionScore) / 1;

    // Pattern type bonus
    const patternBonus = captured.patternType === reference.patternType ? 0.3 : 0;

    return Math.max(0, (contrastSim * 0.3) + (edgeSim * 0.3) + (repetitionSim * 0.2) + patternBonus);
  }

  private calculateGeometricSimilarity(captured: any, reference: any): number {
    let score = 0;

    // Shape matching
    if (captured.hasSquares === reference.hasSquares) score += 0.3;
    if (captured.hasCircles === reference.hasCircles) score += 0.3;
    if (captured.hasOrnamental === reference.hasOrnamental) score += 0.3;

    // Dominant shape
    if (captured.dominantShape === reference.dominantShape) score += 0.1;

    return Math.min(score, 1.0);
  }

  private colorDistance(color1: string, color2: string): number {
    const rgb1 = this.parseRgb(color1);
    const rgb2 = this.parseRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const distance = Math.sqrt(
      Math.pow(rgb1[0] - rgb2[0], 2) +
      Math.pow(rgb1[1] - rgb2[1], 2) +
      Math.pow(rgb1[2] - rgb2[2], 2)
    );

    const maxDistance = Math.sqrt(3 * Math.pow(255, 2));
    return 1 - (distance / maxDistance);
  }

  private parseRgb(color: string): number[] | null {
    const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
    return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
  }

  private generateReasoning(colorSim: number, textureSim: number, geometricSim: number, features: any, reference: any): string[] {
    const reasoning: string[] = [];

    // Color analysis
    if (colorSim > 0.8) reasoning.push('Excellent color match');
    else if (colorSim > 0.6) reasoning.push('Good color similarity');
    else if (colorSim > 0.4) reasoning.push('Moderate color match');
    else reasoning.push('Poor color match');

    // Texture analysis
    if (textureSim > 0.8) reasoning.push('Strong texture match');
    else if (textureSim > 0.6) reasoning.push('Good texture similarity');
    else if (textureSim > 0.4) reasoning.push('Some texture similarity');
    else reasoning.push('Texture mismatch');

    // Geometric analysis
    if (geometricSim > 0.8) reasoning.push('Perfect geometric match');
    else if (geometricSim > 0.6) reasoning.push('Good pattern match');
    else if (geometricSim > 0.4) reasoning.push('Some pattern similarity');
    else reasoning.push('Different pattern type');

    // Specific features
    if (features.geometricFeatures.hasSquares && reference.geometricFeatures.hasSquares) {
      reasoning.push('Square patterns detected');
    }
    if (features.textureProfile.contrast > 0.5) {
      reasoning.push('High contrast texture');
    }
    if (Math.abs(features.colorProfile.variance - reference.colorProfile.variance) < 50) {
      reasoning.push('Similar color complexity');
    }

    return reasoning;
  }

  // Feature extraction methods (reuse your existing logic)

  private extractColorProfile(imageData: ImageData): any {
    const data = imageData.data;
    const colorCounts = new Map<string, number>();
    const brightnesses: number[] = [];

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;

      const colorKey = `rgb(${qr},${qg},${qb})`;
      colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnesses.push(brightness);
    }

    const dominant = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);

    const avgBrightness = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
    const variance = brightnesses.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightnesses.length;

    return {
      dominant,
      variance: Math.round(variance),
      brightness: Math.round(avgBrightness),
      pattern: this.detectPatternFromColors(colorCounts)
    };
  }

  private extractTextureProfile(imageData: ImageData): any {
    const gray = this.convertToGrayscale(imageData);
    const width = imageData.width;
    const height = imageData.height;

    return {
      contrast: this.calculateContrast(gray, width, height),
      edgeDensity: this.calculateEdgeDensity(gray, width, height),
      repetitionScore: this.calculateRepetition(gray, width, height),
      patternType: 'mixed' // Simplified for this example
    };
  }

  private extractGeometricFeatures(imageData: ImageData): any {
    const gray = this.convertToGrayscale(imageData);
    const width = imageData.width;
    const height = imageData.height;

    return {
      hasSquares: this.detectSquares(gray, width, height),
      hasCircles: this.detectCircles(gray, width, height),
      hasOrnamental: false, // Simplified
      dominantShape: 'mixed',
      repetitionScore: this.calculateRepetition(gray, width, height)
    };
  }

  // Utility methods (simplified versions of your existing analysis)

  private convertToGrayscale(imageData: ImageData): Uint8Array {
    const data = imageData.data;
    const gray = new Uint8Array(imageData.width * imageData.height);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    return gray;
  }

  private calculateContrast(gray: Uint8Array, width: number, height: number): number {
    let totalContrast = 0;
    let samples = 0;

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const current = gray[y * width + x];
        const right = gray[y * width + x + 1];
        const down = gray[(y + 1) * width + x];

        totalContrast += Math.abs(current - right) + Math.abs(current - down);
        samples += 2;
      }
    }

    return samples > 0 ? totalContrast / (samples * 255) : 0;
  }

  private calculateEdgeDensity(gray: Uint8Array, width: number, height: number): number {
    let edges = 0;
    const threshold = 30;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const gx = gray[idx + 1] - gray[idx - 1];
        const gy = gray[idx + width] - gray[idx - width];
        const magnitude = Math.sqrt(gx * gx + gy * gy);

        if (magnitude > threshold) edges++;
      }
    }

    return edges / ((width - 2) * (height - 2)) * 1000;
  }

  private calculateRepetition(gray: Uint8Array, width: number, height: number): number {
    let correlations = 0;
    let samples = 0;

    for (let y = 0; y < height; y += 8) {
      for (let x = 0; x < width - 16; x += 8) {
        const idx1 = y * width + x;
        const idx2 = y * width + x + 16;

        const diff = Math.abs(gray[idx1] - gray[idx2]);
        correlations += Math.max(0, 1 - diff / 255);
        samples++;
      }
    }

    return samples > 0 ? correlations / samples : 0;
  }

  private detectSquares(gray: Uint8Array, width: number, height: number): boolean {
    let horizontalEdges = 0;
    let verticalEdges = 0;
    const threshold = 25;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const horizontal = Math.abs(gray[idx - width] - gray[idx + width]);
        const vertical = Math.abs(gray[idx - 1] - gray[idx + 1]);

        if (horizontal > threshold) horizontalEdges++;
        if (vertical > threshold) verticalEdges++;
      }
    }

    const totalPixels = (width - 2) * (height - 2);
    const hRatio = horizontalEdges / totalPixels;
    const vRatio = verticalEdges / totalPixels;

    return (hRatio > 0.05 && vRatio > 0.05 && Math.abs(hRatio - vRatio) < 0.02);
  }

  private detectCircles(gray: Uint8Array, width: number, height: number): boolean {
    // Simplified circle detection
    return false; // Implement if needed
  }

  private detectPatternFromColors(colorCounts: Map<string, number>): string {
    const uniqueColors = colorCounts.size;
    if (uniqueColors < 5) return 'plain';
    if (uniqueColors > 20) return 'mixed';
    return 'geometric';
  }
}
