// src/app/check-in/data-access/carpet.service.ts
import { Injectable, signal } from '@angular/core';
import { CARPET_DATABASE, calculateColorSimilarity, type CarpetData } from './carpet-signatures';

export type CarpetMatch = {
  pubId: string;
  pubName: string;
  confidence: number;
  reasoning: string;
  colors: string[];
  pattern: string;
};

export type CarpetAnalysis = {
  colors: string[];
  pattern: 'geometric' | 'ornamental' | 'plain' | 'mixed';
  looksLikeCarpet: boolean;
  confidence: number;
};

@Injectable({ providedIn: 'root' })
export class CarpetService {

  // ✅ State management
  private readonly _isAnalyzing = signal(false);
  private readonly _lastAnalysis = signal<CarpetAnalysis | null>(null);
  private readonly _lastMatches = signal<CarpetMatch[]>([]);
  private readonly _analysisCount = signal(0);

  // ✅ Public readonly access
  readonly isAnalyzing = this._isAnalyzing.asReadonly();
  readonly lastAnalysis = this._lastAnalysis.asReadonly();
  readonly lastMatches = this._lastMatches.asReadonly();
  readonly analysisCount = this._analysisCount.asReadonly();

  constructor() {
    console.log('[CarpetService] 🎯 Simple recognition service initialized');
    console.log('[CarpetService] 📊 Database:', CARPET_DATABASE.length, 'carpets');
  }

  /**
   * 🎯 Main analysis method - simple but effective
   */
  async analyzeVideoFrame(videoElement: HTMLVideoElement, userLocation?: {lat: number, lng: number}): Promise<CarpetMatch[]> {
    if (this._isAnalyzing()) return this._lastMatches();

    const analysisNumber = this._analysisCount() + 1;
    this._analysisCount.set(analysisNumber);
    this._isAnalyzing.set(true);

    console.log(`\n🔬 === CARPET ANALYSIS #${analysisNumber} ===`);

    try {
      // ✅ Step 1: Extract visual features
      const analysis = this.analyzeVisualFeatures(videoElement);
      this._lastAnalysis.set(analysis);

      if (!analysis.looksLikeCarpet) {
        console.log('❌ Does not look like a carpet');
        this._lastMatches.set([]);
        return [];
      }

      // ✅ Step 2: Find nearby pub (should be only 1!)
      const nearbyPubs = this.getNearbyPubs(userLocation);

      if (nearbyPubs.length === 0) {
        console.log('📍 No pubs nearby');
        this._lastMatches.set([]);
        return [];
      }

      if (nearbyPubs.length === 1) {
        // ✅ Perfect! Only one pub nearby
        const match = this.createHighConfidenceMatch(nearbyPubs[0], analysis);
        console.log(`🎯 Single pub match: ${match.pubName} (${match.confidence}%)`);
        this._lastMatches.set([match]);
        return [match];
      }

      // ✅ Multiple pubs (shouldn't happen, but handle gracefully)
      const matches = this.matchAgainstPubs(nearbyPubs, analysis);
      this._lastMatches.set(matches);
      return matches;

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      return [];
    } finally {
      this._isAnalyzing.set(false);
    }
  }

  /**
   * 🎨 Extract basic visual features from video frame
   */
  private analyzeVisualFeatures(videoElement: HTMLVideoElement): CarpetAnalysis {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // ✅ Medium resolution for analysis
    canvas.width = 320;
    canvas.height = 240;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // ✅ Extract dominant colors
    const colors = this.extractDominantColors(imageData);

    // ✅ Classify pattern type
    const pattern = this.classifyPattern(imageData);

    // ✅ Check if it looks like carpet
    const looksLikeCarpet = this.doesLookLikeCarpet(colors, pattern, imageData);

    // ✅ Overall confidence in analysis
    const confidence = looksLikeCarpet ? 0.8 : 0.2;

    return {
      colors,
      pattern,
      looksLikeCarpet,
      confidence
    };
  }

