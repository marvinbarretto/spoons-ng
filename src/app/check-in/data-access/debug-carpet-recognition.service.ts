// src/app/check-in/data-access/enhanced-carpet-recognition.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { getAllCarpets, type StaticCarpetData } from './carpet-database';

// ✅ Enhanced feature types
export type TextureFeatures = {
  contrast: number;        // 0-1, high for busy patterns
  homogeneity: number;     // 0-1, low for complex textures
  entropy: number;         // 0-8, pattern complexity
  edgeDensity: number;     // edges per 100 pixels
  variance: number;        // pixel intensity variance
};

export type GeometricFeatures = {
  hasSquares: boolean;
  hasOrnamental: boolean;
  dominantShape: 'squares' | 'ornamental' | 'plain' | 'mixed';
  patternScale: 'fine' | 'medium' | 'large';
  edgeOrientation: 'horizontal' | 'vertical' | 'diagonal' | 'mixed';
  repetitionScore: number; // 0-1, how repetitive the pattern is
};

export type ColorProfile = {
  dominant: string[];
  variance: number;
  distribution: { [color: string]: number };
  sampledPixels: number;
  totalPixels: number;
  processingTime: number;
};

export type EnhancedCarpetFeatures = {
  colorProfile: ColorProfile;
  textureFeatures: TextureFeatures;
  geometricFeatures: GeometricFeatures;
  confidence: number;
};

export type EnhancedCarpetMatch = {
  pubId: string;
  pubName: string;
  confidence: number;
  colorSimilarity: number;
  textureSimilarity: number;
  geometrySimilarity: number;
  reasoning: string[];
  features: EnhancedCarpetFeatures;
};

@Injectable({
  providedIn: 'root'
})
export class EnhancedCarpetRecognitionService {

  // ✅ State signals
  private readonly _isAnalyzing = signal(false);
  private readonly _lastFeatures = signal<EnhancedCarpetFeatures | null>(null);
  private readonly _lastMatches = signal<EnhancedCarpetMatch[]>([]);
  private readonly _analysisCount = signal(0);

  // ✅ Public readonly signals
  readonly isAnalyzing = this._isAnalyzing.asReadonly();
  readonly lastFeatures = this._lastFeatures.asReadonly();
  readonly lastMatches = this._lastMatches.asReadonly();
  readonly analysisCount = this._analysisCount.asReadonly();

  // ✅ Carpet database
  private readonly carpetDatabase = getAllCarpets();

  constructor() {
    console.log('[EnhancedCarpetService] 🎯 Initialized with enhanced recognition');
    console.log('[EnhancedCarpetService] 📊 Database size:', this.carpetDatabase.length);
  }

