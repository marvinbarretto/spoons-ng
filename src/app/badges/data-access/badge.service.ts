import { Injectable } from '@angular/core';
import { FirestoreCrudService } from '@shared/data-access/firestore-crud.service';
import type { Badge, EarnedBadge, CreateEarnedBadge } from '../utils/badge.model';

@Injectable({ providedIn: 'root' })
export class BadgeService extends FirestoreCrudService<Badge> {
  protected override path = 'badges';

  /**
   * ✅ Get all badge definitions (uses inherited getAll method)
   */
  getBadgeDefinitions(): Promise<Badge[]> {
    console.log('[BadgeService] getBadgeDefinitions');
    return this.getAll();
  }

  /**
   * ✅ Create a new badge definition (uses inherited create method)
   */
  createBadgeDefinition(badge: Badge): Promise<void> {
    console.log('[BadgeService] Creating badge definition:', badge.name);
    return this.create(badge);
  }

  /**
   * ✅ Update badge definition (uses inherited update method)
   */
  updateBadgeDefinition(badge: Badge): Promise<void> {
    console.log('[BadgeService] Updating badge definition:', badge.id);
    return this.update(badge.id, badge);
  }

  /**
   * ✅ Delete badge definition (uses inherited delete method)
   */
  deleteBadgeDefinition(badgeId: string): Promise<void> {
    console.log('[BadgeService] Deleting badge definition:', badgeId);
    return this.delete(badgeId);
  }

  /**
   * ✅ Get a single badge definition by ID
   */
  async getBadgeDefinition(badgeId: string): Promise<Badge | null> {
    console.log('[BadgeService] Getting badge definition:', badgeId);
    const badgePath = `${this.path}/${badgeId}`;
    const badge = await this.getDocByPath<Badge>(badgePath);
    return badge || null;
  }

  // ===================================
  // 🏆 USER EARNED BADGES METHODS
  // ===================================

  /**
   * ✅ Get all badges earned by a specific user
   */
  async getUserBadges(userId: string): Promise<EarnedBadge[]> {
    console.log('[BadgeService] getUserBadges for:', userId);
    const userBadgesPath = `users/${userId}/badges`;

    try {
      const earnedBadges = await this.getDocsWhere<EarnedBadge>(userBadgesPath);
      console.log(`[BadgeService] Found ${earnedBadges.length} badges for user ${userId}`);
      return earnedBadges;
    } catch (error) {
      console.error('[BadgeService] Error loading user badges:', error);
      return [];
    }
  }

  /**
   * ✅ Award a badge to a user (creates EarnedBadge record)
   */
  async awardBadgeToUser(
    userId: string,
    badgeId: string,
    metadata?: Record<string, any>
  ): Promise<EarnedBadge> {
    console.log('[BadgeService] Awarding badge:', { userId, badgeId });

    // Check if user already has this badge
    const hasAlready = await this.userHasBadge(userId, badgeId);
    if (hasAlready) {
      throw new Error(`User ${userId} already has badge ${badgeId}`);
    }

    // Create the earned badge record
    const earnedBadge: EarnedBadge = {
      id: crypto.randomUUID(),
      userId,
      badgeId,
      awardedAt: Date.now(),
      metadata,
    };

    // Save to user's badges subcollection
    const badgePath = `users/${userId}/badges/${earnedBadge.id}`;
    await this.setDoc<EarnedBadge>(badgePath, earnedBadge);

    console.log(`[BadgeService] ✅ Awarded badge ${badgeId} to user ${userId}`);
    return earnedBadge;
  }

  /**
   * ✅ Check if user already has a specific badge (using FirestoreService methods)
   */
  async userHasBadge(userId: string, badgeId: string): Promise<boolean> {
    console.log('[BadgeService] Checking if user has badge:', { userId, badgeId });

    const userBadgesPath = `users/${userId}/badges`;

    try {
      // ✅ Use FirestoreService's getDocsWhere without importing Firebase directly
      const existingBadges = await this.getDocsWhere<EarnedBadge>(userBadgesPath);

      // Filter in memory instead of using Firebase where clause
      const hasBadge = existingBadges.some(badge => badge.badgeId === badgeId);

      console.log(`[BadgeService] User ${userId} ${hasBadge ? 'has' : 'does not have'} badge ${badgeId}`);
      return hasBadge;
    } catch (error) {
      console.error('[BadgeService] Error checking user badge:', error);
      return false;
    }
  }

