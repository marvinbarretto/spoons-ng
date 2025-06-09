// /badges/data-access/badge.service.ts
import { Injectable } from '@angular/core';
import type { Badge } from '../utils/badge.model';
import { FirestoreCrudService } from '../../shared/data-access/firestore-crud.service';

type UserBadge = Badge & { awardedAt: number };

@Injectable({ providedIn: 'root' })
export class BadgeService extends FirestoreCrudService<Badge> {
  protected override path = 'badges';

  private readonly USER_BADGES_PATH = (userId: string) => `users/${userId}/badges`;

  /**
   * Fetch all badge definitions from the global badge catalog.
   */
  getBadgeDefinitions(): Promise<Badge[]> {
    console.log('[BadgeService] getBadgeDefinitions', this.path);
    return this.getAll(); // use inherited method that uses `path`
  }

  /**
   * Fetch all badges awarded to a specific user.
   */
  getAwardedBadgesForUser(userId: string): Promise<UserBadge[]> {
    return this.getDocsWhere<UserBadge>(this.USER_BADGES_PATH(userId));
  }

  /**
   * Award a badge to a user (noop if already awarded).
   */
  async awardBadgeToUser(userId: string, badge: Badge): Promise<void> {
    const badgePath = `${this.USER_BADGES_PATH(userId)}/${badge.id}`;
    const alreadyAwarded = await this.exists(badgePath);
    if (alreadyAwarded) {
      console.log(`[BadgeService] User ${userId} already has badge ${badge.id}`);
      return;
    }

    const userBadge: UserBadge = {
      ...badge,
      awardedAt: Date.now(),
    };

    await this.setDoc<UserBadge>(badgePath, userBadge);
    console.log(`[BadgeService] Awarded badge ${badge.id} to user ${userId}`);
  }

  /**
   * Revoke a previously awarded badge from a user.
   */
  async revokeBadgeFromUser(userId: string, badgeId: string): Promise<void> {
    const badgePath = `${this.USER_BADGES_PATH(userId)}/${badgeId}`;
    await this.deleteDoc(badgePath);
    console.log(`[BadgeService] Revoked badge ${badgeId} from user ${userId}`);
  }
}
