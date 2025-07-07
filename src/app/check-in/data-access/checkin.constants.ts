/**
 * Central constants for check-in flow
 */

// Analysis messages shown during LLM processing
export const CHECKIN_ANALYSIS_MESSAGES = [
  'Analyzing sharpness...',
  'Checking contrast levels...',
  'Evaluating edge density...',
  'Measuring texture complexity...',
  'Examining pattern repetition...',
  'Assessing color variance...',
  'Detecting carpet features...'
];

// UI Messages
export const CHECKIN_UI_MESSAGES = {
  CAMERA_STARTING: 'Starting camera...',
  WAITING_FOR_GATES: 'Point at the carpet',
  PHOTO_CAPTURED: 'Photo captured! Processing...',
  NOT_CARPET_DETECTED: "That doesn't look like a carpet",
  NOT_CARPET_SUBMESSAGE: 'Try pointing at a carpet pattern',
  RETRY_COUNTDOWN: 'Returning to camera in a moment...',
  ALL_CONDITIONS_MET: 'All conditions met - Take Photo',
  EXIT_BUTTON: 'Exit',
  SUCCESS_TITLE: 'Check-in Successful!',
  SUCCESS_WELCOME: 'Welcome to',
  SUCCESS_POINTS: 'Points earned:',
  SUCCESS_BADGES: 'Badges earned:',
  SUCCESS_CONTINUE: 'Continue'
};

// Timing constants (milliseconds)
export const CHECKIN_TIMINGS = {
  GATE_MONITORING_INTERVAL: 1000,        // How often to check gates
  METRICS_ANALYSIS_INTERVAL: 200,        // How often to analyze video frame (faster for motion)
  ANALYSIS_MESSAGE_CYCLE: 800,           // How fast to cycle analysis messages
  DEV_MODE_AUTO_CAPTURE: 1000,          // Auto-capture delay in dev mode
  RETRY_DELAY: 2000,                    // Delay before retrying after failure
  VIDEO_READY_TIMEOUT: 5000,            // Timeout waiting for video
  DOM_UPDATE_DELAY: 100,                // Delay for DOM updates
  VIDEO_POLL_INTERVAL: 100,             // Interval for polling video element
  VIDEO_MAX_POLL_ATTEMPTS: 20,          // Max attempts to find video element
  LLM_BYPASS_DELAY: 1000                // Brief delay when bypassing LLM
};

// Canvas settings
export const CHECKIN_CANVAS_SETTINGS = {
  ANALYSIS_WIDTH: 640,
  ANALYSIS_HEIGHT: 480,
  JPEG_QUALITY: 0.8
};