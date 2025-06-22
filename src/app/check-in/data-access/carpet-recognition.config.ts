export const CARPET_RECOGNITION_CONFIG = {
  // Orientation tolerances
  orientation: {
    targetAngle: 0,        // ✅ Phone pointing down target
    tolerance: 80,         // ✅ Increased from 50 - more lenient
    minConfidence: 0.4     // ✅ Reduced from 0.6 - easier to trigger
  },

  // Texture detection
  texture: {
    edgeThreshold: 600,    // ✅ Reduced from 800 - easier carpet detection
    sampleStep: 10,        // Pixel sampling rate
    edgeDetectionThreshold: 30
  },

  // Image quality
  blur: {
    sharpnessThreshold: 100, // ✅ Reduced from 150 - less strict
    varianceThreshold: 150
  },

  // Photo capture
  photo: {
    quality: 0.95,
    maxWidth: 1920,       // ✅ Bigger photos
    maxHeight: 1440
  }
} as const;
