// src/app/badges/data-access/badge-award.service.ts
import { Injectable, inject } from '@angular/core';
import { BadgeLogicService } from './badge-logic.service';
import { BadgeStore } from './badge.store'; // ✅ Use unified BadgeStore
import type { CheckIn } from '@check-in/utils/check-in.models';
import type { BadgeTriggerContext, EarnedBadge } from '../utils/badge.model';

/**
 * Orchestrates badge evaluation and awarding after check-ins.
 * This is the main service that gets called from CheckInStore.
 */
@Injectable({ providedIn: 'root' })
export class BadgeAwardService {
  private readonly _badgeLogic = inject(BadgeLogicService);
  private readonly _badgeStore = inject(BadgeStore); // ✅ Use unified store

/**
 * Simplified badge checking for new check-in flow
 * @param userId - User to check badges for
 * @returns Array of newly awarded badge IDs (for success overlay)
 */
async checkAndAwardBadges(userId: string): Promise<string[]> {
  console.log('[BadgeAwardService] 🏅 Checking badges for user:', userId);

  try {
    // For now, just return empty array
    // TODO: Implement actual badge logic when ready
    console.log('[BadgeAwardService] 📝 Badge checking complete (stub implementation)');
    return [];

    /* Future implementation:
    // 1. Get user's check-ins from store
    const checkIns = this._checkInStore.getUserCheckIns(userId);

    // 2. Get user's current badges
    const currentBadges = this._badgeStore.getUserBadges(userId);

    // 3. Build context
    const context = {
      userId,
      checkIns,
      currentBadges,
      totalCheckIns: checkIns.length,
      uniquePubs: new Set(checkIns.map(c => c.pubId)).size
    };

    // 4. Evaluate eligible badges
    const eligibleBadgeIds = this._badgeLogic.evaluateSimple(context);

    // 5. Award new badges
    const awardedBadgeIds: string[] = [];
    for (const badgeId of eligibleBadgeIds) {
      if (!currentBadges.some(b => b.badgeId === badgeId)) {
        await this._badgeStore.awardBadge(badgeId, { userId });
        awardedBadgeIds.push(badgeId);
      }
    }

    console.log('[BadgeAwardService] ✅ Awarded badges:', awardedBadgeIds);
    return awardedBadgeIds;
    */

  } catch (error) {
    console.error('[BadgeAwardService] ❌ Error checking badges:', error);
    return []; // Don't let badge errors break check-in flow
  }
}


  /**
   * Main entry point: evaluate and award badges after a check-in
   */
  async evaluateAndAwardBadges(
    userId: string,
    newCheckIn: CheckIn,
    allUserCheckIns: CheckIn[]
  ): Promise<EarnedBadge[]> {
    console.log('🎬 [BadgeAward] Starting badge evaluation process', {
      userId,
      newCheckInId: newCheckIn.id,
      pubId: newCheckIn.pubId
    });

    try {
      // 1. Build the context with provided user data
      const context = this.buildTriggerContext(userId, newCheckIn, allUserCheckIns);

      // 2. Evaluate which badges should be awarded
      const eligibleBadgeIds = this._badgeLogic.evaluateAllBadges(context);

      if (eligibleBadgeIds.length === 0) {
        console.log('📝 [BadgeAward] No badges eligible for this check-in');
        return [];
      }

      // 3. Award each eligible badge using unified BadgeStore
      const awardedBadges: EarnedBadge[] = [];

      for (const badgeId of eligibleBadgeIds) {
        try {
          console.log(`🏅 [BadgeAward] Attempting to award badge: ${badgeId}`);

          const earnedBadge = await this._badgeStore.awardBadge(badgeId, {
            triggeredBy: 'check-in',
            checkInId: newCheckIn.id,
            pubId: newCheckIn.pubId,
            awardedAt: Date.now()
          });

          awardedBadges.push(earnedBadge);
          console.log(`✅ [BadgeAward] Successfully awarded badge: ${badgeId}`);

        } catch (error) {
          console.error(`❌ [BadgeAward] Failed to award badge ${badgeId}:`, error);
          // Continue with other badges even if one fails
        }
      }

      console.log('🎉 [BadgeAward] Badge evaluation complete!', {
        userId,
        totalAwarded: awardedBadges.length,
        awardedBadges: awardedBadges.map(b => b.badgeId)
      });

      return awardedBadges;
    } catch (error) {
      console.error('❌ [BadgeAward] Badge evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate badges for a user without awarding (for testing/preview)
   */
  async evaluateBadgesForUser(
    userId: string,
    allUserCheckIns: CheckIn[]
  ): Promise<string[]> {
    console.log('🧪 [BadgeAward] Evaluating badges for user (test mode):', userId);

    try {
      // Use the most recent check-in as the trigger
      const mostRecentCheckIn = allUserCheckIns
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0];

      if (!mostRecentCheckIn) {
        console.log('📝 [BadgeAward] No check-ins found for user');
        return [];
      }

      const context = this.buildTriggerContext(userId, mostRecentCheckIn, allUserCheckIns);
      const eligibleBadgeIds = this._badgeLogic.evaluateAllBadges(context);

      console.log('🧪 [BadgeAward] Test evaluation complete:', {
        userId,
        eligibleBadges: eligibleBadgeIds
      });

      return eligibleBadgeIds;
    } catch (error) {
      console.error('❌ [BadgeAward] Test evaluation failed:', error);
      return [];
    }
  }

  /**
   * Build the context object for badge evaluation
   */
  private buildTriggerContext(
    userId: string,
    newCheckIn: CheckIn,
    allUserCheckIns: CheckIn[]
  ): BadgeTriggerContext {
    console.log('📋 [BadgeAward] Building trigger context for user:', userId);

    // Get current badges from unified BadgeStore
    const currentBadges = this._badgeStore.earnedBadges();

    const context: BadgeTriggerContext = {
      userId,
      totalCheckIns: allUserCheckIns.length,
     userBadges: currentBadges,
     userCheckIns: allUserCheckIns,
     checkIn: newCheckIn,
      // Add more context as needed for badge logic
    };

    console.log('📊 [BadgeAward] Context built:', context);
    return context;
  }

  /**
   * Get debug information about badge evaluation
   */
  getDebugInfo(): {
    badgeLogicAvailable: boolean;
    badgeStoreAvailable: boolean;
    definitionsLoaded: boolean;
    userBadgesLoaded: boolean;
  } {
    return {
      badgeLogicAvailable: !!this._badgeLogic,
      badgeStoreAvailable: !!this._badgeStore,
      definitionsLoaded: this._badgeStore.definitions().length > 0,
      userBadgesLoaded: this._badgeStore.hasEarnedBadges()
    };
  }
}
