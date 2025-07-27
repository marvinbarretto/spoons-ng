// badges/data-access/badge-logic.service.ts
import { Injectable, inject } from '@angular/core';
import type { BadgeTriggerContext } from '../utils/badge.model';
import { BadgeStore } from './badge.store';


/**
 * Contains all badge eligibility logic.
 * Each method returns true if the user should earn that badge.
 */
@Injectable({ providedIn: 'root' })
export class BadgeLogicService {
  protected readonly _badgeStore = inject(BadgeStore);

  /**
   * Check if user should earn the "First Time" badge
   */
  checkFirstTimeBadge(context: BadgeTriggerContext): boolean {
    console.log('[BadgeLogic] Checking First Time badge', {
      userId: context.userId,
      checkInCount: context.userCheckIns.length
    });

    // User gets this badge on their very first check-in
    const isFirstCheckIn = context.userCheckIns.length === 1;

    if (isFirstCheckIn) {
      console.log('🏅 [BadgeLogic] User eligible for First Time badge!');
      return true;
    }

    console.log('📝 [BadgeLogic] Not first check-in, skipping First Time badge');
    return false;
  }

  /**
   * Check if user should earn the "Regular" badge (10 check-ins)
   */
  checkRegularBadge(context: BadgeTriggerContext): boolean {
    console.log('[BadgeLogic] Checking Regular badge', {
      userId: context.userId,
      checkInCount: context.userCheckIns.length
    });

    // User gets this badge on their 10th check-in
    const isTenthCheckIn = context.userCheckIns.length === 10;

    if (isTenthCheckIn) {
      console.log('🏅 [BadgeLogic] User eligible for Regular badge!');
      return true;
    }

    console.log('📝 [BadgeLogic] Not 10th check-in, skipping Regular badge');
    return false;
  }

  /**
   * Check if user should earn the "Early Bird" badge (check-in before noon)
   */
  checkEarlyBirdBadge(context: BadgeTriggerContext): boolean {
    console.log('[BadgeLogic] Checking Early Bird badge', {
      userId: context.userId,
      checkInCount: context.userCheckIns.length
    });

    // Check if any check-ins were before noon
    const hasEarlyCheckIn = context.userCheckIns.some(checkIn => {
      const checkInTime = checkIn.timestamp.toDate();
      const hour = checkInTime.getHours();
      return hour < 12;
    });

    if (hasEarlyCheckIn) {
      console.log('🏅 [BadgeLogic] User eligible for Early Bird badge!');
      return true;
    }

    console.log('📝 [BadgeLogic] No check-ins before noon, skipping Early Bird badge');
    return false;
  }

  /**
   * Check if user should earn the "Night Owl" badge (check-in after 9 PM)
   */
  checkNightOwlBadge(context: BadgeTriggerContext): boolean {
    console.log('[BadgeLogic] Checking Night Owl badge', {
      userId: context.userId,
      checkInCount: context.userCheckIns.length
    });

    // Check if any check-ins were after 9 PM
    const hasLateCheckIn = context.userCheckIns.some(checkIn => {
      const checkInTime = checkIn.timestamp.toDate();
      const hour = checkInTime.getHours();
      return hour >= 21;
    });

    if (hasLateCheckIn) {
      console.log('🏅 [BadgeLogic] User eligible for Night Owl badge!');
      return true;
    }

    console.log('📝 [BadgeLogic] No check-ins after 9 PM, skipping Night Owl badge');
    return false;
  }

  /**
   * Check if user should earn the "Explorer" badge (5 different pubs)
   */
  checkExplorerBadge(context: BadgeTriggerContext): boolean {
    console.log('[BadgeLogic] Checking Explorer badge', {
      userId: context.userId,
      checkInCount: context.userCheckIns.length
    });

    // Count unique pubs the user has visited
    const uniquePubIds = new Set(context.userCheckIns.map(ci => ci.pubId));
    const uniquePubCount = uniquePubIds.size;

    console.log('📊 [BadgeLogic] Explorer analysis:', {
      totalCheckIns: context.userCheckIns.length,
      uniquePubs: uniquePubCount,
      pubIds: Array.from(uniquePubIds)
    });

    // User gets this badge when they've visited 5 different pubs
    const hasVisitedFivePubs = uniquePubCount >= 5;

    if (hasVisitedFivePubs) {
      // Check if they already have this badge - using correct ID
      const alreadyHasBadge = this._badgeStore.hasEarnedBadge('regional-champion');

      if (!alreadyHasBadge) {
        console.log('🏅 [BadgeLogic] User eligible for Explorer badge!');
        return true;
      } else {
        console.log('📝 [BadgeLogic] User already has Explorer badge');
      }
    } else {
      console.log(`📝 [BadgeLogic] User needs ${5 - uniquePubCount} more unique pubs for Explorer badge`);
    }

    return false;
  }

  /**
   * Main method to check all badge eligibility
   * Returns array of badge IDs the user should earn
   */
  evaluateAllBadges(context: BadgeTriggerContext): string[] {
    console.log('🔍 [BadgeLogic] Starting badge evaluation for user:', context.userId);

    const eligibleBadges: string[] = [];

    // Check each badge type - using the correct IDs from badge seed data
    if (this.checkFirstTimeBadge(context)) {
      eligibleBadges.push('first-timer');
    }

    if (this.checkRegularBadge(context)) {
      eligibleBadges.push('local-legend'); // 10 checkins qualifies as becoming a local legend
    }

    if (this.checkExplorerBadge(context)) {
      eligibleBadges.push('regional-champion'); // 5 different pubs qualifies as regional champion
    }

    if (this.checkEarlyBirdBadge(context)) {
      eligibleBadges.push('early-bird');
    }

    if (this.checkNightOwlBadge(context)) {
      eligibleBadges.push('night-owl');
    }

    // Future badges can be added here easily:
    // if (this.checkSocialiteBadge(context)) {
    //   eligibleBadges.push('socialite');
    // }

    console.log('🎯 [BadgeLogic] Badge evaluation complete:', {
      userId: context.userId,
      eligibleBadges,
      totalEligible: eligibleBadges.length
    });

    return eligibleBadges;
  }

  /**
   * Helper method to get debug info about badge logic
   */
  getDebugInfo(context: BadgeTriggerContext): object {
    const uniquePubs = new Set(context.userCheckIns.map(ci => ci.pubId));

    return {
      userId: context.userId,
      totalCheckIns: context.userCheckIns.length,
      uniquePubs: uniquePubs.size,
      currentBadges: context.userBadges.map(ub => ub.badgeId),
      badgeChecks: {
        firstTime: this.checkFirstTimeBadge(context),
        regular: this.checkRegularBadge(context),
        explorer: this.checkExplorerBadge(context),
        earlyBird: this.checkEarlyBirdBadge(context),
        nightOwl: this.checkNightOwlBadge(context)
      }
    };
  }
}
