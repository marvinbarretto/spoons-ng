// check-in/data-access/carpet-recognition.config.ts

export const CARPET_RECOGNITION_CONFIG = {
  // Orientation tolerances
  orientation: {
    targetAngle: 0,        // Phone pointing down target
    tolerance: 80,         // Increased tolerance - more lenient
    minConfidence: 0.4     // Reduced confidence requirement
  },

  // Texture detection
  texture: {
    edgeThreshold: 600,    // Reduced from 800 - easier carpet detection
    sampleStep: 10,        // Pixel sampling rate
    edgeDetectionThreshold: 30
  },

  // Image quality
  blur: {
    sharpnessThreshold: 100, // Reduced - less strict
    varianceThreshold: 150
  },

  // Photo capture - WebP optimized
  photo: {
    preferredFormat: 'webp' as const,
    fallbackFormat: 'jpeg' as const,
    quality: 0.92,          // Slightly lower quality for WebP (still excellent)
    maxWidth: 1920,         // High resolution for detail
    maxHeight: 1440,
    // WebP gives better compression, so we can afford higher resolution
    webpQuality: 0.92,      // WebP-specific quality
    jpegQuality: 0.95       // JPEG fallback quality
  }
} as const;
