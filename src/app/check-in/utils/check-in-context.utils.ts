// src/app/check-in/utils/check-in-context.utils.ts
import type { Pub } from '@pubs/utils/pub.models';
import { getDistanceKm } from '@shared/utils/location.utils';
import type { User } from '@users/utils/user.model';

export type CheckInContextData = {
  pubId: string;
  distanceFromHome: number;
  isFirstVisit: boolean;
  isFirstEver: boolean;
  currentStreak: number;
  carpetConfirmed: boolean;
  sharedSocial: boolean;
  isHomePub: boolean;
};

export type CheckInContextInput = {
  userId: string;
  pubId: string;
  user: User | null;
  checkInPub: Pub | null;
  homePub: Pub | null;
  userTotalCheckins: number;
  pubSpecificCheckins: number;
  carpetConfirmed?: boolean;
  sharedSocial?: boolean;
  currentStreak?: number;
};

/**
 * Pure function to determine if this is user's first check-in ever
 */
export function isFirstEverCheckIn(totalCheckins: number): boolean {
  return totalCheckins === 0;
}

/**
 * Pure function to determine if this is user's first visit to this specific pub
 */
export function isFirstVisitToPub(pubSpecificCheckins: number): boolean {
  return pubSpecificCheckins === 1; // Assuming we're checking after the check-in is created
}

/**
 * Pure function to determine if check-in pub is user's home pub
 */
export function isHomePub(pubId: string, user: User | null): boolean {
  return !!(user?.homePubId && user.homePubId === pubId);
}

/**
 * Pure function to calculate distance from user's home pub to check-in pub
 */
export function calculateDistanceFromHome(homePub: Pub | null, checkInPub: Pub | null): number {
  console.log('🔄 [CheckInContext] Calculating distance from home...');

  if (!homePub) {
    console.log('🔄 [CheckInContext] No home pub set - distance: 0km');
    return 0;
  }

  if (!checkInPub) {
    console.log('🔄 [CheckInContext] No check-in pub provided - distance: 0km');
    return 0;
  }

  console.log(`🔄 [CheckInContext] Home pub: "${homePub.name}" (${homePub.id})`);
  console.log(`🔄 [CheckInContext] Check-in pub: "${checkInPub.name}" (${checkInPub.id})`);

  if (!homePub.location || !checkInPub.location) {
    console.log('🔄 [CheckInContext] Missing location data - distance: 0km');
    console.log(`🔄   Home pub location: ${homePub.location ? 'available' : 'missing'}`);
    console.log(`🔄   Check-in pub location: ${checkInPub.location ? 'available' : 'missing'}`);
    return 0;
  }

  // If checking into home pub, distance is 0
  if (homePub.id === checkInPub.id) {
    console.log('🔄 [CheckInContext] Checking into home pub - distance: 0km');
    return 0;
  }

  const distance = getDistanceKm(
    { lat: homePub.location.lat, lng: homePub.location.lng },
    { lat: checkInPub.location.lat, lng: checkInPub.location.lng }
  );

  console.log(`🔄 [CheckInContext] Distance calculated: ${distance.toFixed(2)}km`);
  return distance;
}

/**
 * Main utility function that combines all context calculations
 */
export function calculateCheckInContext(input: CheckInContextInput): CheckInContextData {
  const callId = Date.now();
  console.log(`🔄 [CheckInContext] === CONTEXT GATHERING STARTED (${callId}) ===`);
  console.log(`🔄 [CheckInContext] Input data (${callId}):`, {
    userId: input.userId,
    pubId: input.pubId,
    userName: input.user?.displayName || 'Unknown',
    userHomePubId: input.user?.homePubId || 'None set',
    userTotalCheckins: input.userTotalCheckins,
    pubSpecificCheckins: input.pubSpecificCheckins,
    checkInPubName: input.checkInPub?.name || 'Unknown',
    homePubName: input.homePub?.name || 'None set',
  });

  console.group(`🔄 Context Analysis (${callId})`);

  // Distance calculation
  console.log('🔄 [CheckInContext] Step 1: Distance from home');
  const distanceFromHome = calculateDistanceFromHome(input.homePub, input.checkInPub);

  // First-time checks
  console.log('🔄 [CheckInContext] Step 2: First-time checks');
  const isFirstEver = isFirstEverCheckIn(input.userTotalCheckins);
  console.log(`🔄   Total user check-ins: ${input.userTotalCheckins}`);
  console.log(`🔄   Is first ever check-in: ${isFirstEver}`);

  const isFirstVisit = isFirstVisitToPub(input.pubSpecificCheckins);
  console.log(`🔄   Check-ins to this pub: ${input.pubSpecificCheckins}`);
  console.log(`🔄   Is first visit to pub: ${isFirstVisit}`);

  // Home pub check
  console.log('🔄 [CheckInContext] Step 3: Home pub analysis');
  const isUserHomePub = isHomePub(input.pubId, input.user);
  console.log(`🔄   User home pub ID: ${input.user?.homePubId || 'None set'}`);
  console.log(`🔄   Check-in pub ID: ${input.pubId}`);
  console.log(`🔄   Is checking into home pub: ${isUserHomePub}`);

  const context: CheckInContextData = {
    pubId: input.pubId,
    distanceFromHome,
    isFirstVisit,
    isFirstEver,
    currentStreak: input.currentStreak || 0,
    carpetConfirmed: input.carpetConfirmed || false,
    sharedSocial: input.sharedSocial || false,
    isHomePub: isUserHomePub,
  };

  console.groupEnd();
  console.log(`🔄 [CheckInContext] === CONTEXT GATHERING COMPLETE (${callId}) ===`);
  console.log(`🔄 Final context:`, context);

  return context;
}
