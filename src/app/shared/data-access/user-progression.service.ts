// src/app/shared/data-access/user-progression.service.ts
import { CheckInStore } from '@/app/check-in/data-access/check-in.store';
import { Injectable, Signal, computed, inject } from '@angular/core';
import type {
  UserExperienceLevel,
  UserExperienceLevelUIFlags,
  UserMilestone,
  UserProgressionStats,
} from '@shared/utils/user-progression.models';
import { UserStore } from '@users/data-access/user.store';

@Injectable({ providedIn: 'root' })
export class UserProgressionService {
  private readonly userStore = inject(UserStore);
  private readonly checkinStore = inject(CheckInStore);

  // ✅ Helper: Get user's total check-ins count
  readonly totalCheckinsCount = computed(() => {
    const user = this.userStore.user();
    if (!user) return 0;

    const allCheckins = this.checkinStore.checkins();
    return allCheckins.filter(c => c.userId === user.uid).length;
  });

  // ✅ Helper: Get unique pubs visited count (for display purposes only)
  readonly uniquePubsVisited = computed(() => {
    const user = this.userStore.user();
    if (!user) return 0;

    const allCheckins = this.checkinStore.checkins();
    const userCheckins = allCheckins.filter(c => c.userId === user.uid);
    const uniquePubIds = new Set(userCheckins.map(c => c.pubId));
    return uniquePubIds.size;
  });

  // ✅ User Experience Stage Classification (simplified)
  readonly userExperienceLevel = computed(() => {
    const checkinCount = this.totalCheckinsCount();
    const user = this.userStore.user();

    if (!user) return 'guest';

    // Brand new anonymous users
    if (user.isAnonymous && checkinCount === 0) return 'brandNew';

    // First-time experience (0-2 check-ins)
    if (checkinCount <= 2) return 'firstTime';

    // Early adopter (3-9 check-ins)
    if (checkinCount <= 9) return 'earlyUser';

    // Regular user (10-24 check-ins)
    if (checkinCount <= 24) return 'regularUser';

    // Power user (25+ check-ins)
    return 'powerUser';
  }) as Signal<UserExperienceLevel>;

  // ✅ Specific stage checkers
  readonly isBrandNewUser = computed(() => this.userExperienceLevel() === 'brandNew');
  readonly isFirstTimeUser = computed(() => this.userExperienceLevel() === 'firstTime');
  readonly isEarlyUser = computed(() => this.userExperienceLevel() === 'earlyUser');
  readonly isRegularUser = computed(() => this.userExperienceLevel() === 'regularUser');
  readonly isPowerUser = computed(() => this.userExperienceLevel() === 'powerUser');

  // ✅ UI-specific computed signals
  readonly shouldShowWelcomeFlow = computed(() => this.isBrandNewUser() || this.isFirstTimeUser());

  readonly shouldShowBadges = computed(() => this.userStore.hasBadges() && !this.isBrandNewUser());

  readonly shouldShowProgressFeatures = computed(() => !this.isBrandNewUser());

  readonly shouldShowAdvancedFeatures = computed(() => this.isPowerUser());

  // ✅ Contextual messaging
  readonly stageMessage = computed(() => {
    const stage = this.userExperienceLevel();
    const checkins = this.totalCheckinsCount();
    const uniquePubs = this.uniquePubsVisited();

    switch (stage) {
      case 'brandNew':
        return 'Welcome! Find a nearby pub to start your journey';
      case 'firstTime':
        return `Great start! You've checked in ${checkins} time${checkins > 1 ? 's' : ''}`;
      case 'earlyUser':
        return `You're getting the hang of this! ${checkins} check-ins and counting`;
      case 'regularUser':
        return `Pub regular! ${uniquePubs} different pubs discovered`;
      case 'powerUser':
        return `Pub legend! ${checkins} check-ins at ${uniquePubs} different locations`;
      default:
        return 'Start your pub adventure';
    }
  });

  // ✅ Next milestone logic (simplified)
  readonly nextMilestone = computed((): UserMilestone => {
    const checkins = this.totalCheckinsCount();

    if (checkins === 0)
      return { target: 1, type: 'first-checkin', description: 'your first check-in' };
    if (checkins < 3) return { target: 3, type: 'early-user', description: 'early adopter status' };
    if (checkins < 10) return { target: 10, type: 'regular', description: 'regular user badge' };
    if (checkins < 25)
      return { target: 25, type: 'power-user', description: 'power user achievement' };

    // For power users, focus on next milestone (50, 75, 100, etc.)
    const nextRoundNumber = Math.ceil(checkins / 25) * 25;
    return {
      target: nextRoundNumber,
      type: 'milestone',
      description: `${nextRoundNumber} total check-ins`,
    };
  });

  readonly checkinsToNextMilestone = computed(() => {
    const milestone = this.nextMilestone();
    const current = this.totalCheckinsCount();

    return Math.max(0, milestone.target - current);
  });

  // ✅ Complete progression stats for components
  readonly progressionStats = computed(
    (): UserProgressionStats => ({
      stage: this.userExperienceLevel(),
      totalCheckins: this.totalCheckinsCount(),
      uniquePubs: this.uniquePubsVisited(),
      nextMilestone: this.nextMilestone(),
      checkinsToNextMilestone: this.checkinsToNextMilestone(),
      stageMessage: this.stageMessage(),
    })
  );

  // ✅ UI flags for components
  readonly uiFlags = computed(
    (): UserExperienceLevelUIFlags => ({
      shouldShowWelcomeFlow: this.shouldShowWelcomeFlow(),
      shouldShowBadges: this.shouldShowBadges(),
      shouldShowProgressFeatures: this.shouldShowProgressFeatures(),
      shouldShowAdvancedFeatures: this.shouldShowAdvancedFeatures(),
    })
  );
}
