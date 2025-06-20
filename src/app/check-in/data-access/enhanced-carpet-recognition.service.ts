// src/app/check-in/data-access/enhanced-carpet-recognition.service.ts
import { Injectable, signal } from '@angular/core';
import { getAllCarpets, type StaticCarpetData } from './carpet-database';
import type { PracticalCarpetMatch, EnhancedColorProfile, PracticalTextureFeatures } from './carpet.types';

@Injectable({ providedIn: 'root' })
export class EnhancedCarpetRecognitionService {

  // ✅ State management
  private readonly _isAnalyzing = signal(false);
  private readonly _lastProfile = signal<EnhancedColorProfile | null>(null);
  private readonly _lastTexture = signal<PracticalTextureFeatures | null>(null);
  private readonly _lastMatches = signal<PracticalCarpetMatch[]>([]);
  private readonly _analysisCount = signal(0);
  private readonly _debugInfo = signal<any>(null);

  // ✅ Public readonly access
  readonly isAnalyzing = this._isAnalyzing.asReadonly();
  readonly lastProfile = this._lastProfile.asReadonly();
  readonly lastTexture = this._lastTexture.asReadonly();
  readonly lastMatches = this._lastMatches.asReadonly();
  readonly analysisCount = this._analysisCount.asReadonly();
  readonly debugInfo = this._debugInfo.asReadonly();

  private readonly carpetDatabase = getAllCarpets();

  constructor() {
    console.log('[EnhancedCarpetService] 🎯 Initialized with enhanced recognition');
    console.log('[EnhancedCarpetService] 📊 Database size:', this.carpetDatabase.length);
  }

  /**
   * 🎯 Main analysis method
   */
  async analyzeVideoFrame(videoElement: HTMLVideoElement): Promise<PracticalCarpetMatch[]> {
    if (this._isAnalyzing()) return this._lastMatches();

    const analysisNumber = this._analysisCount() + 1;
    this._analysisCount.set(analysisNumber);
    this._isAnalyzing.set(true);

    console.log(`\n🔬 === ENHANCED ANALYSIS #${analysisNumber} ===`);
    const startTime = performance.now();

    try {
      // ✅ Stage 1: Enhanced color extraction
      const colorProfile = this.extractEnhancedColors(videoElement);
      this._lastProfile.set(colorProfile);

      // ✅ Stage 2: Pattern & texture analysis
      const textureFeatures = this.analyzePatternFeatures(videoElement);
      this._lastTexture.set(textureFeatures);

      // ✅ Stage 3: Multi-dimensional matching
      const matches = this.performIntelligentMatching(colorProfile, textureFeatures);
      this._lastMatches.set(matches);

      // ✅ Stage 4: Debug info for UI
      const debugInfo = this.generateDebugInfo(colorProfile, textureFeatures, matches);
      this._debugInfo.set(debugInfo);

      const totalTime = performance.now() - startTime;
      console.log(`✅ Enhanced analysis complete in ${totalTime.toFixed(1)}ms`);

      this.logDetailedResults(matches, colorProfile, textureFeatures);
      return matches;

    } catch (error) {
      console.error('❌ Enhanced analysis failed:', error);
      return [];
    } finally {
      this._isAnalyzing.set(false);
    }
  }

