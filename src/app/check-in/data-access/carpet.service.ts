// src/app/check-in/data-access/carpet.service.ts
import { Injectable, signal } from '@angular/core';
import { getAllCarpets, type StaticCarpetData } from './carpet-database';
import {
  type PracticalTextureFeatures,
  type EnhancedColorProfile,
  type PracticalCarpetMatch
} from './carpet.types';
import { extractEnhancedColors } from './color-analysis';
import { analyzeTexture } from './texture-analysis';
import { findIntelligentMatches } from './pattern-matching';

@Injectable({ providedIn: 'root' })
export class CarpetService {

  // ✅ State management
  private readonly _isAnalyzing = signal(false);
  private readonly _lastProfile = signal<EnhancedColorProfile | null>(null);
  private readonly _lastTexture = signal<PracticalTextureFeatures | null>(null);
  private readonly _lastMatches = signal<PracticalCarpetMatch[]>([]);
  private readonly _analysisCount = signal(0);

  // ✅ Public readonly access
  readonly isAnalyzing = this._isAnalyzing.asReadonly();
  readonly lastProfile = this._lastProfile.asReadonly();
  readonly lastTexture = this._lastTexture.asReadonly();
  readonly lastMatches = this._lastMatches.asReadonly();
  readonly analysisCount = this._analysisCount.asReadonly();

  // ✅ Your existing static database
  private readonly carpetDatabase = getAllCarpets();

  constructor() {
    console.log('[CarpetService] 🎯 Initialized with enhanced analysis');
    console.log('[CarpetService] 📊 Database:', this.carpetDatabase.length, 'carpets');
    this.analyzeDatabasePatterns();
  }

  /**
   * Main analysis method - enhanced but practical
   */
  async analyzeVideoFrame(videoElement: HTMLVideoElement): Promise<PracticalCarpetMatch[]> {
    if (this._isAnalyzing()) {
      return this._lastMatches();
    }

    const analysisNumber = this._analysisCount() + 1;
    this._analysisCount.set(analysisNumber);
    this._isAnalyzing.set(true);

    console.log(`\n🔬 === ENHANCED ANALYSIS #${analysisNumber} ===`);
    const startTime = performance.now();

    try {
      // ✅ Step 1: Enhanced color analysis
      console.log('🎨 Step 1: Enhanced color extraction...');
      const colorProfile = this.extractEnhancedColors(videoElement);
      this._lastProfile.set(colorProfile);

      // ✅ Step 2: Texture analysis from video
      console.log('🏗️ Step 2: Texture pattern analysis...');
      const textureFeatures = this.analyzeTexture(videoElement);
      this._lastTexture.set(textureFeatures);

      // ✅ Step 3: Smart matching
      console.log('🎯 Step 3: Intelligent pattern matching...');
      const matches = this.findIntelligentMatches(colorProfile, textureFeatures);
      this._lastMatches.set(matches);

      const totalTime = performance.now() - startTime;
      console.log(`✅ Enhanced analysis complete in ${totalTime.toFixed(1)}ms`);

      this.logResults(matches, colorProfile, textureFeatures);
      return matches;

    } catch (error) {
      console.error('❌ Enhanced analysis failed:', error);
      return [];
    } finally {
      this._isAnalyzing.set(false);
    }
  }

  // ✅ Import analysis methods from separate files
  private extractEnhancedColors(videoElement: HTMLVideoElement): EnhancedColorProfile {
    return extractEnhancedColors(videoElement);
  }

  private analyzeTexture(videoElement: HTMLVideoElement): PracticalTextureFeatures {
    return analyzeTexture(videoElement);
  }

  private findIntelligentMatches(
    colorProfile: EnhancedColorProfile,
    textureFeatures: PracticalTextureFeatures
  ): PracticalCarpetMatch[] {
    return findIntelligentMatches(colorProfile, textureFeatures, this.carpetDatabase);
  }

  private logResults(
    matches: PracticalCarpetMatch[],
    colorProfile: EnhancedColorProfile,
    textureFeatures: PracticalTextureFeatures
  ): void {
    console.log('🎨 Detected Features:');
    console.log(`   Colors: ${colorProfile.dominant.slice(0, 3).join(', ')}`);
    console.log(`   Pattern: ${textureFeatures.patternType}`);
    console.log(`   Contrast: ${(textureFeatures.contrast * 100).toFixed(0)}%`);
    console.log(`   Edge Density: ${textureFeatures.edgeDensity.toFixed(1)}/100px`);
    console.log(`   Repetition: ${(textureFeatures.repetitionScore * 100).toFixed(0)}%`);

    console.log('\n🎯 Top Matches:');
    matches.slice(0, 3).forEach((match, i) => {
      console.log(`   ${i + 1}. ${match.pubName} (${match.confidence.toFixed(1)}%)`);
      console.log(`      🎨 ${match.colorSimilarity.toFixed(0)}% | 📐 ${match.patternSimilarity.toFixed(0)}% | 🏗️ ${match.textureSimilarity.toFixed(0)}%`);
      console.log(`      💭 ${match.reasoning.join(', ')}`);
    });
  }

  private analyzeDatabasePatterns(): void {
    console.log('\n📊 Analyzing Database Patterns:');
    this.carpetDatabase.forEach((carpet, i) => {
      const pattern = carpet.colorProfile.pattern.toLowerCase();
      const variance = carpet.colorProfile.variance;

      let expectedPattern = 'mixed';
      if (pattern.includes('geometric') || pattern.includes('squares')) {
        expectedPattern = 'geometric';
      } else if (pattern.includes('floral') || pattern.includes('leaf') || pattern.includes('paisley')) {
        expectedPattern = 'ornamental';
      } else if (variance < 100) {
        expectedPattern = 'plain';
      }

      console.log(`   ${i + 1}. ${carpet.pubName}: ${expectedPattern} (variance: ${variance})`);
    });
  }
}
