export type CarpetRecognitionData = {
  // Orientation raw values
  isPhoneDown: boolean;
  orientationAngle: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  angleDifference?: number;
  orientationConfidence: number;

  // Texture analysis details
  hasTexture: boolean;
  textureConfidence: number;
  edgeCount?: number;
  totalSamples?: number;
  textureRatio?: number;

  // Multiple carpet detection metrics
  varianceIntensity?: number; // Local pixel intensity variance
  fiberDirection?: number; // Directional texture analysis score
  colorComplexity?: number; // Multi-channel color pattern detection
  frequencyAnalysis?: number; // High-frequency texture content
  localContrast?: number; // Micro-contrast variations
  gradientDensity?: number; // Edge gradient distribution
  textureUniformity?: number; // Consistency of texture across surface

  // Image quality
  isSharp: boolean;
  blurScore: number;

  // Photo capture - WebP + Binary
  capturedPhoto: Blob | null; // ✅ Binary Blob instead of Base64
  photoTaken: boolean;
  photoFilename: string | null;
  photoFormat: 'webp' | 'jpeg'; // ✅ Track format used
  photoSizeKB: number; // ✅ Track actual file size
  photoDisplayUrl: string | null; // ✅ Object URL for display

  // Overall decision
  overallConfidence: number;
  canCheckIn: boolean;
  debugInfo: string;

  // Device stability
  deviceStable: boolean;

  // LLM carpet detection
  llmCarpetDetected: boolean;
  llmProcessing: boolean;
  llmLastResult: string | null;
  llmStreamingText: string;
  llmResultPersistent: string | null;

  // Pub information
  pubName?: string;
};
