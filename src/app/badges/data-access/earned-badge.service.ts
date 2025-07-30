// badges/data-access/earned-badge.service.ts
import { Injectable } from '@angular/core';
import { FirestoreService } from '@fourfold/angular-foundation';
import { where } from 'firebase/firestore';
import type { EarnedBadge } from '../utils/badge.model';

@Injectable({ providedIn: 'root' })
export class EarnedBadgeService extends FirestoreService {
  private readonly path = 'earnedBadges';

  /**
   * Get all earned badges for a specific user
   */
  async getEarnedBadgesForUser(userId: string): Promise<EarnedBadge[]> {
    console.log('[EarnedBadgeService] getEarnedBadgesForUser', userId);
    return this.getDocsWhere<EarnedBadge>(this.path, where('userId', '==', userId));
  }

  /**
   * Check if user has already earned a specific badge
   */
  async userHasBadge(userId: string, badgeId: string): Promise<boolean> {
    console.log('[EarnedBadgeService] userHasBadge', { userId, badgeId });
    const existing = await this.getDocsWhere<EarnedBadge>(
      this.path,
      where('userId', '==', userId),
      where('badgeId', '==', badgeId)
    );
    return existing.length > 0;
  }

  /**
   * Award a badge to a user (with duplicate protection)
   */
  async awardBadge(
    userId: string,
    badgeId: string,
    metadata?: Record<string, any>
  ): Promise<EarnedBadge> {
    console.log('[EarnedBadgeService] awardBadge', { userId, badgeId, metadata });

    // Check for duplicates
    const hasAlready = await this.userHasBadge(userId, badgeId);
    if (hasAlready) {
      throw new Error(`User ${userId} already has badge ${badgeId}`);
    }

    // Create the earned badge data
    const earnedBadgeData: Omit<EarnedBadge, 'id'> = {
      userId,
      badgeId,
      awardedAt: Date.now(),
      metadata: metadata || {},
    };

    // Add to Firestore and get the reference
    const docRef = await this.addDocToCollection(this.path, earnedBadgeData);

    // Return the complete earned badge with the generated ID
    const earnedBadge: EarnedBadge = {
      id: docRef.id,
      ...earnedBadgeData,
    };

    console.log(`🏅 Badge awarded: ${badgeId} to user ${userId}`);
    return earnedBadge;
  }

  /**
   * Get all earned badges (for admin/stats purposes)
   */
  async getAllEarnedBadges(): Promise<EarnedBadge[]> {
    console.log('[EarnedBadgeService] getAllEarnedBadges');
    return this.getDocsWhere<EarnedBadge>(this.path);
  }

  /**
   * Revoke a badge from a user (if needed for admin purposes)
   */
  async revokeBadge(userId: string, badgeId: string): Promise<void> {
    console.log('[EarnedBadgeService] revokeBadge', { userId, badgeId });

    const existing = await this.getDocsWhere<EarnedBadge>(
      this.path,
      where('userId', '==', userId),
      where('badgeId', '==', badgeId)
    );

    if (existing.length === 0) {
      throw new Error(`User ${userId} does not have badge ${badgeId}`);
    }

    // Delete the first match (should only be one anyway)
    await this.deleteDoc(`${this.path}/${existing[0].id}`);
    console.log(`🗑️ Badge revoked: ${badgeId} from user ${userId}`);
  }

  /**
   * Get earned badge counts by badge ID
   */
  async getBadgeAwardCounts(): Promise<Record<string, number>> {
    console.log('[EarnedBadgeService] getBadgeAwardCounts');
    const allEarned = await this.getAllEarnedBadges();

    return allEarned.reduce(
      (counts, earned) => {
        counts[earned.badgeId] = (counts[earned.badgeId] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );
  }
}
