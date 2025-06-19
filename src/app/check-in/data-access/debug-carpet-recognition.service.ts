// src/app/check-in/data-access/debug-carpet-recognition.service.ts
import { Injectable, signal } from '@angular/core';
import { getAllCarpets, type StaticCarpetData } from './carpet-database';

export type DebugColorProfile = {
  dominant: string[];
  histogram: number[];
  variance: number;
  totalPixels: number;
  sampledPixels: number;
  processingTime: number;
};

export type DebugCarpetMatch = {
  pubId: string;
  pubName: string;
  confidence: number;
  colorMatchScore: number;
  histogramMatchScore: number;
  colorDetails: {
    matchedColors: Array<{color1: string, color2: string, similarity: number}>;
    avgColorSimilarity: number;
  };
  histogramDetails: {
    chiSquared: number;
    similarity: number;
  };
  debugNotes: string[];
};

@Injectable({ providedIn: 'root' })
export class DebugCarpetRecognitionService {

  // ✅ State for debugging
  private readonly _isAnalyzing = signal(false);
  private readonly _lastProfile = signal<DebugColorProfile | null>(null);
  private readonly _lastMatches = signal<DebugCarpetMatch[]>([]);
  private readonly _analysisCount = signal(0);

  // ✅ Readonly signals
  readonly isAnalyzing = this._isAnalyzing.asReadonly();
  readonly lastProfile = this._lastProfile.asReadonly();
  readonly lastMatches = this._lastMatches.asReadonly();
  readonly analysisCount = this._analysisCount.asReadonly();

  // ✅ Static carpet database - no async needed!
  private readonly carpetDatabase = getAllCarpets();

  constructor() {
    console.log('[DebugCarpetService] 🎯 Initialized with carpet database');
    console.log('[DebugCarpetService] 📊 Total carpets in database:', this.carpetDatabase.length);

    // Log all available carpets
    this.carpetDatabase.forEach((carpet, index) => {
      console.log(`[DebugCarpetService] ${index + 1}. ${carpet.pubName} (${carpet.pubId})`);
      console.log(`   🎨 Dominant colors:`, carpet.colorProfile.dominant);
      console.log(`   📈 Variance: ${carpet.colorProfile.variance}`);
      console.log(`   🔍 Pattern: ${carpet.colorProfile.pattern}`);
    });
  }

