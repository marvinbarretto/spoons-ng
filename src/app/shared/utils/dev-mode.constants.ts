// src/app/shared/utils/dev-mode.constants.ts

/**
 * Development Mode Configuration
 *
 * WARNING: This mode bypasses ALL security and validation checks!
 * Only enable during development and testing.
 */

/**
 * Master development mode toggle
 *
 * When TRUE:
 * - All proximity checks are bypassed
 * - Daily check-in limits are disabled
 * - Desktop testing mode is enabled (forced LLM + photo capture)
 * - Additional debug logging is enabled
 *
 * When FALSE:
 * - Full production validation is enforced
 * - Normal camera behavior is used
 * - Standard logging levels apply
 *
 * @default false - MUST be false for production builds
 */
export const ACTIVE_DEVELOPMENT_MODE = true;

/**
 * Modal navigation timeout (in milliseconds)
 * Safety net to prevent users getting stuck on check-in page
 */
export const MODAL_NAVIGATION_TIMEOUT = 10000; // 10 seconds

/**
 * Desktop testing timeout (in milliseconds)
 * How long to wait before forcing LLM detection in dev mode
 */
export const DESKTOP_TESTING_DELAY = 2000; // 2 seconds

/**
 * LLM to photo capture delay (in milliseconds)
 * How long to wait after LLM response before forcing photo capture
 */
export const LLM_TO_PHOTO_DELAY = 3000; // 3 seconds

/**
 * Development mode feature flags
 */
export const DEV_FEATURES = {
  /** Skip proximity validation checks */
  SKIP_PROXIMITY_CHECKS: ACTIVE_DEVELOPMENT_MODE,

  /** Skip daily check-in limit validation */
  SKIP_DAILY_LIMITS: ACTIVE_DEVELOPMENT_MODE,

  /** Enable desktop testing bypass for carpet scanner */
  DESKTOP_TESTING_MODE: ACTIVE_DEVELOPMENT_MODE,

  /** Enable verbose development logging */
  VERBOSE_LOGGING: ACTIVE_DEVELOPMENT_MODE,
} as const;

/**
 * Runtime check to ensure development mode is not accidentally enabled in production
 */
if (ACTIVE_DEVELOPMENT_MODE && typeof window !== 'undefined') {
  console.warn(
    '🚨 [DEV-MODE] ACTIVE_DEVELOPMENT_MODE is ENABLED! ' +
    'All security checks are bypassed. This MUST be disabled for production!'
  );
}
