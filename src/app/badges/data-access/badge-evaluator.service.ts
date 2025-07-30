import { Injectable } from '@angular/core';
import { FirestoreService } from '@fourfold/angular-foundation';
import { where } from 'firebase/firestore';

type Checkin = {
  userId: string;
  pubId: string;
  timestamp: number;
};

type UserBadge = {
  userId: string;
  badgeId: string;
  awardedAt: number;
};

@Injectable({ providedIn: 'root' })
export class BadgeEvaluatorService extends FirestoreService {
  async evaluateAll(userId: string): Promise<void> {
    const checkins = await this.getDocsWhere<Checkin>('checkins', where('userId', '==', userId));

    if (checkins.length === 1) {
      await this.awardBadge(userId, 'first-checkin');
    }

    // Add more badge logic here...
  }

  private async awardBadge(userId: string, badgeId: string): Promise<void> {
    const badgePath = `userBadges/${userId}_${badgeId}`;
    const alreadyAwarded = await this.exists(badgePath);

    if (!alreadyAwarded) {
      const badge: UserBadge = {
        userId,
        badgeId,
        awardedAt: Date.now(),
      };
      await this.setDoc(badgePath, badge);
      console.log(`🏅 Badge awarded: ${badgeId} to ${userId}`);
    } else {
      console.log(`⏩ Badge ${badgeId} already awarded to ${userId}`);
    }
  }
}
