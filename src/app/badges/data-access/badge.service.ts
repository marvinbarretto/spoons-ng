// src/app/badges/data-access/badge.service.ts
import { Injectable } from '@angular/core';
import { orderBy, where } from '@angular/fire/firestore';
import { FirestoreCrudService } from '@fourfold/angular-foundation';
import type { UserBadgeSummary } from '../../users/utils/user.model';
import type { Badge, EarnedBadge } from '../utils/badge.model';

@Injectable({ providedIn: 'root' })
export class BadgeService extends FirestoreCrudService<Badge> {
  // ✅ Set the path for badge definitions
  protected path = 'badges';

  // ===================================
  // CLEAN BADGE DEFINITION METHODS
  // ===================================

  async getBadges(): Promise<Badge[]> {
    console.log('[BadgeService] getBadges - fetching from badges collection');
    const badges = await this.getAll();
    console.log('[BadgeService] getBadges result:', badges.length, 'badges found');
    console.log(
      '[BadgeService] Badge IDs:',
      badges.map(b => b.id)
    );
    return badges;
  }

  async getBadge(badgeId: string): Promise<Badge | null> {
    console.log('[BadgeService] getBadge:', badgeId);
    return this.getById(badgeId);
  }

  async createBadge(badge: Badge): Promise<void> {
    console.log('[BadgeService] createBadge:', badge);
    await this.create(badge);
  }

  async updateBadge(badgeId: string, updates: Partial<Badge>): Promise<void> {
    console.log('[BadgeService] updateBadge:', badgeId, updates);
    await this.update(badgeId, updates);
  }

  async deleteBadge(badgeId: string): Promise<void> {
    console.log('[BadgeService] deleteBadge:', badgeId);
    await this.delete(badgeId);
  }

  // ===================================
  // BACKWARD COMPATIBILITY (if needed)
  // ===================================

  getBadgeDefinitions = this.getBadges;
  getBadgeDefinition = this.getBadge;
  createBadgeDefinition = this.createBadge;
  updateBadgeDefinition = this.updateBadge;
  deleteBadgeDefinition = this.deleteBadge;

  // ===================================
  // EARNED BADGES (separate collection)
  // ===================================

  async getEarnedBadgesForUser(userId: string): Promise<EarnedBadge[]> {
    console.log('[BadgeService] getEarnedBadgesForUser:', userId);

    const badges = await this.getDocsWhere<EarnedBadge>(
      'earnedBadges',
      where('userId', '==', userId),
      orderBy('awardedAt', 'desc')
    );

    return badges;
  }

  async awardBadge(
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
      metadata: metadata || {},
    };

    await this.setDoc(`earnedBadges/${earnedBadge.id}`, earnedBadge);

    console.log(`[BadgeService] ✅ Awarded badge ${badgeId} to user ${userId}`);
    return earnedBadge;
  }

  async userHasBadge(userId: string, badgeId: string): Promise<boolean> {
    console.log('[BadgeService] Checking if user has badge:', { userId, badgeId });

    try {
      const existingBadges = await this.getDocsWhere<EarnedBadge>(
        'earnedBadges',
        where('userId', '==', userId),
        where('badgeId', '==', badgeId)
      );

      const hasBadge = existingBadges.length > 0;
      console.log(
        `[BadgeService] User ${userId} ${hasBadge ? 'has' : 'does not have'} badge ${badgeId}`
      );
      return hasBadge;
    } catch (error) {
      console.error('[BadgeService] Error checking user badge:', error);
      return false;
    }
  }

  async revokeBadge(userId: string, badgeId: string): Promise<void> {
    console.log('[BadgeService] revokeBadge', { userId, badgeId });

    const existing = await this.getDocsWhere<EarnedBadge>(
      'earnedBadges',
      where('userId', '==', userId),
      where('badgeId', '==', badgeId)
    );

    if (existing.length === 0) {
      throw new Error(`User ${userId} does not have badge ${badgeId}`);
    }

    await this.deleteDoc(`earnedBadges/${existing[0].id}`);
    console.log(`[BadgeService] 🗑️ Badge revoked: ${badgeId} from user ${userId}`);
  }

  // ===================================
  // USER SUMMARY UPDATES
  // ===================================

  async updateUserBadgeSummary(userId: string, summary: UserBadgeSummary): Promise<void> {
    console.log('[BadgeService] Updating user badge summary:', { userId, summary });
    await this.updateDoc(`users/${userId}`, summary);
  }

  // ===================================
  // ADMIN/STATS METHODS
  // ===================================

  async getAllEarnedBadges(): Promise<EarnedBadge[]> {
    console.log('[BadgeService] getAllEarnedBadges');
    const badges = await this.getDocsWhere<EarnedBadge>(
      'earnedBadges',
      orderBy('awardedAt', 'desc')
    );
    return badges;
  }

  async getBadgeAwardCounts(): Promise<Record<string, number>> {
    console.log('[BadgeService] getBadgeAwardCounts');
    const allEarned = await this.getAllEarnedBadges();

    return allEarned.reduce(
      (counts, earned) => {
        counts[earned.badgeId] = (counts[earned.badgeId] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );
  }

  async getEarnedBadgesForUserSince(userId: string, timestamp: number): Promise<EarnedBadge[]> {
    console.log('[BadgeService] getEarnedBadgesForUserSince:', { userId, timestamp });

    const badges = await this.getDocsWhere<EarnedBadge>(
      'earnedBadges',
      where('userId', '==', userId),
      where('awardedAt', '>=', timestamp),
      orderBy('awardedAt', 'desc')
    );

    return badges;
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  async getBadgeByName(name: string): Promise<Badge | null> {
    console.log('[BadgeService] getBadgeByName:', name);

    const badges = await this.getDocsWhere<Badge>('badges', where('name', '==', name));

    return badges.length > 0 ? badges[0] : null;
  }

  async getEarnedBadgesByBadgeId(badgeId: string): Promise<EarnedBadge[]> {
    console.log('[BadgeService] getEarnedBadgesByBadgeId:', badgeId);

    const badges = await this.getDocsWhere<EarnedBadge>(
      'earnedBadges',
      where('badgeId', '==', badgeId),
      orderBy('awardedAt', 'desc')
    );

    return badges;
  }

  async getUsersWithBadge(badgeId: string): Promise<string[]> {
    console.log('[BadgeService] getUsersWithBadge:', badgeId);

    const earnedBadges = await this.getDocsWhere<EarnedBadge>(
      'earnedBadges',
      where('badgeId', '==', badgeId)
    );

    // Return unique user IDs
    const userIds = [...new Set(earnedBadges.map(badge => badge.userId))];
    return userIds;
  }

  async getBadgeLeaderboard(badgeId: string, limit: number = 10): Promise<EarnedBadge[]> {
    console.log('[BadgeService] getBadgeLeaderboard:', { badgeId, limit });

    const badges = await this.getDocsWhere<EarnedBadge>(
      'earnedBadges',
      where('badgeId', '==', badgeId),
      orderBy('awardedAt', 'asc') // Earliest first for "first to earn" leaderboard
    );

    return badges.slice(0, limit);
  }
}
