// src/app/check-in/data-access/texture-analysis.ts
import type { PracticalTextureFeatures } from './carpet.types';

/**
 * Analyze texture patterns from video frame
 */
export function analyzeTexture(videoElement: HTMLVideoElement): PracticalTextureFeatures {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // ✅ Smaller canvas for texture analysis
  canvas.width = 200;
  canvas.height = 200;
  ctx.drawImage(videoElement, 0, 0, 200, 200);

  const imageData = ctx.getImageData(0, 0, 200, 200);
  const data = imageData.data;

  // ✅ Convert to grayscale
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const brightness = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray.push(brightness);
  }

  // ✅ Calculate texture features
  const contrast = calculateContrast(gray, 200);
  const edgeDensity = calculateEdgeDensity(gray, 200);
  const repetitionScore = calculateRepetition(gray, 200);
  const colorComplexity = calculateColorComplexity(data);
  const patternType = detectPatternType(gray, 200, edgeDensity, repetitionScore);

  return {
    contrast,
    edgeDensity,
    repetitionScore,
    colorComplexity,
    patternType
  };
}

/**
 * Calculate contrast using neighboring pixel differences
 */
export function calculateContrast(gray: number[], width: number): number {
  let contrast = 0;
  let count = 0;

  for (let i = 0; i < gray.length - width - 1; i++) {
    if (i % width === width - 1) continue; // Skip row ends

    const current = gray[i];
    const right = gray[i + 1];
    const down = gray[i + width];

    contrast += Math.abs(current - right) + Math.abs(current - down);
    count += 2;
  }

  return count > 0 ? contrast / (count * 255) : 0;
}

/**
 * Calculate edge density by finding sharp transitions
 */
export function calculateEdgeDensity(gray: number[], width: number): number {
  const threshold = 30;
  let edges = 0;

  for (let i = width; i < gray.length - width; i++) {
    if (i % width === 0 || i % width === width - 1) continue;

    const current = gray[i];
    const neighbors = [
      gray[i - 1], gray[i + 1],           // horizontal
      gray[i - width], gray[i + width]     // vertical
    ];

    const maxDiff = Math.max(...neighbors.map(n => Math.abs(current - n)));
    if (maxDiff > threshold) edges++;
  }

  return (edges / gray.length) * 100;
}

/**
 * Calculate repetition score by comparing blocks
 */
export function calculateRepetition(gray: number[], width: number): number {
  const blockSize = 16; // Small blocks for pattern detection
  const blocks: number[] = [];

  // ✅ Extract blocks
  for (let y = 0; y < width - blockSize; y += blockSize) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      let blockSum = 0;
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          blockSum += gray[(y + by) * width + (x + bx)];
        }
      }
      blocks.push(blockSum / (blockSize * blockSize));
    }
  }

  if (blocks.length < 2) return 0;

  // ✅ Find similar blocks
  let similarPairs = 0;
  let totalPairs = 0;

  for (let i = 0; i < blocks.length - 1; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const diff = Math.abs(blocks[i] - blocks[j]);
      if (diff < 20) similarPairs++; // Threshold for similarity
      totalPairs++;
    }
  }

  return totalPairs > 0 ? similarPairs / totalPairs : 0;
}

/**
 * Calculate color complexity from image data
 */
export function calculateColorComplexity(data: Uint8ClampedArray): number {
  const uniqueColors = new Set<string>();

  for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
    const r = Math.floor(data[i] / 64) * 64;
    const g = Math.floor(data[i + 1] / 64) * 64;
    const b = Math.floor(data[i + 2] / 64) * 64;
    uniqueColors.add(`${r},${g},${b}`);
  }

  return Math.min(uniqueColors.size / 20, 1); // Normalize to 0-1
}

/**
 * Detect pattern type based on texture metrics
 */
export function detectPatternType(
  gray: number[],
  width: number,
  edgeDensity: number,
  repetition: number
): 'geometric' | 'ornamental' | 'plain' | 'mixed' {
  // ✅ Plain: low edges, high repetition
  if (edgeDensity < 8 && repetition > 0.7) return 'plain';

  // ✅ Geometric: high repetition, structured edges
  if (repetition > 0.6 && edgeDensity > 15) return 'geometric';

  // ✅ Ornamental: medium edges, lower repetition (varied patterns)
  if (edgeDensity > 12 && repetition < 0.5) return 'ornamental';

  return 'mixed';
}
