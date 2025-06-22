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

  // Image quality
  isSharp: boolean;
  blurScore: number;

  // Photo capture - WebP + Binary
  capturedPhoto: Blob | null;           // ✅ Binary Blob instead of Base64
  photoTaken: boolean;
  photoFilename: string | null;
  photoFormat: 'webp' | 'jpeg';        // ✅ Track format used
  photoSizeKB: number;                  // ✅ Track actual file size
  photoDisplayUrl: string | null;      // ✅ Object URL for display

  // Overall decision
  overallConfidence: number;
  canCheckIn: boolean;
  debugInfo: string;
};
