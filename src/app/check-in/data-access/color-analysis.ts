// src/app/check-in/data-access/color-analysis.ts
import type { EnhancedColorProfile } from './carpet.types';

/**
 * Enhanced color extraction with better sampling
 */
export function extractEnhancedColors(videoElement: HTMLVideoElement): EnhancedColorProfile {
  const startTime = performance.now();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // ✅ Bigger canvas for better pattern detection
  canvas.width = 300;
  canvas.height = 300;
  ctx.drawImage(videoElement, 0, 0, 300, 300);

  const imageData = ctx.getImageData(0, 0, 300, 300);
  const data = imageData.data;

  // ✅ Multi-region sampling to avoid lighting bias
  const regions = [
    { x: 60, y: 60, w: 60, h: 60 },     // Top-left
    { x: 180, y: 60, w: 60, h: 60 },    // Top-right
    { x: 60, y: 180, w: 60, h: 60 },    // Bottom-left
    { x: 180, y: 180, w: 60, h: 60 },   // Bottom-right
    { x: 120, y: 120, w: 60, h: 60 }    // Center
  ];

  const colorCounts: { [key: string]: number } = {};
  const allRGB: number[][] = [];
  const histogram = new Array(256).fill(0);
  let sampledPixels = 0;

  // ✅ Sample from each region
  regions.forEach(region => {
    for (let y = region.y; y < region.y + region.h; y += 2) {
      for (let x = region.x; x < region.x + region.w; x += 2) {
        const index = (y * 300 + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        // ✅ Store RGB for analysis
        allRGB.push([r, g, b]);

        // ✅ Quantize for grouping
        const qR = Math.floor(r / 32) * 32;
        const qG = Math.floor(g / 32) * 32;
        const qB = Math.floor(b / 32) * 32;
        const colorKey = `rgb(${qR},${qG},${qB})`;

        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;

        // ✅ Build brightness histogram
        const brightness = Math.round((r + g + b) / 3);
        histogram[brightness]++;

        sampledPixels++;
      }
    }
  });

  // ✅ Get dominant colors
  const sortedColors = Object.entries(colorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6)
    .map(([color]) => color);

  // ✅ Calculate enhanced metrics
  const variance = calculateColorVariance(allRGB);
  const contrastRatio = calculateContrastRatio(allRGB);
  const saturationLevel = calculateSaturationLevel(allRGB);

  // ✅ Build distribution
  const totalSamples = sampledPixels;
  const colorDistribution: { [color: string]: number } = {};
  Object.entries(colorCounts).forEach(([color, count]) => {
    colorDistribution[color] = count / totalSamples;
  });

  return {
    dominant: sortedColors,
    variance,
    histogram,
    totalPixels: 300 * 300,
    sampledPixels,
    processingTime: performance.now() - startTime,
    colorDistribution,
    contrastRatio,
    saturationLevel
  };
}

/**
 * Calculate color variance across RGB values
 */
export function calculateColorVariance(rgbValues: number[][]): number {
  if (rgbValues.length === 0) return 0;

  const means = [0, 1, 2].map(i =>
    rgbValues.reduce((sum, rgb) => sum + rgb[i], 0) / rgbValues.length
  );

  const variance = rgbValues.reduce((sum, rgb) =>
    sum + [0, 1, 2].reduce((s, i) => s + Math.pow(rgb[i] - means[i], 2), 0), 0
  ) / rgbValues.length;

  return Math.sqrt(variance);
}

/**
 * Calculate contrast ratio between lightest and darkest colors
 */
export function calculateContrastRatio(rgbValues: number[][]): number {
  const brightnesses = rgbValues.map(rgb => (rgb[0] + rgb[1] + rgb[2]) / 3);
  const min = Math.min(...brightnesses);
  const max = Math.max(...brightnesses);
  return max > 0 ? (max - min) / max : 0;
}

/**
 * Calculate average saturation level
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
 * Parse RGB color string to [r, g, b] array
 */
export function parseRGB(color: string): [number, number, number] | null {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16)
    ];
  }

  const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
  return match ? [+match[1], +match[2], +match[3]] : null;
}

/**
 * Calculate similarity between two colors
 */
export function colorSimilarity(color1: string, color2: string): number {
  const rgb1 = parseRGB(color1);
  const rgb2 = parseRGB(color2);

  if (!rgb1 || !rgb2) return 0;

  const distance = Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );

  return 1 - (distance / 441.67); // Max RGB distance
}