  /**
   * Analyze video frame with extensive debugging
   */
  async analyzeVideoFrame(videoElement: HTMLVideoElement): Promise<DebugCarpetMatch[]> {
    if (this._isAnalyzing()) {
      console.log('[DebugCarpetService] ⏸️  Skipping analysis - already in progress');
      return this._lastMatches();
    }

    const analysisNumber = this._analysisCount() + 1;
    this._analysisCount.set(analysisNumber);

    console.log(`\n🔬 === ANALYSIS #${analysisNumber} START ===`);
    console.log('[DebugCarpetService] 📸 Starting video frame analysis...');

    this._isAnalyzing.set(true);
    const startTime = performance.now();

    try {
      // ✅ Step 1: Extract color profile
      console.log('[DebugCarpetService] 🎨 Step 1: Extracting color profile from video...');
      const colorProfile = this.extractColorProfile(videoElement);
      this._lastProfile.set(colorProfile);

      console.log('[DebugCarpetService] ✅ Color extraction complete:');
      console.log(`   📊 Sampled ${colorProfile.sampledPixels}/${colorProfile.totalPixels} pixels`);
      console.log(`   🎨 Dominant colors:`, colorProfile.dominant);
      console.log(`   📈 Color variance: ${colorProfile.variance.toFixed(2)}`);
      console.log(`   ⏱️  Extraction time: ${colorProfile.processingTime.toFixed(2)}ms`);

      // ✅ Step 2: Compare against database
      console.log('[DebugCarpetService] 🔍 Step 2: Comparing against carpet database...');
      const matches = this.findBestMatches(colorProfile, analysisNumber);
      this._lastMatches.set(matches);

      const totalTime = performance.now() - startTime;
      console.log(`[DebugCarpetService] ✅ Analysis complete in ${totalTime.toFixed(2)}ms`);
      console.log(`[DebugCarpetService] 🎯 Found ${matches.length} potential matches`);

      // Log top 3 matches
      matches.slice(0, 3).forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.pubName}: ${match.confidence}% confidence`);
        console.log(`      🎨 Color match: ${match.colorMatchScore}%`);
        console.log(`      📊 Histogram match: ${match.histogramMatchScore}%`);
      });

      console.log(`🔬 === ANALYSIS #${analysisNumber} END ===\n`);

      return matches;

    } catch (error) {
      console.error('[DebugCarpetService] ❌ Analysis failed:', error);
      return [];
    } finally {
      this._isAnalyzing.set(false);
    }
  }

  /**
   * Extract color profile with detailed logging
   */
  private extractColorProfile(video: HTMLVideoElement): DebugColorProfile {
    const extractStart = performance.now();
    console.log('[DebugCarpetService] 🖼️  Creating canvas for frame capture...');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // ✅ Use smaller size for performance
    canvas.width = 160;
    canvas.height = 120;
    const totalPixels = canvas.width * canvas.height;

    console.log(`[DebugCarpetService] 📐 Canvas size: ${canvas.width}x${canvas.height} (${totalPixels} total pixels)`);

    // ✅ Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    console.log('[DebugCarpetService] 🎨 Analyzing image data...');
    const profile = this.analyzeImageData(imageData, totalPixels);

    const extractTime = performance.now() - extractStart;
    profile.processingTime = extractTime;

    return profile;
  }

  /**
   * Analyze image data with detailed logging
   */
  private analyzeImageData(imageData: ImageData, totalPixels: number): DebugColorProfile {
    const data = imageData.data;
    const colorCount: { [key: string]: number } = {};
    const histogram = new Array(256).fill(0);
    let sampledPixels = 0;

    console.log(`[DebugCarpetService] 🔍 Processing ${data.length / 4} pixels (sampling every 4th)...`);

    // ✅ Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      sampledPixels++;

      // ✅ Build histogram
      const brightness = Math.round((r + g + b) / 3);
      histogram[brightness]++;

      // ✅ Quantize colors to reduce noise
      const quantizedR = Math.round(r / 32) * 32;
      const quantizedG = Math.round(g / 32) * 32;
      const quantizedB = Math.round(b / 32) * 32;

      const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
      colorCount[colorKey] = (colorCount[colorKey] || 0) + 1;
    }

    console.log(`[DebugCarpetService] 📊 Sampled ${sampledPixels} pixels`);
    console.log(`[DebugCarpetService] 🎨 Found ${Object.keys(colorCount).length} unique color groups`);

    // ✅ Get dominant colors
    const sortedColors = Object.entries(colorCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    console.log('[DebugCarpetService] 🏆 Top 5 color groups by frequency:');
    sortedColors.forEach(([color, count], index) => {
      const [r, g, b] = color.split(',').map(Number);
      const hex = this.rgbToHex(r, g, b);
      const percentage = ((count / sampledPixels) * 100).toFixed(1);
      console.log(`   ${index + 1}. ${hex} (RGB: ${r},${g},${b}) - ${count} pixels (${percentage}%)`);
    });

    const dominantHex = sortedColors.map(([color]) => {
      const [r, g, b] = color.split(',').map(Number);
      return this.rgbToHex(r, g, b);
    });

    // ✅ Calculate color variance
    const variance = this.calculateVariance(Object.values(colorCount));
    console.log(`[DebugCarpetService] 📈 Color variance: ${variance.toFixed(2)} (higher = more diverse colors)`);

    return {
      dominant: dominantHex,
      histogram,
      variance,
      totalPixels,
      sampledPixels,
      processingTime: 0 // Will be set by caller
    };
  }

  /**
   * Find best matches with detailed comparison logging
   */
  private findBestMatches(profile: DebugColorProfile, analysisNumber: number): DebugCarpetMatch[] {
    console.log('[DebugCarpetService] 🏁 Starting carpet comparison...');

    const matches = this.carpetDatabase.map((carpet, index) => {
      console.log(`\n   🆚 Comparing against #${index + 1}: ${carpet.pubName}`);
      console.log(`      Database colors:`, carpet.colorProfile.dominant);
      console.log(`      Current colors: `, profile.dominant);

      // ✅ Color matching
      const colorMatchResult = this.calculateColorMatch(
        profile.dominant,
        carpet.colorProfile.dominant,
        carpet.pubName
      );

      // ✅ Histogram matching
      const histogramMatchResult = this.calculateHistogramMatch(
        profile.histogram,
        carpet.colorProfile.histogram,
        carpet.pubName
      );

      // ✅ Final confidence calculation
      const confidence = Math.round((colorMatchResult.score * 0.7 + histogramMatchResult.similarity * 0.3));

      const debugNotes = [
        `Analysis #${analysisNumber}`,
        `Color matching weighted 70%, histogram 30%`,
        `Database variance: ${carpet.colorProfile.variance}`,
        `Current variance: ${profile.variance.toFixed(2)}`,
        `Pattern: ${carpet.colorProfile.pattern}`
      ];

      console.log(`      🎯 Color match: ${colorMatchResult.score}%`);
      console.log(`      📊 Histogram match: ${histogramMatchResult.similarity}%`);
      console.log(`      🏆 Final confidence: ${confidence}%`);

      return {
        pubId: carpet.pubId,
        pubName: carpet.pubName,
        confidence,
        colorMatchScore: colorMatchResult.score,
        histogramMatchScore: histogramMatchResult.similarity,
        colorDetails: colorMatchResult.details,
        histogramDetails: histogramMatchResult,
        debugNotes
      };
    });

    // ✅ Sort and filter
    const sortedMatches = matches
      .filter(match => {
        const include = match.confidence > 15;
        if (!include) {
          console.log(`   ❌ Filtering out ${match.pubName} (${match.confidence}% < 15% threshold)`);
        }
        return include;
      })
      .sort((a, b) => b.confidence - a.confidence);

    console.log(`[DebugCarpetService] 📋 Filtered to ${sortedMatches.length} matches above 15% threshold`);

    return sortedMatches.slice(0, 5); // Top 5 only
  }

  /**
   * Calculate color similarity with detailed breakdown
   */
  private calculateColorMatch(colors1: string[], colors2: string[], pubName: string) {
    console.log(`      🔍 Detailed color matching for ${pubName}:`);

    if (!colors1.length || !colors2.length) {
      console.log(`      ❌ Empty color arrays - returning 0`);
      return { score: 0, details: { matchedColors: [], avgColorSimilarity: 0 } };
    }

    const matchedColors: Array<{color1: string, color2: string, similarity: number}> = [];
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < colors1.length; i++) {
      const color1 = colors1[i];
      let bestMatch = 0;
      let bestColor2 = '';

      for (let j = 0; j < colors2.length; j++) {
        const color2 = colors2[j];
        const similarity = this.calculateColorSimilarity(color1, color2);

        if (similarity > bestMatch) {
          bestMatch = similarity;
          bestColor2 = color2;
        }

        totalSimilarity += similarity;
        comparisons++;
      }

      matchedColors.push({
        color1,
        color2: bestColor2,
        similarity: bestMatch
      });

      console.log(`         ${color1} ↔ ${bestColor2}: ${bestMatch.toFixed(1)}%`);
    }

    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
    console.log(`      📊 Average similarity: ${avgSimilarity.toFixed(1)}%`);

    return {
      score: Math.round(avgSimilarity),
      details: {
        matchedColors,
        avgColorSimilarity: avgSimilarity
      }
    };
  }

  /**
   * Calculate histogram similarity with debug info
   */
  private calculateHistogramMatch(hist1: number[], hist2: number[], pubName: string) {
    console.log(`      📊 Histogram comparison for ${pubName}:`);

    let chiSquared = 0;
    let validBins = 0;

    for (let i = 0; i < Math.min(hist1.length, hist2.length); i++) {
      const sum = hist1[i] + hist2[i];
      if (sum > 0) {
        const diff = hist1[i] - hist2[i];
        const contribution = (diff * diff) / sum;
        chiSquared += contribution;
        validBins++;
      }
    }

    console.log(`         Valid histogram bins: ${validBins}/${hist1.length}`);
    console.log(`         Chi-squared distance: ${chiSquared.toFixed(2)}`);

    // ✅ Convert to similarity percentage
    const similarity = Math.max(0, 100 - (chiSquared / 100));

    return {
      chiSquared,
      similarity: Math.round(similarity)
    };
  }

  /**
   * Calculate color similarity between hex colors
   */
  private calculateColorSimilarity(hex1: string, hex2: string): number {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);

    if (!rgb1 || !rgb2) return 0;

    // ✅ Euclidean distance in RGB space
    const distance = Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );

    // ✅ Convert to similarity percentage (max distance is ~441)
    const similarity = Math.max(0, 100 - (distance / 441) * 100);
    return similarity;
  }

  /**
   * Utility functions
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  }

  private hexToRgb(hex: string): {r: number, g: number, b: number} | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return variance;
  }
}