  /**
   * ✅ Get a specific earned badge by user and badge ID
   */
  async getUserBadge(userId: string, badgeId: string): Promise<EarnedBadge | null> {
    console.log('[BadgeService] Getting user badge:', { userId, badgeId });

    const userBadgesPath = `users/${userId}/badges`;

    try {
      const badges = await this.getDocsWhere<EarnedBadge>(userBadgesPath);

      // Filter in memory
      const badge = badges.find(b => b.badgeId === badgeId);
      return badge || null;
    } catch (error) {
      console.error('[BadgeService] Error getting user badge:', error);
      return null;
    }
  }

  /**
   * ✅ Revoke a badge from a user (delete earned badge record)
   */
  async revokeBadgeFromUser(userId: string, earnedBadgeId: string): Promise<void> {
    console.log('[BadgeService] Revoking badge:', { userId, earnedBadgeId });

    const badgePath = `users/${userId}/badges/${earnedBadgeId}`;

    try {
      await this.deleteDoc(badgePath);
      console.log(`[BadgeService] ✅ Revoked badge ${earnedBadgeId} from user ${userId}`);
    } catch (error) {
      console.error('[BadgeService] Error revoking badge:', error);
      throw error;
    }
  }

  /**
   * ✅ Get recent badges for a user (sorted by awardedAt)
   */
  async getRecentUserBadges(userId: string, limit: number = 5): Promise<EarnedBadge[]> {
    console.log('[BadgeService] Getting recent user badges:', { userId, limit });

    const allBadges = await this.getUserBadges(userId);

    return allBadges
      .sort((a, b) => b.awardedAt - a.awardedAt) // Most recent first
      .slice(0, limit);
  }

  /**
   * ✅ Get badge statistics for a user
   */
  async getUserBadgeStats(userId: string): Promise<{
    totalBadges: number;
    recentBadges: EarnedBadge[];
    badgesByCategory: Record<string, number>;
  }> {
    console.log('[BadgeService] Getting user badge stats:', userId);

    const [userBadges, badgeDefinitions] = await Promise.all([
      this.getUserBadges(userId),
      this.getBadgeDefinitions(),
    ]);

    // Count badges by category
    const badgesByCategory: Record<string, number> = {};

    for (const earnedBadge of userBadges) {
      const definition = badgeDefinitions.find(def => def.id === earnedBadge.badgeId);
      const category = definition?.category || 'uncategorized';
      badgesByCategory[category] = (badgesByCategory[category] || 0) + 1;
    }

    return {
      totalBadges: userBadges.length,
      recentBadges: userBadges
        .sort((a, b) => b.awardedAt - a.awardedAt)
        .slice(0, 3),
      badgesByCategory,
    };
  }

  /**
   * ✅ Batch award multiple badges to a user
   */
  async awardMultipleBadges(
    userId: string,
    badgeIds: string[],
    metadata?: Record<string, any>
  ): Promise<EarnedBadge[]> {
    console.log('[BadgeService] Awarding multiple badges:', { userId, badgeIds });

    const awardedBadges: EarnedBadge[] = [];

    for (const badgeId of badgeIds) {
      try {
        const earnedBadge = await this.awardBadgeToUser(userId, badgeId, metadata);
        awardedBadges.push(earnedBadge);
      } catch (error) {
        console.warn(`[BadgeService] Failed to award badge ${badgeId}:`, error);
        // Continue with other badges
      }
    }

    return awardedBadges;
  }

  /**
   * ✅ Check if a badge definition exists
   */
  async badgeDefinitionExists(badgeId: string): Promise<boolean> {
    const badgePath = `${this.path}/${badgeId}`;
    return this.exists(badgePath);
  }
}