  /**
   * 🎨 Stage 1: Enhanced Color Analysis
   */
  private extractEnhancedColors(videoElement: HTMLVideoElement): EnhancedColorProfile {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // ✅ High resolution sampling for better accuracy
    canvas.width = 400;
    canvas.height = 300;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // ✅ Smart sampling - avoid edges and focus on center regions
    const colorCounts = new Map<string, number>();
    const rgbValues: number[][] = [];
    let totalSampled = 0;

    // ✅ Sample from multiple regions to avoid bias
    const regions = [
      { x: 0.2, y: 0.2, w: 0.3, h: 0.3 },    // Top-left region
      { x: 0.5, y: 0.2, w: 0.3, h: 0.3 },    // Top-right region
      { x: 0.2, y: 0.5, w: 0.3, h: 0.3 },    // Bottom-left region
      { x: 0.5, y: 0.5, w: 0.3, h: 0.3 },    // Bottom-right region
      { x: 0.35, y: 0.35, w: 0.3, h: 0.3 },  // Center region
    ];

    regions.forEach(region => {
      const startX = Math.floor(canvas.width * region.x);
      const endX = Math.floor(canvas.width * (region.x + region.w));
      const startY = Math.floor(canvas.height * region.y);
      const endY = Math.floor(canvas.height * (region.y + region.h));

      // ✅ Sample every 3rd pixel for performance
      for (let y = startY; y < endY; y += 3) {
        for (let x = startX; x < endX; x += 3) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // ✅ Quantize colors to reduce noise
          const qR = Math.round(r / 16) * 16;
          const qG = Math.round(g / 16) * 16;
          const qB = Math.round(b / 16) * 16;

          const colorKey = `${qR},${qG},${qB}`;
          colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
          rgbValues.push([r, g, b]);
          totalSampled++;
        }
      }
    });

