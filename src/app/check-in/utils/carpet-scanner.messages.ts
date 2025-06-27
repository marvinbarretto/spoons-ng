export const CARPET_SCANNER_MESSAGES = {
  // Camera states
  STARTING_CAMERA: 'Starting camera...',
  CAMERA_ERROR: 'Error',

  // Scanning states
  POINT_AT_CARPET: 'Point and hold your phone at the carpet',
  ANALYZING_CARPET: 'Analyzing carpet pattern...',
  PROCESSING: 'Processing...',

  // Success states
  CARPET_DETECTED: 'Carpet detected! Preparing check-in...',
  PREPARING_CHECKIN: 'Preparing your check-in...',
  HOLD_STEADY: 'Hold steady... capturing photo',
  ALL_CONDITIONS_MET: 'All conditions met!',

  // Capture states
  PHOTO_CAPTURED: (format: string, sizeKB: number) =>
    `Perfect! ${format.toUpperCase()} captured (${sizeKB}KB)`,

  // Failure states
  STILL_SCANNING: 'Still scanning...',
  NOT_CARPET_QUESTION: 'Are you sure this is a carpet?',

  // Success with pub name
  WELCOME_TO_PUB: (pubName: string) => `Welcome to ${pubName}!`,
} as const;
