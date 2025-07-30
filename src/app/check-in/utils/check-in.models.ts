// src/app/check-in/utils/check-in.models.ts

import { Timestamp } from 'firebase/firestore';

export type PointsBreakdown = {
  base: number;
  distance: number;
  bonus: number;
  multiplier: number;
  total: number;
  reason: string;
  photoQuality?: number;
};

export type CheckIn = {
  id: string;
  userId: string;
  pubId: string;
  timestamp: Timestamp;
  dateKey: string;
  madeUserLandlord?: boolean;
  badgeName?: string;
  missionUpdated?: boolean;

  pointsEarned?: number;
  pointsBreakdown?: PointsBreakdown;

  carpetImageKey?: string;
};

// =====================================
// 🎯 CHECK-IN RESULT TYPES
// =====================================

/**
 * Complete check-in result data from the store/service
 * ✅ SINGLE SOURCE OF TRUTH for all check-in result types
 */
export type CheckInResultData = {
  // Core result
  success: boolean;
  error?: string;

  // Check-in data
  checkin?: CheckIn;
  pub?: CheckInPubData;

  // Landlord status
  isNewLandlord?: boolean;
  landlordMessage?: string;
  currentLandlord?: any; // TODO: Type this properly when Landlord model is ready
  todayLandlord?: any;

  // Badges and achievements
  badges?: CheckInBadgeData[];

  // Carpet detection
  carpetCaptured?: boolean;
  points?: any;

  // User context
  userWhoCheckedIn?: string;

  // Navigation behavior (UI concern)
  autoNavigate?: boolean;

  // Debug info (development only)
  debugInfo?: CheckInDebugInfo;
};

/**
 * Pub data needed for check-in results
 */
export type CheckInPubData = {
  id: string;
  name: string;
};

/**
 * Badge data for check-in results
 */
export type CheckInBadgeData = {
  badgeId: string;
  name: string;
};

/**
 * Debug information for development
 */
export type CheckInDebugInfo = {
  pubLandlordStatus: string;
  checkinTime: string;
  landlordClaimedAt?: string;
  existingLandlordUserId?: string;
};

// =====================================
// 🎨 UI-SPECIFIC DERIVED TYPES
// =====================================

/**
 * Data for check-in status modal (derived from CheckInResultData)
 */
export type CheckInStatusModalData = {
  success: boolean;
  pub?: CheckInPubData;
  error?: string;
  badges?: CheckInBadgeData[];
  checkinTime?: Timestamp;
};

/**
 * Data for landlord status modal (derived from CheckInResultData)
 */
export type LandlordStatusModalData = {
  isNewLandlord: boolean;
  landlordMessage?: string;
  pub?: CheckInPubData;
};