  /**
   * 🎨 Extract 3-4 dominant colors
   */
  private extractDominantColors(imageData: ImageData): string[] {
    const data = imageData.data;
    const colorCounts = new Map<string, number>();

    // ✅ Sample every 8th pixel for performance
    for (let i = 0; i < data.length; i += 32) {
      const r = Math.round(data[i] / 32) * 32;      // Quantize to reduce noise
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;

      const colorKey = `${r},${g},${b}`;
      colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
    }

    // ✅ Get top 4 colors
    return Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      });
  }

  /**
   * 🏗️ Classify pattern type
   */
  private classifyPattern(imageData: ImageData): 'geometric' | 'ornamental' | 'plain' | 'mixed' {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // ✅ Simple edge detection
    let edgeCount = 0;
    let totalPixels = 0;

    for (let y = 1; y < height - 1; y += 4) {
      for (let x = 1; x < width - 1; x += 4) {
        const i = (y * width + x) * 4;
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Check neighbors
        const neighbors = [
          0.299 * data[i - 4] + 0.587 * data[i - 3] + 0.114 * data[i - 2],
          0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6],
          0.299 * data[i - width * 4] + 0.587 * data[i - width * 4 + 1] + 0.114 * data[i - width * 4 + 2],
          0.299 * data[i + width * 4] + 0.587 * data[i + width * 4 + 1] + 0.114 * data[i + width * 4 + 2]
        ];

        const avgDiff = neighbors.reduce((sum, n) => sum + Math.abs(brightness - n), 0) / 4;
        if (avgDiff > 30) edgeCount++;
        totalPixels++;
      }
    }

    const edgeDensity = edgeCount / totalPixels;

    // ✅ Classify based on edge density
    if (edgeDensity > 0.4) return 'geometric';
    if (edgeDensity > 0.2) return 'ornamental';
    if (edgeDensity > 0.1) return 'mixed';
    return 'plain';
  }

  /**
   * 🔍 Check if this looks like a carpet
   */
  private doesLookLikeCarpet(colors: string[], pattern: string, imageData: ImageData): boolean {
    // ✅ Basic carpet indicators
    const hasMultipleColors = colors.length >= 3;
    const hasPattern = pattern !== 'plain';
    const hasReasonableColors = this.hasTypicalCarpetColors(colors);

    return hasMultipleColors && (hasPattern || hasReasonableColors);
  }

  /**
   * 🎨 Check for typical carpet color combinations
   */
  private hasTypicalCarpetColors(colors: string[]): boolean {
    const typicalCarpetColors = [
      '#8b0000', '#ff0000', '#ff4500', '#ffd700',  // Reds, oranges, golds
      '#2f4f4f', '#008b8b', '#4682b4', '#000080',  // Blues, teals
      '#8b4513', '#d2691e', '#daa520', '#f5deb3',  // Browns, tans
      '#228b22', '#32cd32', '#9acd32',             // Greens
      '#800080', '#9370db', '#dda0dd'              // Purples
    ];

    return colors.some(color =>
      typicalCarpetColors.some(typical =>
        this.colorSimilarity(color, typical) > 0.7
      )
    );
  }

  /**
   * 📍 Get nearby pubs (should be 1 or 0)
   */
  private getNearbyPubs(userLocation?: {lat: number, lng: number}): CarpetData[] {
    if (!userLocation) {
      console.log('📍 No location provided, using all pubs for testing');
      return CARPET_DATABASE.slice(0, 3); // Return first 3 for testing
    }

    const nearbyPubs = CARPET_DATABASE.filter(pub => {
      const distance = this.calculateDistance(
        userLocation.lat, userLocation.lng,
        pub.location.lat, pub.location.lng
      );
      return distance <= 0.1; // 100m radius
    });

    console.log(`📍 Found ${nearbyPubs.length} pubs within 100m`);
    return nearbyPubs;
  }

  /**
   * 🎯 Create high confidence match for single nearby pub
   */
  private createHighConfidenceMatch(pub: CarpetData, analysis: CarpetAnalysis): CarpetMatch {
    // ✅ High base confidence since there's only one pub nearby
    let confidence = 75;

    // ✅ Visual confirmation bonuses
    const colorMatch = calculateColorSimilarity(analysis.colors, pub.signature.colors);
    const patternMatch = analysis.pattern === pub.signature.pattern;

    if (colorMatch > 0.6) confidence += 15;
    if (patternMatch) confidence += 10;

    confidence = Math.min(95, confidence); // Cap at 95%

    const reasoning = this.generateReasoning(colorMatch, patternMatch, true);

    return {
      pubId: pub.pubId,
      pubName: pub.pubName,
      confidence,
      reasoning,
      colors: analysis.colors,
      pattern: analysis.pattern
    };
  }

  /**
   * 🔄 Match against multiple pubs (fallback)
   */
  private matchAgainstPubs(pubs: CarpetData[], analysis: CarpetAnalysis): CarpetMatch[] {
    console.log(`🔄 Matching against ${pubs.length} pubs`);

    const matches = pubs.map(pub => {
      const colorMatch = calculateColorSimilarity(analysis.colors, pub.signature.colors);
      const patternMatch = analysis.pattern === pub.signature.pattern;

      let confidence = 30; // Lower base confidence for multiple options
      if (colorMatch > 0.7) confidence += 30;
      else if (colorMatch > 0.5) confidence += 20;
      else if (colorMatch > 0.3) confidence += 10;

      if (patternMatch) confidence += 20;

      const reasoning = this.generateReasoning(colorMatch, patternMatch, false);

      return {
        pubId: pub.pubId,
        pubName: pub.pubName,
        confidence,
        reasoning,
        colors: analysis.colors,
        pattern: analysis.pattern
      };
    });

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 💭 Generate reasoning for match
   */
  private generateReasoning(colorMatch: number, patternMatch: boolean, singlePub: boolean): string {
    const reasons: string[] = [];

    if (singlePub) {
      reasons.push('Only pub in area');
    }

    if (colorMatch > 0.7) {
      reasons.push('Strong color match');
    } else if (colorMatch > 0.5) {
      reasons.push('Good color similarity');
    } else if (colorMatch > 0.3) {
      reasons.push('Some color overlap');
    } else {
      reasons.push('Weak color match');
    }

    if (patternMatch) {
      reasons.push('Pattern type matches');
    } else {
      reasons.push('Different pattern type');
    }

    return reasons.join(', ');
  }

  /**
   * 🎨 Color similarity helper
   */
  private colorSimilarity(hex1: string, hex2: string): number {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);

    if (!rgb1 || !rgb2) return 0;

    const deltaR = Math.abs(rgb1[0] - rgb2[0]);
    const deltaG = Math.abs(rgb1[1] - rgb2[1]);
    const deltaB = Math.abs(rgb1[2] - rgb2[2]);

    const distance = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
    return Math.max(0, 1 - distance / (255 * Math.sqrt(3)));
  }

  /**
   * 🎨 Hex to RGB converter
   */
  private hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }

  /**
   * 📍 Distance calculation
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }
}