    // ✅ Extract dominant colors
    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([color, count]) => {
        const [r, g, b] = color.split(',').map(Number);
        return {
          hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
          rgb: [r, g, b],
          frequency: count / totalSampled
        };
      });

    // ✅ Calculate color statistics
    const brightness = rgbValues.map(([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b);
    const avgBrightness = brightness.reduce((a, b) => a + b, 0) / brightness.length;
    const variance = brightness.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightness.length;

    // ✅ Calculate contrast ratio
    const minBrightness = Math.min(...brightness);
    const maxBrightness = Math.max(...brightness);
    const contrastRatio = maxBrightness / Math.max(minBrightness, 1);

    // ✅ Calculate saturation level
    const saturations = rgbValues.map(([r, g, b]) => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      return max === 0 ? 0 : (max - min) / max;
    });
    const avgSaturation = saturations.reduce((a, b) => a + b, 0) / saturations.length;

    return {
      dominant: sortedColors.map(c => c.hex),
      variance,
      histogram: this.generateBrightnessHistogram(brightness),
      totalPixels: canvas.width * canvas.height,
      sampledPixels: totalSampled,
      processingTime: performance.now() - performance.now(),
      colorDistribution: Object.fromEntries(
        sortedColors.map(c => [c.hex, c.frequency])
      ),
      contrastRatio,
      saturationLevel: avgSaturation
    };
  }

  /**
   * 🏗️ Stage 2: Pattern & Texture Analysis
   */
  private analyzePatternFeatures(videoElement: HTMLVideoElement): PracticalTextureFeatures {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // ✅ Medium resolution for pattern detection
    canvas.width = 320;
    canvas.height = 240;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // ✅ Convert to grayscale for pattern analysis
    const gray = this.convertToGrayscale(imageData);

    // ✅ Detect patterns
    const edgeDensity = this.calculateEdgeDensity(gray, canvas.width, canvas.height);
    const contrast = this.calculateLocalContrast(gray, canvas.width, canvas.height);
    const repetitionScore = this.detectRepetition(gray, canvas.width, canvas.height);
    const colorComplexity = this.calculateColorComplexity(imageData);
    const patternType = this.classifyPattern(edgeDensity, contrast, repetitionScore);

    return {
      contrast,
      edgeDensity,
      repetitionScore,
      colorComplexity,
      patternType
    };
  }

  /**
   * 🎯 Stage 3: Intelligent Multi-dimensional Matching
   */
  private performIntelligentMatching(
    colorProfile: EnhancedColorProfile,
    textureFeatures: PracticalTextureFeatures
  ): PracticalCarpetMatch[] {

    const matches: PracticalCarpetMatch[] = [];

    this.carpetDatabase.forEach(carpet => {
      // ✅ Color similarity (30% weight)
      const colorSim = this.calculateColorSimilarity(colorProfile, carpet);

      // ✅ Pattern similarity (40% weight) - most important for carpets
      const patternSim = this.calculatePatternSimilarity(textureFeatures, carpet);

      // ✅ Texture similarity (30% weight)
      const textureSim = this.calculateTextureSimilarity(textureFeatures, carpet);

      // ✅ Weighted confidence calculation
      const weights = { color: 0.3, pattern: 0.4, texture: 0.3 };
      const confidence = (colorSim * weights.color) +
                        (patternSim * weights.pattern) +
                        (textureSim * weights.texture);

      // ✅ Generate intelligent reasoning
      const reasoning = this.generateMatchReasoning(
        colorSim, patternSim, textureSim, textureFeatures, carpet
      );

      // ✅ Detected features for debugging
      const detectedFeatures = {
        dominantColors: colorProfile.dominant.slice(0, 3),
        patternType: textureFeatures.patternType,
        textureLevel: this.getTextureLevel(textureFeatures),
        isGeometric: textureFeatures.patternType === 'geometric',
        isOrnamental: textureFeatures.patternType === 'ornamental'
      };

      matches.push({
        pubId: carpet.pubId,
        pubName: carpet.pubName,
        confidence: confidence * 100,
        colorSimilarity: colorSim * 100,
        patternSimilarity: patternSim * 100,
        textureSimilarity: textureSim * 100,
        reasoning,
        detectedFeatures
      });
    });

    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 matches
  }

  /**
   * 🎨 Color similarity calculation
   */
  private calculateColorSimilarity(profile: EnhancedColorProfile, carpet: StaticCarpetData): number {
    const capturedColors = profile.dominant.slice(0, 5);
    const referenceColors = carpet.colorProfile.dominant.slice(0, 5);

    let totalSimilarity = 0;
    let comparisons = 0;

    capturedColors.forEach(capturedHex => {
      const captured = this.hexToRgb(capturedHex);
      if (!captured) return;

      const bestMatch = referenceColors.reduce((best, refHex) => {
        const reference = this.hexToRgb(refHex);
        if (!reference) return best;

        const similarity = this.colorDistance(captured, reference);
        return Math.max(best, similarity);
      }, 0);

      totalSimilarity += bestMatch;
      comparisons++;
    });

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * 🏗️ Pattern similarity calculation
   */
  private calculatePatternSimilarity(features: PracticalTextureFeatures, carpet: StaticCarpetData): number {
    const patternDesc = carpet.colorProfile.pattern.toLowerCase();

    // ✅ Pattern type matching
    let patternScore = 0;
    if (features.patternType === 'geometric' && patternDesc.includes('geometric')) patternScore = 0.9;
    else if (features.patternType === 'geometric' && patternDesc.includes('square')) patternScore = 0.8;
    else if (features.patternType === 'ornamental' && patternDesc.includes('floral')) patternScore = 0.9;
    else if (features.patternType === 'ornamental' && patternDesc.includes('leaf')) patternScore = 0.8;
    else if (features.patternType === 'mixed' && patternDesc.includes('complex')) patternScore = 0.7;
    else if (features.patternType === 'plain' && carpet.colorProfile.variance < 100) patternScore = 0.8;
    else patternScore = 0.3; // Generic match

    // ✅ Complexity matching
    const varianceScore = 1 - Math.abs(features.colorComplexity - (carpet.colorProfile.variance / 200)) / 2;

    return (patternScore + varianceScore) / 2;
  }

  /**
   * 🏗️ Texture similarity calculation
   */
  private calculateTextureSimilarity(features: PracticalTextureFeatures, carpet: StaticCarpetData): number {
    // ✅ Edge density correlation
    const expectedEdgeDensity = carpet.colorProfile.variance > 150 ? 0.7 : 0.4;
    const edgeScore = 1 - Math.abs(features.edgeDensity / 100 - expectedEdgeDensity);

    // ✅ Contrast correlation
    const expectedContrast = carpet.colorProfile.variance > 150 ? 0.6 : 0.3;
    const contrastScore = 1 - Math.abs(features.contrast - expectedContrast);

    return Math.max(0, (edgeScore + contrastScore) / 2);
  }

  // ✅ Helper methods
  private hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }

  private colorDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
    const [r1, g1, b1] = rgb1;
    const [r2, g2, b2] = rgb2;

    // ✅ Weighted Euclidean distance (human eye perception)
    const deltaR = (r1 - r2) * 0.3;
    const deltaG = (g1 - g2) * 0.59;
    const deltaB = (b1 - b2) * 0.11;

    const distance = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
    return Math.max(0, 1 - distance / 255);
  }

  private convertToGrayscale(imageData: ImageData): Uint8Array {
    const gray = new Uint8Array(imageData.width * imageData.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    return gray;
  }

  private calculateEdgeDensity(gray: Uint8Array, width: number, height: number): number {
    let edges = 0;

    // ✅ Simple Sobel edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        const gx = -gray[idx - width - 1] + gray[idx - width + 1] +
                   -2 * gray[idx - 1] + 2 * gray[idx + 1] +
                   -gray[idx + width - 1] + gray[idx + width + 1];

        const gy = -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
                   gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 50) edges++; // Threshold for edge detection
      }
    }

    return (edges / ((width - 2) * (height - 2))) * 100;
  }

  private calculateLocalContrast(gray: Uint8Array, width: number, height: number): number {
    let totalContrast = 0;
    let samples = 0;

    // ✅ Calculate local contrast in 5x5 windows
    for (let y = 2; y < height - 2; y += 5) {
      for (let x = 2; x < width - 2; x += 5) {
        let min = 255, max = 0;

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const pixel = gray[(y + dy) * width + (x + dx)];
            min = Math.min(min, pixel);
            max = Math.max(max, pixel);
          }
        }

        totalContrast += (max - min) / 255;
        samples++;
      }
    }

    return samples > 0 ? totalContrast / samples : 0;
  }

  private detectRepetition(gray: Uint8Array, width: number, height: number): number {
    // ✅ Simple autocorrelation for repetition detection
    const step = 8; // Sample every 8th pixel for performance
    let correlations = 0;
    let samples = 0;

    // ✅ Check horizontal repetition
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width - 16; x += step) {
        const idx1 = y * width + x;
        const idx2 = y * width + x + 16; // 16 pixel offset

        const diff = Math.abs(gray[idx1] - gray[idx2]);
        correlations += Math.max(0, 1 - diff / 255);
        samples++;
      }
    }

    return samples > 0 ? correlations / samples : 0;
  }

  private calculateColorComplexity(imageData: ImageData): number {
    const colorCounts = new Map<string, number>();
    const data = imageData.data;

    // ✅ Sample colors and count unique ones
    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
      const r = Math.round(data[i] / 32) * 32;     // Quantize to reduce noise
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const color = `${r},${g},${b}`;
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }

    // ✅ Normalize by image size
    return Math.min(1, colorCounts.size / 100);
  }

  private classifyPattern(
    edgeDensity: number,
    contrast: number,
    repetition: number
  ): 'geometric' | 'ornamental' | 'plain' | 'mixed' {

    if (edgeDensity > 25 && repetition > 0.6) return 'geometric';
    if (contrast > 0.4 && edgeDensity > 15) return 'ornamental';
    if (edgeDensity < 10 && contrast < 0.3) return 'plain';
    return 'mixed';
  }

  private generateBrightnessHistogram(brightness: number[]): number[] {
    const histogram = new Array(256).fill(0);
    brightness.forEach(b => {
      const bin = Math.min(255, Math.floor(b));
      histogram[bin]++;
    });
    return histogram;
  }

  private generateMatchReasoning(
    colorSim: number,
    patternSim: number,
    textureSim: number,
    features: PracticalTextureFeatures,
    carpet: StaticCarpetData
  ): string[] {
    const reasoning: string[] = [];

    if (colorSim > 0.7) reasoning.push(`Strong color match (${(colorSim * 100).toFixed(0)}%)`);
    else if (colorSim > 0.5) reasoning.push(`Moderate color similarity (${(colorSim * 100).toFixed(0)}%)`);
    else reasoning.push(`Weak color match (${(colorSim * 100).toFixed(0)}%)`);

    if (patternSim > 0.8) reasoning.push(`Excellent pattern match for ${features.patternType}`);
    else if (patternSim > 0.6) reasoning.push(`Good ${features.patternType} pattern similarity`);
    else reasoning.push(`Pattern mismatch (${features.patternType} vs ${carpet.colorProfile.pattern})`);

    if (textureSim > 0.6) reasoning.push(`Texture complexity aligns well`);
    else reasoning.push(`Different texture characteristics`);

    return reasoning;
  }

  private getTextureLevel(features: PracticalTextureFeatures): 'low' | 'medium' | 'high' {
    const complexity = (features.contrast + features.edgeDensity / 100 + features.colorComplexity) / 3;
    if (complexity > 0.6) return 'high';
    if (complexity > 0.3) return 'medium';
    return 'low';
  }

  private generateDebugInfo(
    colorProfile: EnhancedColorProfile,
    textureFeatures: PracticalTextureFeatures,
    matches: PracticalCarpetMatch[]
  ): any {
    return {
      colorAnalysis: {
        dominantColors: colorProfile.dominant.slice(0, 5),
        variance: colorProfile.variance,
        contrastRatio: colorProfile.contrastRatio.toFixed(2),
        saturationLevel: (colorProfile.saturationLevel * 100).toFixed(1) + '%',
        sampledPixels: colorProfile.sampledPixels.toLocaleString()
      },
      patternAnalysis: {
        type: textureFeatures.patternType,
        contrast: (textureFeatures.contrast * 100).toFixed(1) + '%',
        edgeDensity: textureFeatures.edgeDensity.toFixed(1) + '/100px',
        repetitionScore: (textureFeatures.repetitionScore * 100).toFixed(1) + '%',
        colorComplexity: (textureFeatures.colorComplexity * 100).toFixed(1) + '%'
      },
      matchSummary: {
        totalMatches: matches.length,
        bestMatch: matches[0]?.pubName || 'None',
        bestConfidence: matches[0]?.confidence.toFixed(1) + '%' || 'N/A',
        averageConfidence: matches.length > 0
          ? (matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length).toFixed(1) + '%'
          : 'N/A'
      }
    };
  }

  private logDetailedResults(
    matches: PracticalCarpetMatch[],
    colorProfile: EnhancedColorProfile,
    textureFeatures: PracticalTextureFeatures
  ): void {
    console.log('🎨 Enhanced Color Analysis:');
    console.log(`   Dominant Colors: ${colorProfile.dominant.slice(0, 3).join(', ')}`);
    console.log(`   Contrast Ratio: ${colorProfile.contrastRatio.toFixed(2)}:1`);
    console.log(`   Saturation: ${(colorProfile.saturationLevel * 100).toFixed(1)}%`);
    console.log(`   Variance: ${colorProfile.variance.toFixed(1)}`);

    console.log('\n🏗️ Pattern Analysis:');
    console.log(`   Type: ${textureFeatures.patternType}`);
    console.log(`   Contrast: ${(textureFeatures.contrast * 100).toFixed(1)}%`);
    console.log(`   Edge Density: ${textureFeatures.edgeDensity.toFixed(1)}/100px`);
    console.log(`   Repetition: ${(textureFeatures.repetitionScore * 100).toFixed(1)}%`);

    console.log('\n🎯 Top Enhanced Matches:');
    matches.slice(0, 3).forEach((match, i) => {
      console.log(`   ${i + 1}. ${match.pubName} (${match.confidence.toFixed(1)}%)`);
      console.log(`      🎨 Color: ${match.colorSimilarity.toFixed(0)}% | 🏗️ Pattern: ${match.patternSimilarity.toFixed(0)}% | 📐 Texture: ${match.textureSimilarity.toFixed(0)}%`);
      console.log(`      💭 ${match.reasoning.join(', ')}`);
    });
  }
}
