// src/app/check-in/data-access/carpet.types.ts

/**
 * Core types for carpet recognition
 */

export type PracticalTextureFeatures = {
  contrast: number;           // 0-1, local intensity variations
  edgeDensity: number;        // edges per 100 pixels
  repetitionScore: number;    // 0-1, pattern repetition
  colorComplexity: number;    // 0-1, how varied the colors are
  patternType: 'geometric' | 'ornamental' | 'plain' | 'mixed';
};

export type EnhancedColorProfile = {
  dominant: string[];         // RGB colors
  variance: number;
  histogram: number[];
  totalPixels: number;
  sampledPixels: number;
  processingTime: number;

  // ✅ New color analysis
  colorDistribution: { [color: string]: number };
  contrastRatio: number;      // Difference between lightest/darkest
  saturationLevel: number;    // How vivid the colors are
};

export type PracticalCarpetMatch = {
  pubId: string;
  pubName: string;
  confidence: number;         // Overall match confidence

  // ✅ Detailed breakdown
  colorSimilarity: number;
  patternSimilarity: number;
  textureSimilarity: number;

  // ✅ Analysis reasoning
  reasoning: string[];

  // ✅ What we detected
  detectedFeatures: {
    dominantColors: string[];
    patternType: string;
    textureLevel: 'low' | 'medium' | 'high';
    isGeometric: boolean;
    isOrnamental: boolean;
  };
};
