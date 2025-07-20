// src/app/check-in/utils/points-calculation.utils.ts
import { POINTS_CONFIG } from '@points/utils/points.config';
import { getDistanceKm } from '@shared/utils/location.utils';
import type { PointsBreakdown } from '@points/utils/points.models';
import type { Pub } from '@pubs/utils/pub.models';

export type CheckInPointsInput = {
  /** The pub being checked into */
  checkInPub: Pub;
  /** User's home pub (optional, used for distance calculation) */
  homePub?: Pub | null;
  /** Whether this is the user's first check-in ever */
  isFirstEver?: boolean;
  /** Whether this is the user's first visit to this specific pub */
  isFirstVisit?: boolean;
  /** Whether this check-in should receive home pub bonus */
  isHomePub?: boolean;
  /** Whether carpet was confirmed */
  carpetConfirmed?: boolean;
  /** Whether social sharing bonus applies */
  sharedSocial?: boolean;
  /** Current streak days */
  currentStreak?: number;
  /** Additional bonus points */
  additionalBonus?: number;
  /** Custom reason for points calculation */
  customReason?: string;
};

/**
 * Calculate base check-in points
 */
export function calculateBasePoints(): { points: number; reason: string } {
  const base = POINTS_CONFIG.checkIn.base;
  return {
    points: base,
    reason: `${base} base points`
  };
}

/**
 * Calculate first-time bonuses (first ever or first visit to pub)
 */
export function calculateFirstTimeBonus(isFirstEver: boolean, isFirstVisit: boolean): { points: number; reasons: string[] } {
  console.log('🆕 [PointsCalculation] Calculating first-time bonuses...');
  console.log(`🆕   isFirstEver: ${isFirstEver}`);
  console.log(`🆕   isFirstVisit: ${isFirstVisit}`);
  
  const reasons: string[] = [];
  let points = 0;

  if (isFirstEver) {
    const firstEverBonus = POINTS_CONFIG.checkIn.firstEver;
    points += firstEverBonus;
    reasons.push(`${firstEverBonus} first check-in bonus`);
    console.log(`🆕 [PointsCalculation] First ever check-in! Bonus: ${firstEverBonus} points`);
  } else if (isFirstVisit) {
    const firstTimeBonus = POINTS_CONFIG.checkIn.firstTime;
    points += firstTimeBonus;
    reasons.push(`${firstTimeBonus} first visit to this pub`);
    console.log(`🆕 [PointsCalculation] First visit to this pub! Bonus: ${firstTimeBonus} points`);
  } else {
    console.log('🆕 [PointsCalculation] Not first ever or first visit - no first-time bonus');
  }

  console.log(`🆕 [PointsCalculation] First-time bonus total: ${points} points`);
  return { points, reasons };
}

/**
 * Calculate home pub bonus
 */
export function calculateHomePubBonus(isHomePub: boolean): { points: number; reason?: string } {
  console.log('🏠 [PointsCalculation] Calculating home pub bonus...');
  console.log(`🏠   isHomePub: ${isHomePub}`);
  
  if (!isHomePub) {
    console.log('🏠 [PointsCalculation] Not checking into home pub - no home pub bonus');
    return { points: 0 };
  }

  const homePubBonus = POINTS_CONFIG.checkIn.homePub;
  console.log(`🏠 [PointsCalculation] Checking into home pub! Bonus: ${homePubBonus} points`);
  
  return {
    points: homePubBonus,
    reason: `${homePubBonus} home pub bonus`
  };
}

/**
 * Calculate distance bonus between home pub and check-in pub
 */
