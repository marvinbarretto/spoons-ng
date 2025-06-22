export type CarpetRecognitionData = {
  // Orientation raw values
  isPhoneDown: boolean;
  orientationAngle: number;
  alpha?: number;           // ✅ Compass heading
  beta?: number;            // ✅ Front-to-back tilt
  gamma?: number;           // ✅ Left-to-right tilt
  angleDifference?: number; // ✅ How far from 90°
  orientationConfidence: number;

  // Texture analysis details
  hasTexture: boolean;
  textureConfidence: number;
  edgeCount?: number;       // ✅ Raw edge count
  totalSamples?: number;    // ✅ Total pixels sampled
  textureRatio?: number;    // ✅ Edge ratio

  // Overall (remove this calculation for now)
  overallConfidence: number;
  canCheckIn: boolean;
  debugInfo: string;

  isSharp: boolean;
  blurScore: number;
  capturedPhoto: string | null; // Base64 image data
  photoTaken: boolean;
};
