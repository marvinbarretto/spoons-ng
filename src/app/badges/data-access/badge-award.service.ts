// src/app/badges/data-access/badge-award.service.ts
import { Injectable, inject } from '@angular/core';
import type { CheckIn } from '@check-in/utils/check-in.models';
import type { BadgeTriggerContext, EarnedBadgeWithDetails } from '../utils/badge.model';
import { BadgeLogicService } from './badge-logic.service';
import { BadgeStore } from './badge.store'; // ✅ Use unified BadgeStore

/**
 * Orchestrates badge evaluation and awarding after check-ins.
 * This is the main service that gets called from CheckInStore.
 */
@Injectable({ providedIn: 'root' })
export class BadgeAwardService {
  protected readonly _badgeLogic = inject(BadgeLogicService);
  protected readonly _badgeStore = inject(BadgeStore); // ✅ Use unified store

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
   * Returns enriched badge data including full badge definitions
   */
  async evaluateAndAwardBadges(
    userId: string,
    newCheckIn: CheckIn,
    allUserCheckIns: CheckIn[]
  ): Promise<EarnedBadgeWithDetails[]> {
    console.log('🎬 [BadgeAward] Starting badge evaluation process', {
      userId,
      newCheckInId: newCheckIn.id,
      pubId: newCheckIn.pubId,
    });

    try {
      // 0. Ensure badge definitions are loaded (force clear cache first)
      console.log('[BadgeAward] 🔄 Clearing badge definitions cache...');
      // Force clear the cache to ensure fresh data (defensive access)
      try {
        if (this._badgeStore['cacheService']) {
          this._badgeStore['cacheService'].clear('badge-definitions');
        }
        if (this._badgeStore['_definitionsLoaded'] !== undefined) {
          this._badgeStore['_definitionsLoaded'] = false;
        }
      } catch (error) {
        console.log('[BadgeAward] 📝 Cache clearing failed (likely in test environment):', error);
      }

      console.log('[BadgeAward] 🔄 Loading badge definitions...');
      await this._badgeStore.loadDefinitions();
      console.log(
        '[BadgeAward] ✅ Badge definitions load complete. Available badges:',
        this._badgeStore.definitions().length
      );

      // 1. Build the context with provided user data
      const context = this.buildTriggerContext(userId, newCheckIn, allUserCheckIns);

      // 2. Evaluate which badges should be awarded
      console.log('🔍 [BadgeAward] Evaluating badges with context:', {
        userId: context.userId,
        totalCheckIns: context.totalCheckIns,
        uniquePubs: new Set(context.userCheckIns.map(c => c.pubId)).size,
        currentBadges: context.userBadges.map(b => b.badgeId),
        lastCheckInPub: context.checkIn.pubId,
        checkInTime: new Date(context.checkIn.timestamp.toMillis()).toLocaleString(),
      });

      const eligibleBadgeIds = this._badgeLogic.evaluateAllBadges(context);

      console.log('🎯 [BadgeAward] Badge evaluation results:', {
        eligibleBadgeIds,
        totalEligible: eligibleBadgeIds.length,
        badgeDefinitionsAvailable: this._badgeStore.definitions().map(d => d.id),
      });

      if (eligibleBadgeIds.length === 0) {
        console.log('📝 [BadgeAward] No badges eligible for this check-in');
        return [];
      }

      // 3. Award each eligible badge using unified BadgeStore
      const awardedBadges: EarnedBadgeWithDetails[] = [];

      for (const badgeId of eligibleBadgeIds) {
        try {
          // Check if badge definition exists before awarding
          const badgeDefinition = this._badgeStore.definitions().find(d => d.id === badgeId);
          if (!badgeDefinition) {
            console.error(`❌ [BadgeAward] Badge definition not found for ID: ${badgeId}`);
            console.error(
              `Available badge IDs:`,
              this._badgeStore.definitions().map(d => d.id)
            );
            continue;
          }

          // Check if user already has this badge
          if (context.userBadges.some(b => b.badgeId === badgeId)) {
            console.log(`📝 [BadgeAward] User already has badge: ${badgeId}, skipping`);
            continue;
          }

          console.log(
            `🏅 [BadgeAward] Attempting to award badge: ${badgeId} (${badgeDefinition.name})`
          );

          const earnedBadge = await this._badgeStore.awardBadge(badgeId, {
            triggeredBy: 'check-in',
            checkInId: newCheckIn.id,
            pubId: newCheckIn.pubId,
            awardedAt: Date.now(),
          });

          // Return enriched badge data with full definition
          awardedBadges.push({
            earnedBadge,
            badge: badgeDefinition,
          });
          console.log(
            `✅ [BadgeAward] Successfully awarded badge: ${badgeId} (${badgeDefinition.name})`
          );
        } catch (error) {
          console.error(`❌ [BadgeAward] Failed to award badge ${badgeId}:`, error);
          // Continue with other badges even if one fails
        }
      }

      console.log('🎉 [BadgeAward] Badge evaluation complete!', {
        userId,
        totalAwarded: awardedBadges.length,
        awardedBadges: awardedBadges.map(b => ({
          badgeId: b.earnedBadge.badgeId,
          name: b.badge.name,
        })),
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
  async evaluateBadgesForUser(userId: string, allUserCheckIns: CheckIn[]): Promise<string[]> {
    console.log('🧪 [BadgeAward] Evaluating badges for user (test mode):', userId);

    try {
      // Use the most recent check-in as the trigger
      const mostRecentCheckIn = allUserCheckIns.sort(
        (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
      )[0];

      if (!mostRecentCheckIn) {
        console.log('📝 [BadgeAward] No check-ins found for user');
        return [];
      }

      const context = this.buildTriggerContext(userId, mostRecentCheckIn, allUserCheckIns);
      const eligibleBadgeIds = this._badgeLogic.evaluateAllBadges(context);

      console.log('🧪 [BadgeAward] Test evaluation complete:', {
        userId,
        eligibleBadges: eligibleBadgeIds,
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
      userBadgesLoaded: this._badgeStore.hasEarnedBadges(),
    };
  }
}
