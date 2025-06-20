// src/app/check-in/data-access/pattern-matching.ts
import type { StaticCarpetData } from './carpet-database';
import type { EnhancedColorProfile, PracticalTextureFeatures, PracticalCarpetMatch } from './carpet.types';
import { colorSimilarity } from './color-analysis';
import { CarpetConfidenceConfig } from './carpet-confidence-config';

/**
 * Find intelligent matches using enhanced features
 */
export function findIntelligentMatches(
  colorProfile: EnhancedColorProfile,
  textureFeatures: PracticalTextureFeatures,
  carpetDatabase: StaticCarpetData[]
): PracticalCarpetMatch[] {

  const matches: PracticalCarpetMatch[] = [];

  carpetDatabase.forEach(carpet => {
    // ✅ Color similarity (improved)
    const colorSim = compareColorsEnhanced(colorProfile, carpet);

    // ✅ Pattern similarity (new)
    const patternSim = comparePatterns(textureFeatures, carpet);

    // ✅ Texture similarity (new)
    const textureSim = compareTexture(textureFeatures, carpet);

    // ✅ Dynamic weighted confidence
    const imageFeatures = {
      colorVariance: colorProfile.variance / 1000,
      patternClarity: textureFeatures.contrast,
      textureDetail: textureFeatures.edgeDensity / 100
    };
    const weights = CarpetConfidenceConfig.getDynamicWeights(imageFeatures);
    const confidence = (colorSim * weights.color) +
                      (patternSim * weights.pattern) +
                      (textureSim * weights.texture);

    // ✅ Generate reasoning
    const reasoning = generateReasoning(colorSim, patternSim, textureSim, textureFeatures, carpet);

    // ✅ Detected features
    const detectedFeatures = {
      dominantColors: colorProfile.dominant.slice(0, 3),
      patternType: textureFeatures.patternType,
      textureLevel: getTextureLevel(textureFeatures),
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
    .slice(0, 4);
}

/**
 * Enhanced color comparison
 */
export function compareColorsEnhanced(captured: EnhancedColorProfile, reference: StaticCarpetData): number {
  const capturedColors = captured.dominant.slice(0, 4);
  const referenceColors = reference.colorProfile.dominant.slice(0, 4);

  let totalSimilarity = 0;
  let comparisons = 0;

  capturedColors.forEach(capturedColor => {
    const bestMatch = referenceColors.reduce((best, refColor) => {
      const sim = colorSimilarity(capturedColor, refColor);
      return Math.max(best, sim);
    }, 0);
    totalSimilarity += bestMatch;
    comparisons++;
  });

  const colorMatch = comparisons > 0 ? totalSimilarity / comparisons : 0;

  // ✅ Bonus for similar variance
  const varianceBonus = 1 - Math.abs(captured.variance - reference.colorProfile.variance) / 100;

  return (colorMatch * 0.8) + (Math.max(0, varianceBonus) * 0.2);
}

/**
 * Pattern comparison based on carpet description
 */
export function comparePatterns(captured: PracticalTextureFeatures, reference: StaticCarpetData): number {
  // ✅ Match based on carpet pattern description
  const patternDesc = reference.colorProfile.pattern.toLowerCase();

  let score = 0;

  // ✅ Geometric pattern matching
  if (patternDesc.includes('geometric') || patternDesc.includes('squares')) {
    if (captured.patternType === 'geometric') score += 0.6;
    if (captured.repetitionScore > 0.6) score += 0.2;
    if (captured.edgeDensity > 15) score += 0.2;
  }

  // ✅ Ornamental pattern matching
  else if (patternDesc.includes('floral') || patternDesc.includes('leaf') || patternDesc.includes('paisley')) {
    if (captured.patternType === 'ornamental') score += 0.6;
    if (captured.repetitionScore < 0.5) score += 0.2; // Less repetitive
    if (captured.edgeDensity > 12) score += 0.2;
  }

  // ✅ Plain/uniform pattern
  else if (patternDesc.includes('plain') || patternDesc.includes('uniform')) {
    if (captured.patternType === 'plain') score += 0.6;
    if (captured.repetitionScore > 0.7) score += 0.2;
    if (captured.edgeDensity < 10) score += 0.2;
  }

  // ✅ Complex/patchwork
  else {
    if (captured.patternType === 'mixed') score += 0.4;
    if (captured.colorComplexity > 0.6) score += 0.3;
    if (captured.contrast > 0.4) score += 0.3;
  }

  return Math.min(score, 1.0);
}

/**
 * Texture comparison based on variance
 */
export function compareTexture(captured: PracticalTextureFeatures, reference: StaticCarpetData): number {
  const refVariance = reference.colorProfile.variance;

  // ✅ High variance carpets should have high contrast/edges
  if (refVariance > 150) {
    return (captured.contrast > 0.3 ? 0.5 : 0.1) +
           (captured.edgeDensity > 15 ? 0.5 : 0.1);
  }

  // ✅ Low variance carpets should be uniform
  else if (refVariance < 100) {
    return (captured.contrast < 0.3 ? 0.5 : 0.1) +
           (captured.repetitionScore > 0.6 ? 0.5 : 0.1);
  }

  // ✅ Medium variance
  return 0.5;
}

/**
 * Get texture complexity level
 */
export function getTextureLevel(features: PracticalTextureFeatures): 'low' | 'medium' | 'high' {
  const complexityScore = features.contrast + (features.edgeDensity / 30) + features.colorComplexity;
  if (complexityScore < 0.8) return 'low';
  if (complexityScore < 1.5) return 'medium';
  return 'high';
}

/**
 * Generate human-readable reasoning
 */
export function generateReasoning(
  colorSim: number,
  patternSim: number,
  textureSim: number,
  features: PracticalTextureFeatures,
  carpet: StaticCarpetData
): string[] {
  const reasoning: string[] = [];

  // ✅ Color analysis
  if (colorSim > 0.7) reasoning.push('Strong color match');
  else if (colorSim > 0.4) reasoning.push('Moderate color similarity');
  else reasoning.push('Weak color match');

  // ✅ Pattern analysis
  if (patternSim > 0.7) reasoning.push('Excellent pattern match');
  else if (patternSim > 0.4) reasoning.push('Good pattern similarity');
  else reasoning.push('Pattern mismatch');

  // ✅ Texture insights
  if (features.patternType === 'geometric') reasoning.push('Geometric pattern detected');
  if (features.patternType === 'ornamental') reasoning.push('Ornamental features found');
  if (features.repetitionScore > 0.7) reasoning.push('Highly repetitive design');
  if (features.edgeDensity > 20) reasoning.push('High detail pattern');
  if (features.contrast > 0.5) reasoning.push('High contrast texture');

  return reasoning;
}
