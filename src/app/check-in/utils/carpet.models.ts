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

  // Photo capture
  capturedPhoto: string | null;
  photoTaken: boolean;
  photoFilename: string | null;

  // Overall decision
  overallConfidence: number;
  canCheckIn: boolean;
  debugInfo: string;
};
