// badges/data-access/badge-award.service.ts
import { Injectable, inject } from '@angular/core';
import { BadgeLogicService } from './badge-logic.service';
import { EarnedBadgeStore } from './earned-badge.store';
import type { CheckIn } from '../../check-in/util/check-in.model';
import type { BadgeTriggerContext, EarnedBadge } from '../utils/badge.model';

/**
 * Orchestrates badge evaluation and awarding after check-ins.
 * This is the main service that gets called from CheckInStore.
 */
@Injectable({ providedIn: 'root' })
export class BadgeAwardService {
  private readonly _badgeLogic = inject(BadgeLogicService);
  private readonly _earnedBadgeStore = inject(EarnedBadgeStore);

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

      // 3. Award each eligible badge
      const awardedBadges: EarnedBadge[] = [];

      for (const badgeId of eligibleBadgeIds) {
        try {
          console.log(`🏅 [BadgeAward] Attempting to award badge: ${badgeId}`);

          const earnedBadge = await this._earnedBadgeStore.awardBadge(badgeId, {
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
      console.error('💥 [BadgeAward] Badge evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Build the context object needed for badge evaluation
   */
  private buildTriggerContext(
    userId: string,
    newCheckIn: CheckIn,
    allUserCheckIns: CheckIn[]
  ): BadgeTriggerContext {
    console.log('📋 [BadgeAward] Building trigger context for user:', userId);

    // Get all user's current badges
    const userBadges = this._earnedBadgeStore.data();

    const context: BadgeTriggerContext = {
      userId,
      checkIn: newCheckIn,
      userCheckIns: allUserCheckIns,
      userBadges
    };

    console.log('📊 [BadgeAward] Context built:', {
      userId,
      totalCheckIns: allUserCheckIns.length,
      currentBadges: userBadges.length,
      newCheckInPub: newCheckIn.pubId
    });

    return context;
  }

  /**
   * Manual badge evaluation (for testing or admin purposes)
   */
  async evaluateBadgesForUser(userId: string, userCheckIns: CheckIn[]): Promise<string[]> {
    console.log('🔧 [BadgeAward] Manual badge evaluation for user:', userId);

    if (userCheckIns.length === 0) {
      console.log('📝 [BadgeAward] No check-ins found for user');
      return [];
    }

    const latestCheckIn = userCheckIns[userCheckIns.length - 1];
    const context = this.buildTriggerContext(userId, latestCheckIn, userCheckIns);

    return this._badgeLogic.evaluateAllBadges(context);
  }

  /**
   * Get debug information about badge evaluation
   */
  async getDebugInfo(userId: string, userCheckIns: CheckIn[]): Promise<object> {
    if (userCheckIns.length === 0) {
      return { error: 'No check-ins found for user' };
    }

    const latestCheckIn = userCheckIns[userCheckIns.length - 1];
    const context = this.buildTriggerContext(userId, latestCheckIn, userCheckIns);

    return {
      context,
      debugInfo: this._badgeLogic.getDebugInfo(context)
    };
  }
}
