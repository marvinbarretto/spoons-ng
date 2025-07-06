import { Injectable, signal } from '@angular/core';

export type SimpleMetrics = {
  // Basic image properties
  brightness: number;           // 0-255 average brightness
  contrast: number;            // 0-100 contrast level
  sharpness: number;           // 0-100 sharpness level
  
  // Color analysis
  dominantColors: string[];    // Top 3 hex colors
  colorVariance: number;       // How diverse the colors are
  saturation: number;          // 0-100 color saturation
  
  // Pattern analysis  
  edgeDensity: number;         // 0-100 edge detection
  textureComplexity: number;   // 0-100 how textured it is
  repetition: number;          // 0-100 pattern repetition
  
  // Motion detection
  motionLevel: number;         // 0-100 how much the image changed from last frame
  isStable: boolean;           // True if motion is low enough for clear photo
  
  // Technical
  analysisTime: number;        // How long analysis took (ms)
  frameSize: string;           // Resolution analyzed
  timestamp: number;           // When this analysis was done
};

@Injectable({ providedIn: 'root' })
export class SimpleMetricsService {
  
  private readonly _metrics = signal<SimpleMetrics | null>(null);
  private readonly _isAnalyzing = signal(false);
  
  // Motion detection state
  private previousFrameData: ImageData | null = null;
  private motionHistory: number[] = []; // Track recent motion levels
  private readonly MOTION_HISTORY_SIZE = 5; // Increased back to 5 for better stability detection
  
  // Memory management
  private analysisCount = 0;
  private readonly MAX_ANALYSIS_COUNT = 1000; // Clear state after 1000 analyses to prevent memory buildup
  
  // Reusable canvas to prevent memory leaks
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  readonly metrics = this._metrics.asReadonly();
  readonly isAnalyzing = this._isAnalyzing.asReadonly();

  clearState(): void {
    console.log('[SimpleMetrics] 🧹 Clearing accumulated state');
    
    // Clear previous frame data to prevent memory accumulation
    this.previousFrameData = null;
    
    // Clear motion history
    this.motionHistory = [];
    
    // Reset analysis count
    this.analysisCount = 0;
    
    // Reset metrics signal
    this._metrics.set(null);
    this._isAnalyzing.set(false);
    
    // Clear canvas resources
    if (this.canvas) {
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.canvas = null;
      this.ctx = null;
    }
    
    console.log('[SimpleMetrics] 🧹 State cleared - memory should be freed');
  }
  
