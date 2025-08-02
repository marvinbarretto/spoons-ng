/**
 * @fileoverview Image Format Detection Service
 * 
 * Detects browser support for modern image formats (AVIF, WebP, JPEG) with caching.
 * Provides format selection strategy and optimal quality settings.
 */

import { Injectable, inject } from '@angular/core';
import { DebugService } from './debug.service';

export type ImageFormat = 'avif' | 'webp' | 'jpeg';

export interface FormatSupport {
  avif: boolean;
  webp: boolean;
  jpeg: boolean;
}

export interface FormatConfig {
  format: ImageFormat;
  mimeType: string;
  quality: number;
}

@Injectable({ providedIn: 'root' })
export class ImageFormatDetectionService {
  private readonly debug = inject(DebugService);
  
  private supportCache: FormatSupport | null = null;
  private detectionPromise: Promise<FormatSupport> | null = null;

  /**
   * Get supported formats with caching
   */
  async getSupportedFormats(): Promise<FormatSupport> {
    // Return cached result if available
    if (this.supportCache) {
      return this.supportCache;
    }

    // Return existing detection promise if in progress
    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    // Start detection process
    this.detectionPromise = this.detectFormats();
    this.supportCache = await this.detectionPromise;
    
    return this.supportCache;
  }

  /**
   * Get best available format configuration
   */
  async getBestFormat(): Promise<FormatConfig> {
    const support = await this.getSupportedFormats();
    
    this.debug.extreme('[ImageFormat] Selecting best format from:', support);

    // Priority: AVIF > WebP > JPEG
    if (support.avif) {
      this.debug.standard('[ImageFormat] Selected AVIF (best compression)');
      return { format: 'avif', mimeType: 'image/avif', quality: 0.95 };
    }

    if (support.webp) {
      this.debug.standard('[ImageFormat] Selected WebP (good compression)');
      return { format: 'webp', mimeType: 'image/webp', quality: 0.95 };
    }

    this.debug.standard('[ImageFormat] Selected JPEG (universal fallback)');
    return { format: 'jpeg', mimeType: 'image/jpeg', quality: 0.95 };
  }

  /**
   * Check if a specific format is supported
   */
  async isFormatSupported(format: ImageFormat): Promise<boolean> {
    const support = await this.getSupportedFormats();
    return support[format];
  }

  /**
   * Clear cache and re-detect formats
   */
  async refreshDetection(): Promise<FormatSupport> {
    this.debug.standard('[ImageFormat] Refreshing format detection...');
    this.supportCache = null;
    this.detectionPromise = null;
    return this.getSupportedFormats();
  }

  /**
   * Detect which image formats are supported by the browser
   */
  private async detectFormats(): Promise<FormatSupport> {
    this.debug.standard('[ImageFormat] Starting browser format detection...');

    const support: FormatSupport = {
      avif: false,
      webp: false,
      jpeg: true // Always supported
    };

    // Test AVIF support
    try {
      support.avif = await this.testFormat('image/avif', '#FF0000');
      this.debug.extreme('[ImageFormat] AVIF support:', support.avif);
    } catch (error) {
      this.debug.extreme('[ImageFormat] AVIF test failed:', error);
    }

    // Test WebP support
    try {
      support.webp = await this.testFormat('image/webp', '#00FF00');
      this.debug.extreme('[ImageFormat] WebP support:', support.webp);
    } catch (error) {
      this.debug.extreme('[ImageFormat] WebP test failed:', error);
    }

    this.debug.standard('[ImageFormat] Detection complete', {
      avif: support.avif,
      webp: support.webp,
      jpeg: support.jpeg,
      bestFormat: support.avif ? 'AVIF' : support.webp ? 'WebP' : 'JPEG'
    });

    return support;
  }

  /**
   * Test if a specific image format is supported
   */
  private async testFormat(mimeType: string, testColor: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      // Create test canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 10;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(false);
        return;
      }

      // Draw test pattern
      ctx.fillStyle = testColor;
      ctx.fillRect(0, 0, 10, 10);

      // Test conversion to target format
      canvas.toBlob(
        blob => {
          if (blob && blob.type === mimeType && blob.size > 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        mimeType,
        0.8
      );
    });
  }

  /**
   * Get format statistics for debugging
   */
  async getFormatStats(): Promise<{
    support: FormatSupport;
    bestFormat: FormatConfig;
    detectionTime?: number;
  }> {
    const startTime = performance.now();
    const support = await this.getSupportedFormats();
    const bestFormat = await this.getBestFormat();
    const detectionTime = performance.now() - startTime;

    return {
      support,
      bestFormat,
      detectionTime: this.supportCache ? 0 : detectionTime // 0 if cached
    };
  }
}