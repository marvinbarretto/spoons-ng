export type CarpetRecognitionData = {
  isPhoneDown: boolean;
  orientationAngle: number;
  orientationConfidence: number;
  hasTexture: boolean;
  textureConfidence: number;
  overallConfidence: number;
  canCheckIn: boolean;
  debugInfo: string;
};