export function calculateDistanceBonus(homePub: Pub | null, checkInPub: Pub): { points: number; reason?: string } {
  console.log('📍 [PointsCalculation] Calculating distance bonus...');
  
  if (!homePub) {
    console.log('📍 [PointsCalculation] No home pub set - distance bonus: 0');
    return { points: 0 };
  }

  if (!homePub.location) {
    console.log('📍 [PointsCalculation] Home pub missing location - distance bonus: 0');
    console.log('📍 [PointsCalculation] Home pub:', homePub.name, homePub.id);
    return { points: 0 };
  }

  if (!checkInPub.location) {
    console.log('📍 [PointsCalculation] Check-in pub missing location - distance bonus: 0');
    console.log('📍 [PointsCalculation] Check-in pub:', checkInPub.name, checkInPub.id);
    return { points: 0 };
  }

  const homeCoords = { lat: homePub.location.lat, lng: homePub.location.lng };
  const checkInCoords = { lat: checkInPub.location.lat, lng: checkInPub.location.lng };
  
  console.log('📍 [PointsCalculation] Coordinates:');
  console.log(`📍   Home pub "${homePub.name}": lat=${homeCoords.lat}, lng=${homeCoords.lng}`);
  console.log(`📍   Check-in pub "${checkInPub.name}": lat=${checkInCoords.lat}, lng=${checkInCoords.lng}`);

  const distanceFromHome = getDistanceKm(homeCoords, checkInCoords);
  console.log(`📍 [PointsCalculation] Distance calculated: ${distanceFromHome.toFixed(2)}km`);

  if (distanceFromHome < POINTS_CONFIG.distance.minDistance) {
    console.log(`📍 [PointsCalculation] Distance too short (${distanceFromHome.toFixed(2)}km < ${POINTS_CONFIG.distance.minDistance}km minimum) - distance bonus: 0`);
    return { points: 0 };
  }

  const rawBonus = distanceFromHome * POINTS_CONFIG.distance.pointsPerKm;
  const distanceBonus = Math.min(Math.floor(rawBonus), POINTS_CONFIG.distance.maxDistanceBonus);
  
  console.log(`📍 [PointsCalculation] Distance bonus calculation:`);
  console.log(`📍   Formula: ${distanceFromHome.toFixed(2)}km × ${POINTS_CONFIG.distance.pointsPerKm} points/km = ${rawBonus.toFixed(2)}`);
  console.log(`📍   Floored: ${Math.floor(rawBonus)}`);
  console.log(`📍   Max bonus: ${POINTS_CONFIG.distance.maxDistanceBonus}`);
  console.log(`📍   Final distance bonus: ${distanceBonus} points`);

  return {
    points: distanceBonus,
    reason: `${distanceBonus} distance bonus (${distanceFromHome.toFixed(1)}km from home)`
  };
}

/**
 * Calculate carpet confirmation bonus
 */
export function calculateCarpetBonus(carpetConfirmed: boolean): { points: number; reason?: string } {
  if (!carpetConfirmed) {
    return { points: 0 };
  }

  const carpetBonus = POINTS_CONFIG.carpet.confirmed;
  return {
    points: carpetBonus,
    reason: `${carpetBonus} carpet confirmed`
  };
}

/**
 * Calculate social sharing bonus
 */
export function calculateSocialBonus(sharedSocial: boolean): { points: number; reason?: string } {
  if (!sharedSocial) {
    return { points: 0 };
  }

  const shareBonus = POINTS_CONFIG.social.share;
  return {
    points: shareBonus,
    reason: `${shareBonus} social share bonus`
  };
}

/**
 * Calculate streak bonus
 */
export function calculateStreakBonus(currentStreak: number): { points: number; reason?: string } {
  if (!currentStreak || currentStreak <= 0) {
    return { points: 0 };
  }

  const streakBonuses = POINTS_CONFIG.streaks.daily;
  
  const applicableStreaks = Object.keys(streakBonuses)
    .map(Number)
    .filter(days => currentStreak >= days)
    .sort((a, b) => b - a);
  
  if (applicableStreaks.length === 0) {
    return { points: 0 };
  }
  
  const highestStreak = applicableStreaks[0].toString();
  const streakBonus = streakBonuses[highestStreak] || 0;
  
  return {
    points: streakBonus,
    reason: `${streakBonus} ${currentStreak}-day streak bonus`
  };
}

/**
 * Main function that orchestrates all point calculations
 */
