/**
 * @fileoverview Tests for Image Processing Helper Functions
 * 
 * These tests demonstrate how much easier it is to test isolated helper functions
 * compared to testing them inside a large service.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { canvasToBlob, loadImageFromBlob, drawSquareCrop, resizeImageToSquare } from './image-processing.helpers';

describe('Image Processing Helpers', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    // Setup canvas for testing
    canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    ctx = canvas.getContext('2d')!;
    
    // Draw a simple test pattern
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, 50, 50);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(50, 0, 50, 50);
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(0, 50, 50, 50);
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(50, 50, 50, 50);
  });

  describe('canvasToBlob', () => {
    it('should convert canvas to JPEG blob successfully', async () => {
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/jpeg');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should convert canvas to PNG blob successfully', async () => {
      const blob = await canvasToBlob(canvas, 'image/png');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should use default JPEG format when no mimeType specified', async () => {
      const blob = await canvasToBlob(canvas);
      
      expect(blob.type).toBe('image/jpeg');
    });

    it('should handle invalid canvas gracefully', async () => {
      // Create a canvas that will fail to convert
      const invalidCanvas = document.createElement('canvas');
      invalidCanvas.width = 0;
      invalidCanvas.height = 0;
      
      await expect(canvasToBlob(invalidCanvas, 'invalid/format')).rejects.toThrow();
    });
  });

  describe('loadImageFromBlob', () => {
    it('should load image from valid blob', async () => {
      // First create a blob from our test canvas
      const blob = await canvasToBlob(canvas, 'image/png');
      
      // Then load it back as an image
      const img = await loadImageFromBlob(blob);
      
      expect(img).toBeInstanceOf(HTMLImageElement);
      expect(img.width).toBe(100);
      expect(img.height).toBe(100);
    });

    it('should reject invalid blob', async () => {
      const invalidBlob = new Blob(['invalid'], { type: 'text/plain' });
      
      await expect(loadImageFromBlob(invalidBlob)).rejects.toThrow('Failed to load image from blob');
    });
  });

  describe('drawSquareCrop', () => {
    it('should draw square crop from rectangular image', async () => {
      // Create a rectangular image (wider than tall)
      const rectCanvas = document.createElement('canvas');
      rectCanvas.width = 200;
      rectCanvas.height = 100;
      const rectCtx = rectCanvas.getContext('2d')!;
      rectCtx.fillStyle = '#FF0000';
      rectCtx.fillRect(0, 0, 200, 100);
      
      // Convert to image
      const blob = await canvasToBlob(rectCanvas, 'image/png');
      const img = await loadImageFromBlob(blob);
      
      // Create target canvas for crop
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = targetCanvas.height = 50;
      const targetCtx = targetCanvas.getContext('2d')!;
      
      // Draw square crop
      drawSquareCrop(targetCtx, img, 50);
      
      // Verify the result is a 50x50 square
      expect(targetCanvas.width).toBe(50);
      expect(targetCanvas.height).toBe(50);
      
      // Verify some pixels were drawn (non-transparent)
      const imageData = targetCtx.getImageData(0, 0, 50, 50);
      const hasNonTransparentPixels = Array.from(imageData.data).some((value, index) => 
        index % 4 === 3 && value > 0 // Check alpha channel
      );
      expect(hasNonTransparentPixels).toBe(true);
    });
  });

  describe('resizeImageToSquare', () => {
    it('should resize image blob to square dimensions', async () => {
      // Create original blob
      const originalBlob = await canvasToBlob(canvas, 'image/png');
      
      // Resize to 50x50
      const resizedBlob = await resizeImageToSquare(originalBlob, 50, 'image/png');
      
      expect(resizedBlob).toBeInstanceOf(Blob);
      expect(resizedBlob.type).toBe('image/png');
      expect(resizedBlob.size).toBeGreaterThan(0);
      
      // Verify the resized image dimensions
      const resizedImg = await loadImageFromBlob(resizedBlob);
      expect(resizedImg.width).toBe(50);
      expect(resizedImg.height).toBe(50);
    });

    it('should handle different output formats', async () => {
      const originalBlob = await canvasToBlob(canvas, 'image/png');
      
      // Resize to JPEG
      const jpegBlob = await resizeImageToSquare(originalBlob, 75, 'image/jpeg', 0.8);
      
      expect(jpegBlob.type).toBe('image/jpeg');
      
      const img = await loadImageFromBlob(jpegBlob);
      expect(img.width).toBe(75);
      expect(img.height).toBe(75);
    });

    it('should handle rectangular source images correctly', async () => {
      // Create a 200x100 rectangular canvas
      const rectCanvas = document.createElement('canvas');
      rectCanvas.width = 200;
      rectCanvas.height = 100;
      const rectCtx = rectCanvas.getContext('2d')!;
      rectCtx.fillStyle = '#0000FF';
      rectCtx.fillRect(0, 0, 200, 100);
      
      const rectBlob = await canvasToBlob(rectCanvas, 'image/png');
      
      // Resize to square - should crop the center square portion
      const squareBlob = await resizeImageToSquare(rectBlob, 60);
      const squareImg = await loadImageFromBlob(squareBlob);
      
      expect(squareImg.width).toBe(60);
      expect(squareImg.height).toBe(60);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end: canvas → blob → resize → verify', async () => {
      // Start with test canvas
      const startTime = performance.now();
      
      // Convert to blob
      const originalBlob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
      
      // Resize using our helper
      const resizedBlob = await resizeImageToSquare(originalBlob, 25, 'image/jpeg', 0.8);
      
      // Load result and verify
      const resultImg = await loadImageFromBlob(resizedBlob);
      
      const endTime = performance.now();
      
      // Assertions
      expect(resultImg.width).toBe(25);
      expect(resultImg.height).toBe(25);
      expect(resizedBlob.type).toBe('image/jpeg');
      expect(resizedBlob.size).toBeGreaterThan(0);
      expect(resizedBlob.size).toBeLessThan(originalBlob.size); // Should be smaller due to resize
      
      // Performance check - should complete quickly
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
    });
  });
});