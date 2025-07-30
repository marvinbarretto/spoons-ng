// src/app/carpets/data-access/reference-image-analyzer.service.ts
import { Injectable, signal } from '@angular/core';
import type { ReferenceImageData } from './carpet-reference.types';

@Injectable({ providedIn: 'root' })
export class ReferenceImageAnalyzerService {
  private readonly _analyzedReferences = signal<ReferenceImageData[]>([]);
  private readonly _isAnalyzing = signal(false);

  readonly analyzedReferences = this._analyzedReferences.asReadonly();
  readonly isAnalyzing = this._isAnalyzing.asReadonly();

  constructor() {
    // Load existing references on startup
    this.loadFromLocalStorage();
  }

  /**
   * Analyze uploaded image file and create reference data
   */
  async analyzeImageFile(file: File, name: string): Promise<ReferenceImageData> {
    this._isAnalyzing.set(true);

    try {
      // Load image into canvas
      const canvas = await this.loadImageToCanvas(file);

      // Extract all features
      const referenceData = this.extractReferenceData(canvas, name);

      // Store reference
      const current = this._analyzedReferences();
      const updated = [...current, referenceData];
      this._analyzedReferences.set(updated);

      // Save to localStorage
      this.saveToLocalStorage(updated);

      console.log(`✅ Reference "${name}" analyzed and saved:`, referenceData);
      return referenceData;
    } finally {
      this._isAnalyzing.set(false);
    }
  }

  /**
   * Analyze image from URL (for your existing JPEG)
   */
  async analyzeImageFromUrl(imageUrl: string, name: string): Promise<ReferenceImageData> {
    this._isAnalyzing.set(true);

    try {
      const canvas = await this.loadUrlToCanvas(imageUrl);
      const referenceData = this.extractReferenceData(canvas, name);

      const current = this._analyzedReferences();
      const updated = [...current, referenceData];
      this._analyzedReferences.set(updated);

      // Save to localStorage
      this.saveToLocalStorage(updated);

      console.log(`✅ Reference "${name}" analyzed and saved:`, referenceData);
      return referenceData;
    } finally {
      this._isAnalyzing.set(false);
    }
  }

  /**
   * Generate TypeScript code for the reference
   */
  generateTypeScriptCode(reference: ReferenceImageData): string {
    return `
// Auto-generated reference data for ${reference.name}
export const ${this.toCamelCase(reference.name)}_REFERENCE = {
  id: '${reference.id}',
  name: '${reference.name}',
  colorProfile: {
    dominant: [${reference.colorProfile.dominant.map(c => `'${c}'`).join(', ')}],
    variance: ${reference.colorProfile.variance},
    brightness: ${reference.colorProfile.brightness},
    pattern: '${reference.colorProfile.pattern}'
  },
  textureProfile: {
    contrast: ${reference.textureProfile.contrast.toFixed(3)},
    edgeDensity: ${reference.textureProfile.edgeDensity.toFixed(1)},
    repetitionScore: ${reference.textureProfile.repetitionScore.toFixed(3)},
    patternType: '${reference.textureProfile.patternType}'
  },
  geometricFeatures: {
    hasSquares: ${reference.geometricFeatures.hasSquares},
    hasCircles: ${reference.geometricFeatures.hasCircles},
    hasOrnamental: ${reference.geometricFeatures.hasOrnamental},
    dominantShape: '${reference.geometricFeatures.dominantShape}',
    repetitionScore: ${reference.geometricFeatures.repetitionScore.toFixed(3)}
  }
};`;
  }

  /**
   * Export all references as JSON
   */
  exportReferencesAsJson(): string {
    return JSON.stringify(this._analyzedReferences(), null, 2);
  }

  /**
   * Clear all references
   */
  clearReferences(): void {
    this._analyzedReferences.set([]);
    this.saveToLocalStorage([]);
  }

