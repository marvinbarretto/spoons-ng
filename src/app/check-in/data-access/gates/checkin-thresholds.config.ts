/**
 * Central configuration for all check-in gate thresholds
 * These values control when various conditions are considered "passed"
 */
export const CHECKIN_GATE_THRESHOLDS = {
  // Image quality thresholds
  sharpness: {
    min: 10, // Minimum sharpness score (0-100)
    description: 'Image must be sharp enough to detect carpet patterns',
  },

  contrast: {
    min: 20, // Minimum contrast score (0-100)
    description: 'Image must have sufficient contrast',
  },

  edgeDensity: {
    min: 15, // Minimum edge density percentage
    description: 'Carpet patterns create edge density',
  },

  textureComplexity: {
    min: 10, // Minimum texture complexity percentage
    description: 'Carpets have complex textures',
  },

  deviceStability: {
    maxMovement: 25, // Maximum degrees of movement
    minStableTime: 1000, // Milliseconds of stability required
    description: 'Device must be held steady',
  },

  // Device orientation
  deviceOrientation: {
    maxAngleFromDown: 45, // Maximum angle from pointing down (degrees)
    description: 'Phone should point downward at carpet',
  },

  // Simple orientation (lightweight version)
  simpleOrientation: {
    min: -5, // Minimum beta angle
    max: 45, // Maximum beta angle
    description: 'Device should be between -5° and 45° (nearly horizontal to moderately tilted)',
  },
} as const;

// Type for threshold config
export type ThresholdConfig = typeof CHECKIN_GATE_THRESHOLDS;
