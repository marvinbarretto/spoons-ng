/**
 * Enhanced color analysis utilities extracted from legacy color-analysis.ts
 * Provides more sophisticated color extraction with multi-region sampling
 */

export type ColorProfile = {
  dominantColors: string[];
  variance: number;
  contrastRatio: number;
  saturationLevel: number;
  colorDistribution: { [color: string]: number };
  sampledPixels: number;
  processingTime: number;
};

/**
 * Enhanced color extraction with multi-region sampling to avoid lighting bias
 * More accurate than simple pixel sampling approach
 */
export function extractEnhancedColors(videoElement: HTMLVideoElement): ColorProfile {
  const startTime = performance.now();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Use 300x300 canvas for better pattern detection
  canvas.width = 300;
  canvas.height = 300;
  ctx.drawImage(videoElement, 0, 0, 300, 300);

  const imageData = ctx.getImageData(0, 0, 300, 300);
  const data = imageData.data;

  // Multi-region sampling to avoid lighting bias
  const regions = [
    { x: 60, y: 60, w: 60, h: 60 }, // Top-left
    { x: 180, y: 60, w: 60, h: 60 }, // Top-right
    { x: 60, y: 180, w: 60, h: 60 }, // Bottom-left
    { x: 180, y: 180, w: 60, h: 60 }, // Bottom-right
    { x: 120, y: 120, w: 60, h: 60 }, // Center
  ];

  const colorCounts: { [key: string]: number } = {};
  const allRGB: number[][] = [];
  let sampledPixels = 0;

  // Sample from each region
  regions.forEach(region => {
    for (let y = region.y; y < region.y + region.h; y += 2) {
      for (let x = region.x; x < region.x + region.w; x += 2) {
        const index = (y * 300 + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        // Store RGB for variance/contrast analysis
        allRGB.push([r, g, b]);

        // Quantize colors for grouping (reduce noise)
        const qR = Math.floor(r / 32) * 32;
        const qG = Math.floor(g / 32) * 32;
        const qB = Math.floor(b / 32) * 32;
        const colorKey = `#${qR.toString(16).padStart(2, '0')}${qG.toString(16).padStart(2, '0')}${qB.toString(16).padStart(2, '0')}`;

        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
        sampledPixels++;
      }
    }
  });

  // Get dominant colors (top 6)
  const dominantColors = Object.entries(colorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([color]) => color);

  // Calculate enhanced metrics
  const variance = calculateColorVariance(allRGB);
  const contrastRatio = calculateContrastRatio(allRGB);
  const saturationLevel = calculateSaturationLevel(allRGB);

  // Build color distribution
  const colorDistribution: { [color: string]: number } = {};
  Object.entries(colorCounts).forEach(([color, count]) => {
    colorDistribution[color] = count / sampledPixels;
  });

  return {
    dominantColors,
    variance,
    contrastRatio,
    saturationLevel,
    colorDistribution,
    sampledPixels,
    processingTime: performance.now() - startTime,
  };
}

/**
 * Calculate color variance across RGB values - more sophisticated than simple variance
 */
export function calculateColorVariance(rgbValues: number[][]): number {
  if (rgbValues.length === 0) return 0;

  // Calculate mean for each channel
  const means = [0, 1, 2].map(
    i => rgbValues.reduce((sum, rgb) => sum + rgb[i], 0) / rgbValues.length
  );

  // Calculate combined variance across all channels
  const variance =
    rgbValues.reduce(
      (sum, rgb) => sum + [0, 1, 2].reduce((s, i) => s + Math.pow(rgb[i] - means[i], 2), 0),
      0
    ) / rgbValues.length;

  return Math.sqrt(variance);
}

/**
 * Calculate contrast ratio between lightest and darkest colors
 * More accurate than simple min/max approach
 */
export function calculateContrastRatio(rgbValues: number[][]): number {
  const brightnesses = rgbValues.map(rgb => (rgb[0] + rgb[1] + rgb[2]) / 3);
  const min = Math.min(...brightnesses);
  const max = Math.max(...brightnesses);
  return max > 0 ? (max - min) / max : 0;
}

/**
 * Calculate average saturation level across all sampled pixels
 */
export function calculateSaturationLevel(rgbValues: number[][]): number {
  const saturations = rgbValues.map(([r, g, b]) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max > 0 ? (max - min) / max : 0;
  });
  return saturations.reduce((sum, s) => sum + s, 0) / saturations.length;
}

/**
 * Calculate similarity between two colors using perceptual weighting
 */
export function calculateColorSimilarity(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  // Weighted Euclidean distance (perceptual)
  const deltaR = (rgb1[0] - rgb2[0]) * 0.3;
  const deltaG = (rgb1[1] - rgb2[1]) * 0.59;
  const deltaB = (rgb1[2] - rgb2[2]) * 0.11;

  const distance = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);
  return Math.max(0, 1 - distance / 255);
}

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}
