
// =====================================
// 🔧 NEW-CHECKIN SERVICE
// =====================================

// src/app/new-checkin/data-access/new-checkin-service.ts
import { Injectable, inject } from '@angular/core';
import { NearbyPubStore } from '../../pubs/data-access/nearby-pub.store';

@Injectable({ providedIn: 'root' })
export class NewCheckinService {
  private nearbyPubStore = inject(NearbyPubStore);

  /**
   * Check if user can check in to this pub
   *
   * @param pubId - The pub to validate check-in for
   * @returns Promise<{allowed: boolean, reason?: string}>
   */
  async canCheckIn(pubId: string): Promise<{ allowed: boolean; reason?: string }> {
    console.log('[NewCheckinService] 🔍 Running check-in validations for pub:', pubId);

    // Gate 1: Daily limit check
    console.log('[NewCheckinService] 📅 Starting daily limit validation...');
    const dailyCheck = await this.dailyLimitCheck(pubId);
    if (!dailyCheck.passed) {
      console.log('[NewCheckinService] ❌ Failed daily limit check:', dailyCheck.reason);
      return { allowed: false, reason: dailyCheck.reason };
    }
    console.log('[NewCheckinService] ✅ Daily limit check passed');

    // Gate 2: Proximity check
    console.log('[NewCheckinService] 📍 Starting proximity validation...');
    const proximityCheck = await this.proximityCheck(pubId);
    if (!proximityCheck.passed) {
      console.log('[NewCheckinService] ❌ Failed proximity check:', proximityCheck.reason);
      return { allowed: false, reason: proximityCheck.reason };
    }
    console.log('[NewCheckinService] ✅ Proximity check passed');

    // All gates passed
    console.log('[NewCheckinService] ✅ All validations passed - check-in allowed');
    return { allowed: true };
  }

  /**
   * Check if user has already checked into this pub today
   */
  private async dailyLimitCheck(pubId: string): Promise<{ passed: boolean; reason?: string }> {
    console.log('[NewCheckinService] 📅 Checking daily limit for pub:', pubId);

    // Simulate network delay for checking today's check-ins
    console.log('[NewCheckinService] 📅 Querying today\'s check-ins...');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Simulate different scenarios for testing
    const scenarios = ['already_checked_in', 'not_checked_in'];
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    console.log('[NewCheckinService] 📅 Daily limit scenario:', randomScenario);

    if (randomScenario === 'already_checked_in') {
      console.log('[NewCheckinService] 📅 User already checked into this pub today');
      return { passed: false, reason: 'You have already checked into this pub today' };
    }

    console.log('[NewCheckinService] 📅 User has not checked into this pub today');
    return { passed: true };
  }

  /**
   * Check if user is close enough to the pub
   */
  private async proximityCheck(pubId: string): Promise<{ passed: boolean; reason?: string }> {
    console.log('[NewCheckinService] 📍 Checking proximity to pub:', pubId);

    try {
      // Get real distance using NearbyPubStore
      console.log('[NewCheckinService] 📍 Getting real distance to pub...');
      const distance = this.nearbyPubStore.getDistanceToPub(pubId);

      if (distance === null) {
        console.log('[NewCheckinService] 📍 Could not determine distance (no location or pub not found)');
        return { passed: false, reason: 'Could not determine your location or pub location' };
      }

      console.log('[NewCheckinService] 📍 Real distance calculated:', Math.round(distance), 'meters');

      // Check if within range (using same threshold as NearbyPubStore)
      const isWithinRange = this.nearbyPubStore.isWithinCheckInRange(pubId);
      // const isWithinRange = distance <= 100;
      console.log('[NewCheckinService] 📍 Within check-in range?', isWithinRange);

      if (!isWithinRange) {
        const distanceInMeters = Math.round(distance);
        console.log('[NewCheckinService] 📍 User is too far from pub');
        return {
          passed: false,
          reason: `You are ${distanceInMeters}m away. Must be within 100m to check in.`
        };
      }

      console.log('[NewCheckinService] 📍 User is within check-in range');
      return { passed: true };

    } catch (error) {
      console.error('[NewCheckinService] 📍 Error checking proximity:', error);
      return { passed: false, reason: 'Failed to check your location' };
    }
  }

  /**
 * Create a check-in record
 *
 * @param pubId - The pub to check into
 * @returns Promise<void>
 */
  async createCheckin(pubId: string): Promise<void> {
    console.log('[NewCheckinService] 🚀 createCheckin() called with pubId:', pubId);

    // Simulate network delay
    console.log('[NewCheckinService] ⏳ Simulating network call...');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate random success/failure for testing
    const shouldSucceed = Math.random() > 0.2; // 80% success rate

    if (shouldSucceed) {
      console.log('[NewCheckinService] ✅ Check-in created successfully');
      console.log('[NewCheckinService] 📝 Would normally save to Firestore here');
    } else {
      console.log('[NewCheckinService] ❌ Simulated failure');
      throw new Error('Simulated network error');
    }
  }
}
