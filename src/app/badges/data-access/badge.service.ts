// /badges/data-access/badge.service.ts
import { Injectable } from '@angular/core';
import type { Badge } from '../utils/badge.model';
import { FirestoreService } from '../../shared/data-access/firestore.service';

@Injectable({ providedIn: 'root' })
export class BadgeService extends FirestoreService {
  private readonly BADGES_PATH = 'badges';
  private readonly USER_BADGES_PATH = (userId: string) => `users/${userId}/badges`;

  /**
   * Fetch all badge definitions (for display or admin UI).
   */
  getAllBadges(): Promise<Badge[]> {
    return this.getDocsWhere<Badge>(this.BADGES_PATH); // definitions (e.g. badge catalog)
  }

  /**
   * Fetch awarded badges for a user.
   */
  getUserBadges(userId: string): Promise<Badge[]> {
    return this.getDocsWhere<Badge>(this.USER_BADGES_PATH(userId));
  }

  /**
   * Award a badge to a user (if not already awarded).
   */
  async awardBadgeToUser(userId: string, badge: Badge): Promise<void> {
    const badgePath = `${this.USER_BADGES_PATH(userId)}/${badge.id}`;
    const alreadyExists = await this.exists(badgePath);
    if (alreadyExists) return;

    await this.setDoc(badgePath, {
      ...badge,
      awardedAt: Date.now(),
    });
  }

  /**
   * Revoke a badge (e.g. for testing).
   */
  revokeBadgeFromUser(userId: string, badgeId: string): Promise<void> {
    return this.deleteDoc(`${this.USER_BADGES_PATH(userId)}/${badgeId}`);
  }
}
