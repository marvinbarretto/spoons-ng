// src/app/shared/utils/timestamp.utils.ts
import { Timestamp } from 'firebase/firestore';

/**
 * Safely converts various timestamp formats to a Date object
 */
export function toDate(timestamp: unknown): Date | null {
  if (!timestamp) return null;

  // Already a Date
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Firebase Timestamp
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    try {
      return (timestamp as Timestamp).toDate();
    } catch (error) {
      console.warn('[TimestampUtils] Failed to convert Timestamp:', timestamp, error);
      return null;
    }
  }

  // Plain object with seconds/nanoseconds (serialized Timestamp)
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    try {
      const ts = timestamp as { seconds: number; nanoseconds?: number };
      return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000);
    } catch (error) {
      console.warn('[TimestampUtils] Failed to convert timestamp object:', timestamp, error);
      return null;
    }
  }

  // String or number
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    try {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.warn('[TimestampUtils] Failed to convert string/number timestamp:', timestamp, error);
      return null;
    }
  }

  console.warn('[TimestampUtils] Unknown timestamp format:', timestamp);
  return null;
}

/**
 * Safely converts to Firebase Timestamp
 */
export function toTimestamp(input: unknown): Timestamp | null {
  const date = toDate(input);
  return date ? Timestamp.fromDate(date) : null;
}

/**
 * Formats timestamp for display
 */
export function formatTimestamp(
  timestamp: unknown,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = toDate(timestamp);
  if (!date) return '—';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return date.toLocaleDateString(undefined, { ...defaultOptions, ...options });
}

/**
 * Formats timestamp as time only
 */
export function formatTime(timestamp: unknown): string {
  return formatTimestamp(timestamp, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Formats timestamp as date only
 */
export function formatDate(timestamp: unknown): string {
  return formatTimestamp(timestamp, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Gets relative time (e.g., "2 minutes ago")
 */
export function getRelativeTime(timestamp: unknown): string {
  const date = toDate(timestamp);
  if (!date) return 'Unknown time';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return formatDate(timestamp);
}

/**
 * Checks if timestamp is today
 */
export function isToday(timestamp: unknown): boolean {
  const date = toDate(timestamp);
  if (!date) return false;

  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Checks if timestamp is within the last N days
 */
export function isWithinDays(timestamp: unknown, days: number): boolean {
  const date = toDate(timestamp);
  if (!date) return false;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= days;
}