  /**
   * Main analysis method with enhanced features
   */
  async analyzeVideoFrame(videoElement: HTMLVideoElement): Promise<EnhancedCarpetMatch[]> {
    if (this._isAnalyzing()) {
      console.log('[EnhancedCarpetService] ⏸️  Analysis already in progress');
      return this._lastMatches();
    }

    const analysisNumber = this._analysisCount() + 1;
    this._analysisCount.set(analysisNumber);

    console.log(`\n🔬 === ENHANCED ANALYSIS #${analysisNumber} START ===`);
    this._isAnalyzing.set(true);
    const startTime = performance.now();

    try {
      // ✅ Extract comprehensive features
      const features = this.extractAllFeatures(videoElement);
      this._lastFeatures.set(features);

      console.log('[EnhancedCarpetService] ✅ Feature extraction complete:');
      console.log('   🎨 Color variance:', features.colorProfile.variance.toFixed(2));
      console.log('   🏗️  Texture contrast:', features.textureFeatures.contrast.toFixed(3));
      console.log('   📐 Dominant shape:', features.geometricFeatures.dominantShape);
      console.log('   🔄 Repetition score:', features.geometricFeatures.repetitionScore.toFixed(3));

      // ✅ Find best matches using all features
      const matches = this.findEnhancedMatches(features);
      this._lastMatches.set(matches);

      const totalTime = performance.now() - startTime;
      console.log(`[EnhancedCarpetService] ✅ Analysis complete in ${totalTime.toFixed(2)}ms`);
      console.log(`[EnhancedCarpetService] 🎯 Found ${matches.length} matches`);

      // ✅ Log top matches with reasoning
      matches.slice(0, 3).forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.pubName} (${match.confidence.toFixed(1)}%)`);
        console.log(`      🎨 Color: ${match.colorSimilarity.toFixed(1)}% | 🏗️ Texture: ${match.textureSimilarity.toFixed(1)}% | 📐 Geometry: ${match.geometrySimilarity.toFixed(1)}%`);
        console.log(`      💭 Reasoning: ${match.reasoning.join(', ')}`);
      });

      return matches;

    } catch (error) {
      console.error('[EnhancedCarpetService] ❌ Analysis failed:', error);
      this._lastMatches.set([]);
      return [];
    } finally {
      this._isAnalyzing.set(false);
    }
  }

  /**
   * Extract all carpet features from video frame
   */
  private extractAllFeatures(videoElement: HTMLVideoElement): EnhancedCarpetFeatures {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // ✅ Optimize canvas size for performance vs accuracy
    const size = 400; // Good balance for pattern detection
    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(videoElement, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);

    return {
      colorProfile: this.extractEnhancedColorProfile(canvas, ctx),
      textureFeatures: this.extractTextureFeatures(imageData),
      geometricFeatures: this.extractGeometricFeatures(imageData),
      confidence: 0 // Will be calculated during matching
    };
  }

  /**
   * Enhanced color profile with better sampling
   */
  private extractEnhancedColorProfile(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): ColorProfile {
    const startTime = performance.now();
    const size = canvas.width;

    // ✅ Sample from multiple regions to avoid lighting bias
    const regions = [
      { x: size * 0.2, y: size * 0.2, w: size * 0.25, h: size * 0.25 },  // Top-left
      { x: size * 0.55, y: size * 0.2, w: size * 0.25, h: size * 0.25 }, // Top-right
      { x: size * 0.2, y: size * 0.55, w: size * 0.25, h: size * 0.25 }, // Bottom-left
      { x: size * 0.55, y: size * 0.55, w: size * 0.25, h: size * 0.25 }  // Bottom-right
    ];

    const allColors: string[] = [];
    const colorCounts: { [color: string]: number } = {};

    regions.forEach(region => {
      const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
      const data = imageData.data;

      // ✅ Sample every 4th pixel for performance
      for (let i = 0; i < data.length; i += 16) { // Skip 4 pixels (16 bytes)
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // ✅ Quantize colors to reduce noise
        const quantizedColor = this.quantizeColor(r, g, b);
        allColors.push(quantizedColor);
        colorCounts[quantizedColor] = (colorCounts[quantizedColor] || 0) + 1;
      }
    });

    // ✅ Find dominant colors by frequency
    const sortedColors = Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([color]) => color);

    // ✅ Calculate color variance
    const variance = this.calculateColorVariance(allColors);

    // ✅ Build distribution map
    const totalSamples = allColors.length;
    const distribution: { [color: string]: number } = {};
    Object.entries(colorCounts).forEach(([color, count]) => {
      distribution[color] = count / totalSamples;
    });

    return {
      dominant: sortedColors,
      variance,
      distribution,
      sampledPixels: allColors.length,
      totalPixels: size * size,
      processingTime: performance.now() - startTime
    };
  }

  /**
   * Extract texture features using statistical analysis
   */
  private extractTextureFeatures(imageData: ImageData): TextureFeatures {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // ✅ Convert to grayscale for texture analysis
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]));
    }

    // ✅ Calculate statistical texture measures
    const contrast = this.calculateContrast(gray, width, height);
    const homogeneity = this.calculateHomogeneity(gray, width, height);
    const entropy = this.calculateEntropy(gray);
    const edgeDensity = this.calculateEdgeDensity(gray, width, height);
    const variance = this.calculatePixelVariance(gray);

    return {
      contrast,
      homogeneity,
      entropy,
      edgeDensity,
      variance
    };
  }

  /**
   * Extract geometric pattern features
   */
  private extractGeometricFeatures(imageData: ImageData): GeometricFeatures {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // ✅ Convert to grayscale
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]));
    }

    // ✅ Detect edges using Sobel operator
    const edges = this.sobelEdgeDetection(gray, width, height);

    // ✅ Analyze edge patterns
    const edgeOrientation = this.analyzeEdgeOrientation(edges, width, height);
    const hasSquares = this.detectSquarePatterns(edges, width, height);
    const hasOrnamental = this.detectOrnamentalPatterns(gray, width, height);
    const repetitionScore = this.calculateRepetitionScore(gray, width, height);

    // ✅ Determine dominant shape
    let dominantShape: 'squares' | 'ornamental' | 'plain' | 'mixed' = 'plain';
    if (hasSquares && hasOrnamental) {
      dominantShape = 'mixed';
    } else if (hasSquares) {
      dominantShape = 'squares';
    } else if (hasOrnamental) {
      dominantShape = 'ornamental';
    }

    // ✅ Estimate pattern scale
    const patternScale = this.estimatePatternScale(repetitionScore, edges);

    return {
      hasSquares,
      hasOrnamental,
      dominantShape,
      patternScale,
      edgeOrientation,
      repetitionScore
    };
  }

  /**
   * Find best matches using all features
   */
  private findEnhancedMatches(capturedFeatures: EnhancedCarpetFeatures): EnhancedCarpetMatch[] {
    const matches: EnhancedCarpetMatch[] = [];

    this.carpetDatabase.forEach(carpet => {
      // ✅ Calculate individual similarities
      const colorSim = this.compareColorProfiles(capturedFeatures.colorProfile, carpet.colorProfile);
      const textureSim = this.compareTextureFeatures(capturedFeatures.textureFeatures, carpet);
      const geometrySim = this.compareGeometricFeatures(capturedFeatures.geometricFeatures, carpet);

      // ✅ Weighted overall confidence
      const weights = { color: 0.25, texture: 0.4, geometry: 0.35 }; // Prioritize texture and geometry
      const confidence = (colorSim * weights.color) + (textureSim * weights.texture) + (geometrySim * weights.geometry);

      // ✅ Generate reasoning
      const reasoning = this.generateReasoning(colorSim, textureSim, geometrySim, capturedFeatures, carpet);

      matches.push({
        pubId: carpet.pubId,
        pubName: carpet.pubName,
        confidence: confidence * 100,
        colorSimilarity: colorSim * 100,
        textureSimilarity: textureSim * 100,
        geometrySimilarity: geometrySim * 100,
        reasoning,
        features: capturedFeatures
      });
    });

    // ✅ Sort by confidence and return top matches
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4); // Top 4 matches
  }

  // ✅ Helper methods for texture analysis
  private calculateContrast(gray: number[], width: number, height: number): number {
    let contrast = 0;
    let count = 0;

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const current = gray[y * width + x];
        const right = gray[y * width + (x + 1)];
        const down = gray[(y + 1) * width + x];

        contrast += Math.abs(current - right) + Math.abs(current - down);
        count += 2;
      }
    }

    return count > 0 ? contrast / (count * 255) : 0; // Normalize to 0-1
  }

  private calculateHomogeneity(gray: number[], width: number, height: number): number {
    let homogeneity = 0;
    let count = 0;

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const current = gray[y * width + x];
        const right = gray[y * width + (x + 1)];
        const down = gray[(y + 1) * width + x];

        homogeneity += 1 / (1 + Math.abs(current - right));
        homogeneity += 1 / (1 + Math.abs(current - down));
        count += 2;
      }
    }

    return count > 0 ? homogeneity / count : 0;
  }

  private calculateEntropy(gray: number[]): number {
    const histogram = new Array(256).fill(0);
    gray.forEach(pixel => histogram[pixel]++);

    const total = gray.length;
    let entropy = 0;

    histogram.forEach(count => {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    });

    return entropy;
  }

  private calculateEdgeDensity(gray: number[], width: number, height: number): number {
    const edges = this.sobelEdgeDetection(gray, width, height);
    const threshold = 128;
    const edgeCount = edges.filter(edge => edge > threshold).length;
    return (edgeCount / edges.length) * 100; // Edges per 100 pixels
  }

  private sobelEdgeDetection(gray: number[], width: number, height: number): number[] {
    const edges = new Array(gray.length).fill(0);

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = gray[(y + ky) * width + (x + kx)];
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            gx += pixel * sobelX[kernelIndex];
            gy += pixel * sobelY[kernelIndex];
          }
        }

        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return edges;
  }

  // ✅ Pattern detection methods
  private detectSquarePatterns(edges: number[], width: number, height: number): boolean {
    const threshold = 100;
    let horizontalLines = 0;
    let verticalLines = 0;

    // ✅ Look for regular horizontal/vertical edge patterns
    for (let y = 0; y < height; y += 10) {
      for (let x = 0; x < width - 1; x++) {
        if (edges[y * width + x] > threshold && edges[y * width + x + 1] > threshold) {
          horizontalLines++;
        }
      }
    }

    for (let x = 0; x < width; x += 10) {
      for (let y = 0; y < height - 1; y++) {
        if (edges[y * width + x] > threshold && edges[(y + 1) * width + x] > threshold) {
          verticalLines++;
        }
      }
    }

    // ✅ Square patterns have balanced horizontal/vertical edges
    const ratio = Math.min(horizontalLines, verticalLines) / Math.max(horizontalLines, verticalLines);
    return ratio > 0.6 && (horizontalLines + verticalLines) > 50;
  }

  private detectOrnamentalPatterns(gray: number[], width: number, height: number): boolean {
    // ✅ Look for curved, irregular patterns typical of ornamental carpets
    let curvedEdges = 0;
    const windowSize = 5;

    for (let y = windowSize; y < height - windowSize; y += 8) {
      for (let x = windowSize; x < width - windowSize; x += 8) {
        // ✅ Check for non-linear intensity changes (curves)
        const center = gray[y * width + x];
        const surrounding = [
          gray[(y - windowSize) * width + x],
          gray[(y + windowSize) * width + x],
          gray[y * width + (x - windowSize)],
          gray[y * width + (x + windowSize)]
        ];

        const variations = surrounding.map(val => Math.abs(val - center));
        const maxVariation = Math.max(...variations);
        const variance = variations.reduce((sum, v) => sum + v * v, 0) / variations.length;

        if (maxVariation > 30 && variance > 200) {
          curvedEdges++;
        }
      }
    }

    return curvedEdges > 20; // Threshold for ornamental detection
  }

  // ✅ Utility methods
  private quantizeColor(r: number, g: number, b: number): string {
    // ✅ Reduce color precision to group similar colors
    const qr = Math.floor(r / 32) * 32;
    const qg = Math.floor(g / 32) * 32;
    const qb = Math.floor(b / 32) * 32;
    return `rgb(${qr},${qg},${qb})`;
  }

  private calculateColorVariance(colors: string[]): number {
    // ✅ Simple color variance calculation
    const rgbValues = colors.map(color => {
      const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
      return match ? [+match[1], +match[2], +match[3]] : [0, 0, 0];
    });

    const mean = [0, 1, 2].map(i =>
      rgbValues.reduce((sum, rgb) => sum + rgb[i], 0) / rgbValues.length
    );

    const variance = rgbValues.reduce((sum, rgb) =>
      sum + [0, 1, 2].reduce((s, i) => s + Math.pow(rgb[i] - mean[i], 2), 0), 0
    ) / rgbValues.length;

    return Math.sqrt(variance);
  }

  private calculatePixelVariance(gray: number[]): number {
    const mean = gray.reduce((sum, val) => sum + val, 0) / gray.length;
    const variance = gray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / gray.length;
    return Math.sqrt(variance);
  }

  private analyzeEdgeOrientation(edges: number[], width: number, height: number): 'horizontal' | 'vertical' | 'diagonal' | 'mixed' {
    // ✅ Simplified orientation analysis
    let horizontal = 0, vertical = 0, diagonal = 0;
    const threshold = 100;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (edges[y * width + x] > threshold) {
          const left = edges[y * width + (x - 1)];
          const right = edges[y * width + (x + 1)];
          const up = edges[(y - 1) * width + x];
          const down = edges[(y + 1) * width + x];

          if (Math.abs(left - right) < Math.abs(up - down)) horizontal++;
          else if (Math.abs(up - down) < Math.abs(left - right)) vertical++;
          else diagonal++;
        }
      }
    }

    const total = horizontal + vertical + diagonal;
    if (total === 0) return 'mixed';

    const hRatio = horizontal / total;
    const vRatio = vertical / total;

    if (hRatio > 0.6) return 'horizontal';
    if (vRatio > 0.6) return 'vertical';
    if (diagonal / total > 0.4) return 'diagonal';
    return 'mixed';
  }

  private calculateRepetitionScore(gray: number[], width: number, height: number): number {
    // ✅ Simple repetition detection using autocorrelation
    const blockSize = 20;
    const blocks: number[][] = [];

    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        const block: number[] = [];
        for (let by = 0; by < blockSize; by++) {
          for (let bx = 0; bx < blockSize; bx++) {
            block.push(gray[(y + by) * width + (x + bx)]);
          }
        }
        blocks.push(block);
      }
    }

    if (blocks.length < 2) return 0;

    // ✅ Find similar blocks
    let similarPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < blocks.length - 1; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const similarity = this.blockSimilarity(blocks[i], blocks[j]);
        if (similarity > 0.8) similarPairs++;
        totalPairs++;
      }
    }

    return totalPairs > 0 ? similarPairs / totalPairs : 0;
  }

  private blockSimilarity(block1: number[], block2: number[]): number {
    let diff = 0;
    for (let i = 0; i < block1.length; i++) {
      diff += Math.abs(block1[i] - block2[i]);
    }
    const maxDiff = block1.length * 255;
    return 1 - (diff / maxDiff);
  }

  private estimatePatternScale(repetitionScore: number, edges: number[]): 'fine' | 'medium' | 'large' {
    if (repetitionScore > 0.7) return 'fine';
    if (repetitionScore > 0.3) return 'medium';
    return 'large';
  }

  // ✅ Comparison methods
  private compareColorProfiles(captured: ColorProfile, reference: any): number {
    // ✅ Compare dominant colors with tolerance for lighting
    const capturedColors = captured.dominant.slice(0, 4);
    const referenceColors = reference.dominant.slice(0, 4);

    let matches = 0;
    capturedColors.forEach(capturedColor => {
      const bestMatch = referenceColors.reduce((best: number, refColor: string) => {
        const similarity = this.colorSimilarity(capturedColor, refColor);
        return similarity > best ? similarity : best;
      }, 0);
      if (bestMatch > 0.7) matches++;
    });

    return matches / Math.max(capturedColors.length, referenceColors.length);
  }

  private compareTextureFeatures(captured: TextureFeatures, reference: any): number {
    // ✅ For now, use basic pattern matching since we don't have texture data in DB
    // This would be enhanced when you add texture features to your carpet database

    if (reference.colorProfile.pattern === 'geometric') {
      // Geometric patterns should have higher contrast and edge density
      return (captured.contrast > 0.3 && captured.edgeDensity > 15) ? 0.8 : 0.3;
    } else if (reference.colorProfile.pattern === 'ornamental') {
      // Ornamental patterns should have varied texture but lower repetition
      return (captured.entropy > 4 && captured.edgeDensity < 0.5) ? 0.8 : 0.3;
    }

    return 0.5; // Neutral for unknown patterns
  }

  private compareGeometricFeatures(captured: GeometricFeatures, reference: any): number {
    // ✅ Match geometric features with database pattern info
    let score = 0;

    if (reference.colorProfile.pattern === 'geometric' && captured.hasSquares) {
      score += 0.4;
    }
    if (reference.colorProfile.pattern === 'ornamental' && captured.hasOrnamental) {
      score += 0.4;
    }
    if (reference.colorProfile.pattern === 'plain' && captured.dominantShape === 'plain') {
      score += 0.3;
    }

    // ✅ Bonus for repetition matching
    if (reference.colorProfile.pattern === 'geometric' && captured.repetitionScore > 0.5) {
      score += 0.2;
    }
    if (reference.colorProfile.pattern === 'ornamental' && captured.repetitionScore < 0.5) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private colorSimilarity(color1: string, color2: string): number {
    // ✅ Extract RGB values
    const rgb1 = color1.match(/rgb\((\d+),(\d+),(\d+)\)/)?.slice(1).map(Number) || [0, 0, 0];
    const rgb2 = color2.match(/rgb\((\d+),(\d+),(\d+)\)/)?.slice(1).map(Number) || [0, 0, 0];

    // ✅ Calculate Euclidean distance
    const distance = Math.sqrt(
      Math.pow(rgb1[0] - rgb2[0], 2) +
      Math.pow(rgb1[1] - rgb2[1], 2) +
      Math.pow(rgb1[2] - rgb2[2], 2)
    );

    // ✅ Convert to similarity (0-1)
    const maxDistance = Math.sqrt(3 * Math.pow(255, 2));
    return 1 - (distance / maxDistance);
  }

  private generateReasoning(colorSim: number, textureSim: number, geometrySim: number, features: EnhancedCarpetFeatures, carpet: any): string[] {
    const reasoning: string[] = [];

    if (colorSim > 0.7) reasoning.push('Strong color match');
    else if (colorSim > 0.4) reasoning.push('Moderate color similarity');
    else reasoning.push('Weak color match');

    if (textureSim > 0.7) reasoning.push('Excellent texture match');
    else if (textureSim > 0.4) reasoning.push('Good texture similarity');
    else reasoning.push('Poor texture match');

    if (geometrySim > 0.7) reasoning.push('Pattern geometry matches well');
    else if (geometrySim > 0.4) reasoning.push('Some geometric similarity');
    else reasoning.push('Pattern mismatch');

    // ✅ Add specific feature insights
    if (features.geometricFeatures.hasSquares) reasoning.push('Square patterns detected');
    if (features.geometricFeatures.hasOrnamental) reasoning.push('Ornamental features found');
    if (features.textureFeatures.contrast > 0.5) reasoning.push('High contrast pattern');
    if (features.geometricFeatures.repetitionScore > 0.6) reasoning.push('Highly repetitive design');

    return reasoning;
  }
}
