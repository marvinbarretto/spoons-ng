/**
 * @fileoverview Firebase Cloud Functions for Spoons App
 * 
 * FUNCTIONS INCLUDED:
 * - onCheckInCreate: Trigger when new check-in is created (validates and updates user stats)
 * - onUserCreate: Initialize user stats when new user signs up
 * - validateUserStats: HTTP function to validate and repair user statistics
 * - getUserLeaderboardStats: HTTP function to get real-time leaderboard data
 * 
 * ARCHITECTURE:
 * - All functions use Firebase Admin SDK for Firestore access
 * - Consistent error handling and logging
 * - Type-safe with TypeScript
 * - Follows Spoons app data models and conventions
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';

// Initialize Firebase Admin
initializeApp();

// Set global region for all functions
setGlobalOptions({
  region: 'europe-west2'
});

// Export all cloud functions
export { onCheckInCreate } from './triggers/onCheckInCreate';
export { onUserCreate } from './triggers/onUserCreate'; 
export { validateUserStats } from './http/validateUserStats';
export { getUserLeaderboardStats } from './http/getUserLeaderboardStats';

// Export utilities for testing
export { UserStatsCalculator } from './utils/userStatsCalculator';
export { CheckInValidator } from './utils/checkInValidator';

// Global Firestore instance for reuse across functions
export const db = getFirestore();