  /**
   * Load references from localStorage on startup
   */
  loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('carpet-references');
      if (stored) {
        const references = JSON.parse(stored);
        this._analyzedReferences.set(references);
        console.log(`✅ Loaded ${references.length} references from localStorage`);
      }
    } catch (error) {
      console.warn('Could not load references from localStorage:', error);
    }
  }

  /**
   * Save references to localStorage
   */
  private saveToLocalStorage(references: ReferenceImageData[]): void {
    try {
      localStorage.setItem('carpet-references', JSON.stringify(references));
      console.log(`💾 Saved ${references.length} references to localStorage`);
    } catch (error) {
      console.warn('Could not save references to localStorage:', error);
    }
  }

  // Private methods for image loading and analysis

  private async loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Standard analysis size
        canvas.width = 400;
        canvas.height = 400;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private async loadUrlToCanvas(url: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // For CORS
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        canvas.width = 400;
        canvas.height = 400;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  private extractReferenceData(canvas: HTMLCanvasElement, name: string): ReferenceImageData {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return {
      id: this.generateId(name),
      name,
      colorProfile: this.extractColorProfile(imageData),
      textureProfile: this.extractTextureProfile(imageData),
      geometricFeatures: this.extractGeometricFeatures(imageData),
      rawImageData: canvas.toDataURL('image/jpeg', 0.8), // For debugging
    };
  }

  private extractColorProfile(imageData: ImageData): ReferenceImageData['colorProfile'] {
    const data = imageData.data;
    const colorCounts = new Map<string, number>();
    const brightnesses: number[] = [];

    // Sample pixels for analysis
    for (let i = 0; i < data.length; i += 16) {
      // Every 4th pixel
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Quantize colors
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;

      const colorKey = `rgb(${qr},${qg},${qb})`;
      colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);

      // Calculate brightness
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnesses.push(brightness);
    }

    // Get dominant colors
    const dominant = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);

    // Calculate variance
    const avgBrightness = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
    const variance =
      brightnesses.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) /
      brightnesses.length;

    // Detect pattern type
    const pattern = this.detectPatternType(imageData);

    return {
      dominant,
      variance: Math.round(variance),
      brightness: Math.round(avgBrightness),
      pattern,
    };
  }

  private extractTextureProfile(imageData: ImageData): ReferenceImageData['textureProfile'] {
    const gray = this.convertToGrayscale(imageData);
    const width = imageData.width;
    const height = imageData.height;

    const contrast = this.calculateContrast(gray, width, height);
    const edgeDensity = this.calculateEdgeDensity(gray, width, height);
    const repetitionScore = this.calculateRepetition(gray, width, height);
    const patternType = this.classifyPatternFromTexture(contrast, edgeDensity, repetitionScore);

    return {
      contrast,
      edgeDensity,
      repetitionScore,
      patternType,
    };
  }

  private extractGeometricFeatures(imageData: ImageData): ReferenceImageData['geometricFeatures'] {
    const gray = this.convertToGrayscale(imageData);
    const width = imageData.width;
    const height = imageData.height;

    const hasSquares = this.detectSquares(gray, width, height);
    const hasCircles = this.detectCircles(gray, width, height);
    const hasOrnamental = this.detectOrnamentalFeatures(gray, width, height);
    const repetitionScore = this.calculateRepetition(gray, width, height);

    let dominantShape = 'mixed';
    if (hasSquares) dominantShape = 'geometric';
    else if (hasCircles) dominantShape = 'circular';
    else if (hasOrnamental) dominantShape = 'ornamental';
    else if (repetitionScore < 0.3) dominantShape = 'plain';

    return {
      hasSquares,
      hasCircles,
      hasOrnamental,
      dominantShape,
      repetitionScore,
    };
  }

  // Utility methods (reusing your existing analysis logic)

  private convertToGrayscale(imageData: ImageData): Uint8Array {
    const data = imageData.data;
    const gray = new Uint8Array(imageData.width * imageData.height);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    return gray;
  }

  private calculateContrast(gray: Uint8Array, width: number, height: number): number {
    let totalContrast = 0;
    let samples = 0;

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const current = gray[y * width + x];
        const right = gray[y * width + x + 1];
        const down = gray[(y + 1) * width + x];

        totalContrast += Math.abs(current - right) + Math.abs(current - down);
        samples += 2;
      }
    }

    return samples > 0 ? totalContrast / (samples * 255) : 0;
  }

  private calculateEdgeDensity(gray: Uint8Array, width: number, height: number): number {
    let edges = 0;
    const threshold = 30;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const gx = gray[idx + 1] - gray[idx - 1];
        const gy = gray[idx + width] - gray[idx - width];
        const magnitude = Math.sqrt(gx * gx + gy * gy);

        if (magnitude > threshold) edges++;
      }
    }

    return (edges / ((width - 2) * (height - 2))) * 1000;
  }

  private calculateRepetition(gray: Uint8Array, width: number, height: number): number {
    // Simple autocorrelation for repetition
    let correlations = 0;
    let samples = 0;

    for (let y = 0; y < height; y += 8) {
      for (let x = 0; x < width - 16; x += 8) {
        const idx1 = y * width + x;
        const idx2 = y * width + x + 16;

        const diff = Math.abs(gray[idx1] - gray[idx2]);
        correlations += Math.max(0, 1 - diff / 255);
        samples++;
      }
    }

    return samples > 0 ? correlations / samples : 0;
  }

  private detectSquares(gray: Uint8Array, width: number, height: number): boolean {
    // Look for square-like patterns
    let horizontalEdges = 0;
    let verticalEdges = 0;
    const threshold = 25;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const horizontal = Math.abs(gray[idx - width] - gray[idx + width]);
        const vertical = Math.abs(gray[idx - 1] - gray[idx + 1]);

        if (horizontal > threshold) horizontalEdges++;
        if (vertical > threshold) verticalEdges++;
      }
    }

    const totalPixels = (width - 2) * (height - 2);
    const hRatio = horizontalEdges / totalPixels;
    const vRatio = verticalEdges / totalPixels;

    return hRatio > 0.05 && vRatio > 0.05 && Math.abs(hRatio - vRatio) < 0.02;
  }

  private detectCircles(gray: Uint8Array, width: number, height: number): boolean {
    // Simplified circle detection - look for curved edges
    let curveScore = 0;
    const samples = 100;

    for (let i = 0; i < samples; i++) {
      const x = Math.floor(Math.random() * (width - 4)) + 2;
      const y = Math.floor(Math.random() * (height - 4)) + 2;

      const center = gray[y * width + x];
      const surrounding = [
        gray[(y - 1) * width + x],
        gray[(y + 1) * width + x],
        gray[y * width + (x - 1)],
        gray[y * width + (x + 1)],
      ];

      const avgSurrounding = surrounding.reduce((a, b) => a + b, 0) / 4;
      if (Math.abs(center - avgSurrounding) > 30) curveScore++;
    }

    return curveScore / samples > 0.3;
  }

  private detectOrnamentalFeatures(gray: Uint8Array, width: number, height: number): boolean {
    // Look for irregular, non-geometric patterns
    const entropy = this.calculateEntropy(gray);
    const regularity = this.calculateRegularity(gray, width, height);

    return entropy > 4 && regularity < 0.5;
  }

  private calculateEntropy(gray: Uint8Array): number {
    const histogram = new Array(256).fill(0);
    gray.forEach(value => histogram[value]++);

    const total = gray.length;
    let entropy = 0;

    histogram.forEach(count => {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    });

    return entropy;
  }

  private calculateRegularity(gray: Uint8Array, width: number, height: number): number {
    // Measure how regular/predictable the pattern is
    let regularity = 0;
    let samples = 0;

    for (let y = 0; y < height - 8; y += 4) {
      for (let x = 0; x < width - 8; x += 4) {
        const block1 = this.getBlock(gray, x, y, 4, width);
        const block2 = this.getBlock(gray, x + 4, y, 4, width);

        regularity += this.blockSimilarity(block1, block2);
        samples++;
      }
    }

    return samples > 0 ? regularity / samples : 0;
  }

  private getBlock(
    gray: Uint8Array,
    startX: number,
    startY: number,
    size: number,
    width: number
  ): number[] {
    const block: number[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        block.push(gray[(startY + y) * width + (startX + x)]);
      }
    }
    return block;
  }

  private blockSimilarity(block1: number[], block2: number[]): number {
    let diff = 0;
    for (let i = 0; i < block1.length; i++) {
      diff += Math.abs(block1[i] - block2[i]);
    }
    const maxDiff = block1.length * 255;
    return 1 - diff / maxDiff;
  }

  private detectPatternType(imageData: ImageData): 'geometric' | 'ornamental' | 'plain' | 'mixed' {
    const gray = this.convertToGrayscale(imageData);
    const width = imageData.width;
    const height = imageData.height;

    const edgeDensity = this.calculateEdgeDensity(gray, width, height);
    const contrast = this.calculateContrast(gray, width, height);
    const repetition = this.calculateRepetition(gray, width, height);

    return this.classifyPatternFromTexture(contrast, edgeDensity, repetition);
  }

  private classifyPatternFromTexture(
    contrast: number,
    edgeDensity: number,
    repetition: number
  ): 'geometric' | 'ornamental' | 'plain' | 'mixed' {
    if (edgeDensity > 25 && repetition > 0.6) return 'geometric';
    if (contrast > 0.4 && edgeDensity > 15) return 'ornamental';
    if (edgeDensity < 10 && contrast < 0.3) return 'plain';
    return 'mixed';
  }

  private generateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
  }

  private toCamelCase(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  }
}
