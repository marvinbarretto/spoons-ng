/**
 * Advanced texture analysis utilities extracted from legacy texture-analysis.ts
 * Provides sophisticated pattern detection and texture analysis
 */

export type TextureFeatures = {
  contrast: number; // 0-100 contrast level
  edgeDensity: number; // 0-100 edge density percentage
  repetitionScore: number; // 0-100 pattern repetition score
  colorComplexity: number; // 0-100 color variation
  patternType: 'geometric' | 'ornamental' | 'plain' | 'mixed';
  processingTime: number;
};

/**
 * Analyze texture patterns from video frame using advanced algorithms
 */
export function analyzeAdvancedTexture(videoElement: HTMLVideoElement): TextureFeatures {
  const startTime = performance.now();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Use 200x200 canvas for texture analysis (good balance of detail vs performance)
  canvas.width = 200;
  canvas.height = 200;
  ctx.drawImage(videoElement, 0, 0, 200, 200);

  const imageData = ctx.getImageData(0, 0, 200, 200);
  const data = imageData.data;

  // Convert to grayscale for texture analysis
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const brightness = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray.push(brightness);
  }

  // Calculate texture features
  const contrast = calculateAdvancedContrast(gray, 200);
  const edgeDensity = calculateAdvancedEdgeDensity(gray, 200);
  const repetitionScore = calculateAdvancedRepetition(gray, 200);
  const colorComplexity = calculateColorComplexity(data);
  const patternType = classifyPatternType(contrast, edgeDensity, repetitionScore, colorComplexity);

  return {
    contrast,
    edgeDensity,
    repetitionScore,
    colorComplexity,
    patternType,
    processingTime: performance.now() - startTime,
  };
}

/**
 * Calculate advanced contrast using local variance method
 */
function calculateAdvancedContrast(gray: number[], width: number): number {
  let totalVariance = 0;
  let samples = 0;

  // Use 5x5 windows for local contrast calculation
  for (let y = 2; y < width - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      const window: number[] = [];

      // Extract 5x5 window
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const idx = (y + dy) * width + (x + dx);
          window.push(gray[idx]);
        }
      }

      // Calculate local variance
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const variance =
        window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;

      totalVariance += Math.sqrt(variance);
      samples++;
    }
  }

  // Scale to 0-100 range
  const avgVariance = totalVariance / samples;
  return Math.min(100, Math.round(avgVariance / 2));
}

/**
 * Calculate advanced edge density using Sobel operator
 */
function calculateAdvancedEdgeDensity(gray: number[], width: number): number {
  let edgeCount = 0;
  let totalPixels = 0;

  // Sobel edge detection
  for (let y = 1; y < width - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Sobel X kernel
      const gx =
        -gray[(y - 1) * width + (x - 1)] +
        gray[(y - 1) * width + (x + 1)] +
        -2 * gray[y * width + (x - 1)] +
        2 * gray[y * width + (x + 1)] +
        -gray[(y + 1) * width + (x - 1)] +
        gray[(y + 1) * width + (x + 1)];

      // Sobel Y kernel
      const gy =
        -gray[(y - 1) * width + (x - 1)] -
        2 * gray[(y - 1) * width + x] -
        gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] +
        2 * gray[(y + 1) * width + x] +
        gray[(y + 1) * width + (x + 1)];

      // Calculate gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);

      // Count as edge if magnitude exceeds threshold
      if (magnitude > 30) {
        edgeCount++;
      }
      totalPixels++;
    }
  }

  return Math.round((edgeCount / totalPixels) * 100);
}

/**
 * Calculate pattern repetition using autocorrelation
 */
function calculateAdvancedRepetition(gray: number[], width: number): number {
  const offsets = [8, 16, 24, 32]; // Test different pattern scales
  let totalCorrelation = 0;
  let samples = 0;

  for (const offset of offsets) {
    let correlation = 0;
    let count = 0;

    // Test horizontal repetition
    for (let y = 0; y < width; y += 4) {
      for (let x = 0; x < width - offset; x += 4) {
        const val1 = gray[y * width + x];
        const val2 = gray[y * width + x + offset];

        // Calculate normalized correlation
        const similarity = 1 - Math.abs(val1 - val2) / 255;
        correlation += similarity;
        count++;
      }
    }

    if (count > 0) {
      totalCorrelation += correlation / count;
      samples++;
    }
  }

  return samples > 0 ? Math.round((totalCorrelation / samples) * 100) : 0;
}

/**
 * Calculate color complexity from RGBA data
 */
function calculateColorComplexity(data: Uint8ClampedArray): number {
  const colorMap = new Map<string, number>();

  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = Math.floor(data[i] / 32) * 32; // Quantize to reduce noise
    const g = Math.floor(data[i + 1] / 32) * 32;
    const b = Math.floor(data[i + 2] / 32) * 32;

    const colorKey = `${r},${g},${b}`;
    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
  }

  // More unique colors = higher complexity
  const uniqueColors = colorMap.size;
  const maxPossibleColors = 8 * 8 * 8; // 32-level quantization = 8 levels per channel

  return Math.min(100, Math.round((uniqueColors / maxPossibleColors) * 100));
}

/**
 * Classify pattern type based on texture features
 */
function classifyPatternType(
  contrast: number,
  edgeDensity: number,
  repetitionScore: number,
  colorComplexity: number
): 'geometric' | 'ornamental' | 'plain' | 'mixed' {
  // Geometric patterns: high contrast, high edges, high repetition
  if (contrast > 60 && edgeDensity > 40 && repetitionScore > 50) {
    return 'geometric';
  }

  // Ornamental patterns: medium-high complexity, medium repetition
  if (colorComplexity > 40 && repetitionScore > 30 && edgeDensity > 25) {
    return 'ornamental';
  }

  // Plain patterns: low contrast, low edges, low complexity
  if (contrast < 30 && edgeDensity < 20 && colorComplexity < 25) {
    return 'plain';
  }

  // Mixed patterns: everything else
  return 'mixed';
}

/**
 * Calculate texture roughness using local standard deviation
 */
export function calculateTextureRoughness(gray: number[], width: number): number {
  let totalStdDev = 0;
  let samples = 0;

  // Use 7x7 windows for roughness calculation
  for (let y = 3; y < width - 3; y += 3) {
    for (let x = 3; x < width - 3; x += 3) {
      const window: number[] = [];

      // Extract 7x7 window
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const idx = (y + dy) * width + (x + dx);
          window.push(gray[idx]);
        }
      }

      // Calculate standard deviation
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const variance =
        window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
      const stdDev = Math.sqrt(variance);

      totalStdDev += stdDev;
      samples++;
    }
  }

  const avgStdDev = totalStdDev / samples;
  return Math.min(100, Math.round(avgStdDev / 2));
}