export function calculateCheckInPoints(input: CheckInPointsInput): PointsBreakdown {
  const callId = Date.now();
  console.log(`🎯 [PointsCalculation] === SINGLE SOURCE OF TRUTH CALCULATION STARTED (${callId}) ===`);
  console.log(`🎯 [PointsCalculation] Input (${callId}):`, {
    checkInPub: input.checkInPub?.name || 'Unknown',
    homePub: input.homePub?.name || 'None set',
    isFirstEver: input.isFirstEver,
    isFirstVisit: input.isFirstVisit,
    isHomePub: input.isHomePub,
    carpetConfirmed: input.carpetConfirmed,
    sharedSocial: input.sharedSocial,
    currentStreak: input.currentStreak
  });
  
  console.group(`🎯 Points Calculation Breakdown (${callId})`);
  
  const reasons: string[] = [];
  
  // Base points
  console.log('📊 [PointsCalculation] Step 1: Base points');
  const baseCalc = calculateBasePoints();
  reasons.push(baseCalc.reason);
  
  // First-time bonuses
  console.log('📊 [PointsCalculation] Step 2: First-time bonuses');
  const firstTimeCalc = calculateFirstTimeBonus(input.isFirstEver || false, input.isFirstVisit || false);
  reasons.push(...firstTimeCalc.reasons);
  
  // Home pub bonus
  console.log('📊 [PointsCalculation] Step 3: Home pub bonus');
  const homePubCalc = calculateHomePubBonus(input.isHomePub || false);
  if (homePubCalc.reason) reasons.push(homePubCalc.reason);
  
  // Distance bonus - THE KEY ONE!
  console.log('📊 [PointsCalculation] Step 4: Distance bonus (KEY FEATURE!)');
  const distanceCalc = calculateDistanceBonus(input.homePub || null, input.checkInPub);
  if (distanceCalc.reason) reasons.push(distanceCalc.reason);
  
  // Carpet bonus
  console.log('📊 [PointsCalculation] Step 5: Carpet bonus');
  const carpetCalc = calculateCarpetBonus(input.carpetConfirmed || false);
  if (carpetCalc.reason) reasons.push(carpetCalc.reason);
  
  // Social bonus
  console.log('📊 [PointsCalculation] Step 6: Social bonus');
  const socialCalc = calculateSocialBonus(input.sharedSocial || false);
  if (socialCalc.reason) reasons.push(socialCalc.reason);
  
  // Streak bonus
  console.log('📊 [PointsCalculation] Step 7: Streak bonus');
  const streakCalc = calculateStreakBonus(input.currentStreak || 0);
  if (streakCalc.reason) reasons.push(streakCalc.reason);
  
  // Additional bonus
  if (input.additionalBonus && input.additionalBonus > 0) {
    console.log(`📊 [PointsCalculation] Step 8: Additional bonus: ${input.additionalBonus}`);
    reasons.push(`${input.additionalBonus} additional bonus`);
  }
  
  // Calculate totals
  const base = baseCalc.points;
  const distance = distanceCalc.points;
  const bonus = firstTimeCalc.points + homePubCalc.points + carpetCalc.points + 
                socialCalc.points + streakCalc.points + (input.additionalBonus || 0);
  const multiplier = 1;
  const total = (base + distance + bonus) * multiplier;
  
  console.log(`🎯 [PointsCalculation] Final calculation (${callId}):`);
  console.log(`🎯   Base: ${base}`);
  console.log(`🎯   Distance: ${distance} 📍`);
  console.log(`🎯   Other bonuses: ${bonus}`);
  console.log(`🎯   Multiplier: ${multiplier}`);
  console.log(`🎯   Formula: (${base} + ${distance} + ${bonus}) × ${multiplier} = ${total}`);
  
  const breakdown: PointsBreakdown = {
    base,
    distance,
    bonus,
    multiplier,
    total,
    reason: input.customReason || reasons.join(' + ')
  };
  
  console.groupEnd();
  console.log(`🎯 [PointsCalculation] === SINGLE SOURCE OF TRUTH RESULT (${callId}) ===`);
  console.log(`🎯 Final breakdown:`, breakdown);
  
  return breakdown;
}