  async analyzeVideoFrame(videoElement: HTMLVideoElement): Promise<SimpleMetrics> {
    this._isAnalyzing.set(true);
    const startTime = performance.now();
    
    // Increment analysis count and check for memory management
    this.analysisCount++;
    if (this.analysisCount > this.MAX_ANALYSIS_COUNT) {
      console.log('[SimpleMetrics] 🧹 Reached max analysis count, clearing state for memory management');
      this.clearState();
    }
    
    console.log('📊 [SimpleMetrics] Running analysis...', this.analysisCount);
    
    try {
      // Initialize canvas once and reuse it
      if (!this.canvas || !this.ctx) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        if (!this.ctx) {
          throw new Error('Failed to get canvas context');
        }
      }
      
      const canvas = this.canvas;
      const ctx = this.ctx;
      
      // ANALYSIS: 320x240 was TOO LOW - losing critical carpet detail
      // Ornate carpet (7/100 sharpness) vs plain (1-4/100) barely any difference
      // Carpet patterns need higher resolution for proper edge/texture detection
      canvas.width = 640;  // Doubled resolution for better pattern analysis
      canvas.height = 480;
      
      // Validate video element before drawing
      if (videoElement.readyState < 2 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        console.log('[SimpleMetrics] Video not ready for analysis:', {
          readyState: videoElement.readyState,
          dimensions: `${videoElement.videoWidth}x${videoElement.videoHeight}`
        });
        throw new Error('Video element not ready for analysis');
      }
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Calculate motion detection
      const motionData = this.calculateMotion(imageData);
      
      const metrics: SimpleMetrics = {
        brightness: this.calculateBrightness(imageData),
        contrast: this.calculateContrast(imageData),
        sharpness: this.calculateSharpness(imageData),
        dominantColors: this.extractDominantColors(imageData),
        colorVariance: this.calculateColorVariance(imageData),
        saturation: this.calculateSaturation(imageData),
        edgeDensity: this.calculateEdgeDensity(imageData),
        textureComplexity: this.calculateTextureComplexity(imageData),
        repetition: this.calculateRepetition(imageData),
        motionLevel: motionData.motionLevel,
        isStable: motionData.isStable,
        analysisTime: performance.now() - startTime,
        frameSize: `${canvas.width}x${canvas.height}`,
        timestamp: Date.now()
      };
      
      // Store this frame for next motion comparison
      this.previousFrameData = imageData;
      
      console.log('📊 [SimpleMetrics] Analysis complete:', {
        sharpness: metrics.sharpness,
        contrast: metrics.contrast,
        edgeDensity: metrics.edgeDensity,
        analysisTime: metrics.analysisTime
      });
      
      this._metrics.set(metrics);
      return metrics;
      
    } finally {
      this._isAnalyzing.set(false);
    }
  }
  
  private calculateBrightness(imageData: ImageData): number {
    const data = imageData.data;
    let total = 0;
    let count = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      total += brightness;
      count++;
    }
    
    return Math.round(total / count);
  }
  
  private calculateContrast(imageData: ImageData): number {
    const data = imageData.data;
    
    // ANALYSIS: Previous code used Math.min(...brightnesses) with 300k+ elements = stack overflow!
    // Calculate min/max on-the-fly instead of storing all brightness values
    let min = 255;
    let max = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      min = Math.min(min, brightness);
      max = Math.max(max, brightness);
    }
    
    return Math.round(((max - min) / 255) * 100);
  }
  
  private calculateSharpness(imageData: ImageData): number {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // ANALYSIS: Previous Laplacian method gave ornate carpet 7/100 vs plain 1-4/100
    // Barely any difference! Need more sensitive edge detection for carpet patterns
    // Trying enhanced Sobel gradient magnitude for better carpet texture detection
    
    let totalGradient = 0;
    let count = 0;
    
    // Enhanced Sobel edge detection for better carpet pattern recognition
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Convert 3x3 neighborhood to grayscale
        const pixels = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            pixels.push(gray);
          }
        }
        
        // Sobel X and Y gradients
        const gx = (-1 * pixels[0]) + (1 * pixels[2]) +
                   (-2 * pixels[3]) + (2 * pixels[5]) +
                   (-1 * pixels[6]) + (1 * pixels[8]);
        
        const gy = (-1 * pixels[0]) + (-2 * pixels[1]) + (-1 * pixels[2]) +
                   (1 * pixels[6]) + (2 * pixels[7]) + (1 * pixels[8]);
        
        // Gradient magnitude - should be much higher for carpet patterns
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        totalGradient += magnitude;
        count++;
      }
    }
    
    const avgGradient = totalGradient / count;
    // Scale to 0-100, carpet patterns should score 30-80 vs plain surfaces 5-15
    return Math.min(100, Math.round(avgGradient / 3));
  }
  
  private extractDominantColors(imageData: ImageData): string[] {
    const data = imageData.data;
    const colorCounts = new Map<string, number>();
    
    // Sample every 8th pixel for performance
    for (let i = 0; i < data.length; i += 32) {
      const r = Math.round(data[i] / 32) * 32;      // Quantize to reduce noise
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }
    
    return Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => color);
  }
  
  private calculateColorVariance(imageData: ImageData): number {
    const data = imageData.data;
    const colors: number[][] = [];
    
    for (let i = 0; i < data.length; i += 16) {
      colors.push([data[i], data[i + 1], data[i + 2]]);
    }
    
    // Calculate variance for each channel
    const channels = [0, 1, 2].map(channel => {
      const values = colors.map(color => color[channel]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      return variance;
    });
    
    return Math.round(channels.reduce((a, b) => a + b, 0) / 3);
  }
  
  private calculateSaturation(imageData: ImageData): number {
    const data = imageData.data;
    let totalSaturation = 0;
    let count = 0;
    
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      
      totalSaturation += saturation;
      count++;
    }
    
    return Math.round((totalSaturation / count) * 100);
  }
  
  private calculateEdgeDensity(imageData: ImageData): number {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let edges = 0;
    let total = 0;
    
    // Sobel edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        
        const gx = -data[((y-1) * width + (x-1)) * 4] + data[((y-1) * width + (x+1)) * 4] +
                   -2 * data[(y * width + (x-1)) * 4] + 2 * data[(y * width + (x+1)) * 4] +
                   -data[((y+1) * width + (x-1)) * 4] + data[((y+1) * width + (x+1)) * 4];
        
        const gy = -data[((y-1) * width + (x-1)) * 4] - 2 * data[((y-1) * width + x) * 4] - data[((y-1) * width + (x+1)) * 4] +
                   data[((y+1) * width + (x-1)) * 4] + 2 * data[((y+1) * width + x) * 4] + data[((y+1) * width + (x+1)) * 4];
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        if (magnitude > 50) edges++;
        total++;
      }
    }
    
    return Math.round((edges / total) * 100);
  }
  
  private calculateTextureComplexity(imageData: ImageData): number {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let complexity = 0;
    let samples = 0;
    
    // ANALYSIS: Previous 5x5 windows gave ornate carpet only 15% vs plain 3-6%
    // Should be 60-80% for complex patterns! Need larger windows at higher resolution
    // Scaling window size with resolution: 640x480 needs 9x9 windows minimum
    
    const windowSize = 9; // Larger windows for better texture analysis at 640x480
    const half = Math.floor(windowSize / 2);
    
    for (let y = half; y < height - half; y += 4) { // Less overlap for performance
      for (let x = half; x < width - half; x += 4) {
        const window: number[] = [];
        
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            window.push(brightness);
          }
        }
        
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
        
        complexity += Math.sqrt(variance);
        samples++;
      }
    }
    
    // Higher scaling factor - carpet patterns should hit 60-80% range
    return Math.min(100, Math.round((complexity / samples) / 1));
  }
  
  private calculateRepetition(imageData: ImageData): number {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let correlations = 0;
    let samples = 0;
    
    // ANALYSIS: Previous algorithm was BACKWARDS! Plain surfaces scoring 92-93% vs patterns 81%
    // It was detecting compression noise/artifacts as "repetition"
    // Need to look for actual pattern repetition, not pixel similarity
    
    // Look for pattern repetition at carpet-relevant scales (higher resolution = larger offsets)
    const offsets = [16, 32, 48, 64]; // Doubled for 640x480 resolution
    let patternScore = 0;
    
    for (const offset of offsets) {
      let offsetCorrelation = 0;
      let offsetSamples = 0;
      
      for (let y = 0; y < height; y += 8) { // Sample every 8th row
        for (let x = 0; x < width - offset; x += 8) { // Sample every 8th column
          const idx1 = (y * width + x) * 4;
          const idx2 = (y * width + x + offset) * 4;
          
          const bright1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
          const bright2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];
          
          // Only count as repetition if there's a significant pattern match
          const difference = Math.abs(bright1 - bright2);
          if (difference < 30) { // Must be quite similar to count as pattern
            offsetCorrelation += (1 - difference / 30);
          }
          offsetSamples++;
        }
      }
      
      if (offsetSamples > 0) {
        patternScore += offsetCorrelation / offsetSamples;
      }
    }
    
    // Average across all offsets - carpet patterns should score higher than noise
    return Math.round((patternScore / offsets.length) * 100);
  }
  
  private calculateMotion(currentFrame: ImageData): { motionLevel: number; isStable: boolean } {
    if (!this.previousFrameData) {
      // First frame - assume stable
      return { motionLevel: 0, isStable: true };
    }
    
    const current = currentFrame.data;
    const previous = this.previousFrameData.data;
    
    if (current.length !== previous.length) {
      // Frame size changed - reset
      return { motionLevel: 0, isStable: true };
    }
    
    let totalDifference = 0;
    let sampleCount = 0;
    
    // Sample every 16th pixel for performance (64x64 grid at 640x480)
    // FIXED: Properly sample every 16th pixel (16 pixels × 4 bytes = 64 bytes)
    for (let i = 0; i < current.length; i += 64) {
      // Ensure we don't go out of bounds
      if (i + 2 >= current.length) break;
      
      const currentBrightness = 0.299 * current[i] + 0.587 * current[i + 1] + 0.114 * current[i + 2];
      const previousBrightness = 0.299 * previous[i] + 0.587 * previous[i + 1] + 0.114 * previous[i + 2];
      
      totalDifference += Math.abs(currentBrightness - previousBrightness);
      sampleCount++;
    }
    
    const avgDifference = totalDifference / sampleCount;
    // FIXED: Increased sensitivity to properly detect walking motion
    const motionLevel = Math.min(100, Math.round(avgDifference / 1.5)); // Much more sensitive
    
    // Track motion history for stability detection
    this.motionHistory.push(motionLevel);
    if (this.motionHistory.length > this.MOTION_HISTORY_SIZE) {
      this.motionHistory.shift();
    }
    
    // Consider stable if recent motion is consistently low
    const recentAvgMotion = this.motionHistory.reduce((a, b) => a + b, 0) / this.motionHistory.length;
    // FIXED: Much stricter threshold - walking should NOT be considered stable
    const isStable = recentAvgMotion < 8 && this.motionHistory.length >= 3; // Stricter threshold and more frames
    
    console.log('[SimpleMetrics] Motion Debug:', {
      rawAvgDifference: Math.round(avgDifference * 100) / 100,
      motionLevel,
      motionHistory: [...this.motionHistory],
      recentAvgMotion: Math.round(recentAvgMotion * 100) / 100,
      isStable,
      historyLength: this.motionHistory.length,
      sampleCount,
      // Enhanced debugging for motion detection issues
      stabilityThreshold: 8,
      motionAboveThreshold: recentAvgMotion >= 8,
      frameDataSize: current.length,
      samplingInterval: 64
    });
    
    return { motionLevel, isStable };
  }
}