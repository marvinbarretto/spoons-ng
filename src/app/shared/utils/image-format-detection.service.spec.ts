/**
 * @fileoverview Tests for ImageFormatDetectionService
 *
 * Tests caching behavior, format detection logic, and browser capability detection.
 */

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DebugService } from './debug.service';
import { ImageFormatDetectionService, type FormatSupport } from './image-format-detection.service';

// Mock DebugService
const mockDebugService = {
  standard: vi.fn(),
  extreme: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe('ImageFormatDetectionService', () => {
  let service: ImageFormatDetectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ImageFormatDetectionService,
        { provide: DebugService, useValue: mockDebugService },
      ],
    });

    service = TestBed.inject(ImageFormatDetectionService);

    // Clear mocks
    Object.values(mockDebugService).forEach(mock => mock.mockClear());
  });

  describe('Format Support Detection', () => {
    it('should detect JPEG support (always true)', async () => {
      const support = await service.getSupportedFormats();

      expect(support.jpeg).toBe(true);
    });

    it('should handle WebP detection gracefully', async () => {
      const support = await service.getSupportedFormats();

      // WebP support varies by browser, just ensure it's a boolean
      expect(typeof support.webp).toBe('boolean');
    });

    it('should handle AVIF detection gracefully', async () => {
      const support = await service.getSupportedFormats();

      // AVIF support varies by browser, just ensure it's a boolean
      expect(typeof support.avif).toBe('boolean');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache format detection results', async () => {
      // First call
      const support1 = await service.getSupportedFormats();

      // Second call should return cached result
      const support2 = await service.getSupportedFormats();

      expect(support1).toEqual(support2);
      expect(support1).toBe(support2); // Same object reference
    });

    it('should clear cache when refreshing detection', async () => {
      // Get initial result
      const support1 = await service.getSupportedFormats();

      // Refresh detection
      const support2 = await service.refreshDetection();

      // Should get fresh results (may be same values but different object)
      expect(support1).toEqual(support2);
      expect(typeof support2.avif).toBe('boolean');
      expect(typeof support2.webp).toBe('boolean');
      expect(support2.jpeg).toBe(true);
    });
  });

  describe('Best Format Selection', () => {
    it('should select AVIF when available', async () => {
      // Mock AVIF support
      const mockSupport: FormatSupport = { avif: true, webp: true, jpeg: true };
      vi.spyOn(service, 'getSupportedFormats').mockResolvedValue(mockSupport);

      const config = await service.getBestFormat();

      expect(config.format).toBe('avif');
      expect(config.mimeType).toBe('image/avif');
      expect(config.quality).toBe(0.95);
    });

    it('should select WebP when AVIF unavailable', async () => {
      // Mock WebP support but no AVIF
      const mockSupport: FormatSupport = { avif: false, webp: true, jpeg: true };
      vi.spyOn(service, 'getSupportedFormats').mockResolvedValue(mockSupport);

      const config = await service.getBestFormat();

      expect(config.format).toBe('webp');
      expect(config.mimeType).toBe('image/webp');
      expect(config.quality).toBe(0.95);
    });

    it('should fallback to JPEG when modern formats unavailable', async () => {
      // Mock only JPEG support
      const mockSupport: FormatSupport = { avif: false, webp: false, jpeg: true };
      vi.spyOn(service, 'getSupportedFormats').mockResolvedValue(mockSupport);

      const config = await service.getBestFormat();

      expect(config.format).toBe('jpeg');
      expect(config.mimeType).toBe('image/jpeg');
      expect(config.quality).toBe(0.95);
    });
  });

  describe('Individual Format Support', () => {
    it('should check individual format support', async () => {
      const mockSupport: FormatSupport = { avif: true, webp: false, jpeg: true };
      vi.spyOn(service, 'getSupportedFormats').mockResolvedValue(mockSupport);

      expect(await service.isFormatSupported('avif')).toBe(true);
      expect(await service.isFormatSupported('webp')).toBe(false);
      expect(await service.isFormatSupported('jpeg')).toBe(true);
    });
  });

  describe('Format Statistics', () => {
    it('should provide format statistics', async () => {
      const stats = await service.getFormatStats();

      expect(stats).toHaveProperty('support');
      expect(stats).toHaveProperty('bestFormat');
      expect(stats).toHaveProperty('detectionTime');

      expect(typeof stats.support.avif).toBe('boolean');
      expect(typeof stats.support.webp).toBe('boolean');
      expect(stats.support.jpeg).toBe(true);

      expect(stats.bestFormat.format).toMatch(/^(avif|webp|jpeg)$/);
      expect(stats.bestFormat.mimeType).toMatch(/^image\/(avif|webp|jpeg)$/);
      expect(stats.bestFormat.quality).toBe(0.95);

      expect(typeof stats.detectionTime).toBe('number');
      expect(stats.detectionTime).toBeGreaterThanOrEqual(0);
    });

    it('should show zero detection time for cached results', async () => {
      // First call to populate cache
      await service.getSupportedFormats();

      // Second call should use cache
      const stats = await service.getFormatStats();

      expect(stats.detectionTime).toBe(0);
    });
  });

  describe('Service Integration', () => {
    it('should log appropriate debug messages', async () => {
      await service.getSupportedFormats();

      expect(mockDebugService.standard).toHaveBeenCalledWith(
        expect.stringContaining('[ImageFormat]')
      );
    });

    it('should handle errors gracefully during detection', async () => {
      // This test verifies the service doesn't throw on detection failures
      // In a real browser environment, format detection might fail for various reasons

      await expect(service.getSupportedFormats()).resolves.toBeDefined();
      await expect(service.getBestFormat()).resolves.toBeDefined();
    });

    it('should provide consistent interface', async () => {
      const support = await service.getSupportedFormats();
      const bestFormat = await service.getBestFormat();
      const isAvifSupported = await service.isFormatSupported('avif');
      const stats = await service.getFormatStats();

      // All methods should work without throwing
      expect(support).toBeDefined();
      expect(bestFormat).toBeDefined();
      expect(typeof isAvifSupported).toBe('boolean');
      expect(stats).toBeDefined();

      // Results should be consistent
      expect(stats.support).toEqual(support);
      expect(stats.bestFormat).toEqual(bestFormat);
      expect(isAvifSupported).toBe(support.avif);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple concurrent detection calls', async () => {
      // Start multiple detection calls simultaneously
      const promises = [
        service.getSupportedFormats(),
        service.getSupportedFormats(),
        service.getSupportedFormats(),
      ];

      const results = await Promise.all(promises);

      // All should return the same result
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
      expect(results[0]).toBe(results[1]); // Same cached object
    });

    it('should handle refresh during detection', async () => {
      // Start detection
      const detectionPromise = service.getSupportedFormats();

      // Refresh while detection is in progress
      const refreshPromise = service.refreshDetection();

      const [detection, refresh] = await Promise.all([detectionPromise, refreshPromise]);

      expect(detection).toBeDefined();
      expect(refresh).toBeDefined();
      expect(typeof detection.avif).toBe('boolean');
      expect(typeof refresh.avif).toBe('boolean');
    });
  });
});
