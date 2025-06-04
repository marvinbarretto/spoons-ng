// status.component.ts
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FeatureFlagPipe } from "../../../shared/utils/feature-flag.pipe";
import { PubStore } from '../../../pubs/data-access/pub.store';
import { UserStore } from '../../../users/data-access/user.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { MissionStore } from '../../../missions/data-access/mission.store';
import { Router, RouterModule } from '@angular/router';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { toDate, isToday } from '../../../shared/utils/timestamp.utils';

@Component({
  selector: 'app-status',
  imports: [FeatureFlagPipe, RouterModule],
  templateUrl: './status.component.html',
  styleUrl: './status.component.scss'
})
export class StatusComponent extends BaseComponent {
  private readonly pubStore = inject(PubStore);
  private readonly userStore = inject(UserStore);
  private readonly checkinStore = inject(CheckinStore);
  private readonly missionStore = inject(MissionStore);
  private readonly router = inject(Router);

  // ✅ Core reactive data

  // TODO: Do we need this if we're already inherting it?
  override readonly loading = this.pubStore.loading;
  readonly pubs = this.pubStore.pubs;
  readonly user = this.userStore.user;
  readonly userCheckins = this.checkinStore.checkins;

  // ✅ Static totals (could be loaded from config later)
  readonly totalPubs = signal(800);

  /**
   * Count of unique pubs the user has visited
   * @returns Number of unique pubs checked into
   */
  readonly uniqueVisitedPubsCount = computed(() => {
    const checkins = this.userCheckins();
    if (!checkins.length) return 0;

    const uniquePubIds = new Set(checkins.map(c => c.pubId));
    return uniquePubIds.size;
  });

  /**
   * List of unique pubs the user has visited with full pub data
   * @returns Array of pub objects that user has checked into
   */
  readonly uniqueVisitedPubsList = computed(() => {
    const checkins = this.userCheckins();
    const allPubs = this.pubs();

    if (!checkins.length || !allPubs.length) return [];

    const visitedPubIds = new Set(checkins.map(c => c.pubId));
    return allPubs.filter(pub => visitedPubIds.has(pub.id));
  });

  /**
   * Progress percentage towards visiting all pubs
   * @returns Percentage (0-100) of pubs visited
   */
  readonly progressPercentage = computed(() => {
    const visited = this.uniqueVisitedPubsCount();
    const total = this.totalPubs();

    if (total === 0) return 0;
    return Math.round((visited / total) * 100);
  });

  /**
   * Total number of check-ins (including multiple visits to same pub)
   * @returns Total check-in count
   */
  readonly totalCheckinsCount = computed(() => this.userCheckins().length);

  /**
   * Check-ins made today
   * @returns Array of today's check-ins
   */
  readonly todayCheckins = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.userCheckins().filter(c => c.dateKey === today);
  });

  /**
   * Count of check-ins made today
   * @returns Number of today's check-ins
   */
  readonly todayCheckinsCount = computed(() => this.todayCheckins().length);

  /**
   * Most recent check-in pub name
   * @returns Name of last checked-in pub or null
   */
  readonly latestCheckinPub = computed(() => {
    const checkins = this.userCheckins();
    if (checkins.length === 0) return null;

    const latest = checkins.sort((a, b) =>
      b.timestamp.toMillis() - a.timestamp.toMillis()
    )[0];

    const pub = this.pubs().find(p => p.id === latest.pubId);
    return pub?.name || `Pub ID: ${latest.pubId}`;
  });

  // ✅ Landlord-related computed signals (existing logic)
  /**
   * List of pubs where current user is landlord today
   * @returns Array of pubs where user is today's landlord
   */
  readonly landlordPubsList = computed(() => {
    const pubs = this.pubStore.pubs();
    const user = this.userStore.user();

    if (!user) return [];

    return pubs.filter(pub => {
      if (!pub.todayLandlord?.userId || pub.todayLandlord.userId !== user.uid) {
        return false;
      }

      // ✅ Safe timestamp conversion using our utility
      const claimDate = toDate(pub.todayLandlord.claimedAt);
      return claimDate ? isToday(claimDate) : false;
    });
  });

  readonly landlordPubsCount = computed(() => this.landlordPubsList().length);

  // ✅ Mission progress (existing logic)
  readonly joinedMissionIds = computed(() =>
    this.userStore.user()?.joinedMissionIds ?? []
  );

  readonly joinedMissions = computed(() => {
    const user = this.userStore.user();
    const allMissions = this.missionStore.missions();

    if (!user) return [];

    const joinedIds = user.joinedMissionIds ?? [];
    return allMissions
      .filter(m => joinedIds.includes(m.id))
      .map(m => ({
        ...m,
        progress: m.pubIds.filter(id => user.checkedInPubIds.includes(id)).length,
        total: m.pubIds.length,
      }));
  });

  // ✅ Badges (existing mock logic)
  readonly badges = signal([
    { id: 'first-checkin', name: 'First Check-In', iconUrl: '/assets/icons/badges/first.svg' },
    { id: 'early-riser', name: 'Early Riser', iconUrl: '/assets/icons/badges/morning.svg' },
  ]);

  // ✅ Load data on init - using BaseComponent pattern
  protected override onInit(): void {
    this.pubStore.loadOnce();

    effect(() => {
      const user = this.user();
      if (user) {
        this.checkinStore.loadOnceForUser(user.uid);
      }
    });
  }

  /**
   * Navigate to missions page
   */
  browseMissions(): void {
    this.router.navigate(['/missions']);
  }
}
