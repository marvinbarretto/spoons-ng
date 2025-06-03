import { Component, computed, effect, inject, signal } from '@angular/core';
import { FeatureFlagPipe } from "../../../shared/utils/feature-flag.pipe";
import { PubStore } from '../../../pubs/data-access/pub.store';
import { UserStore } from '../../../users/data-access/user.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { MissionStore } from '../../../missions/data-access/mission.store';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-status',
  imports: [FeatureFlagPipe, RouterModule],
  templateUrl: './status.component.html',
  styleUrl: './status.component.scss'
})
export class StatusComponent {
  private readonly pubStore = inject(PubStore);
  private readonly userStore = inject(UserStore);
  private readonly checkinStore = inject(CheckinStore);
  private readonly missionStore = inject(MissionStore);
  private readonly router = inject(Router);

  // Signals
  readonly loading = this.pubStore.loading;
  readonly pubs = this.pubStore.pubs;
  readonly user = this.userStore.user;
  readonly totalcheckins = this.checkinStore.checkins;
  readonly totalPubs = signal(800); // TODO: pull from config later

  // Load on init
  constructor() {
    this.pubStore.loadOnce();

    effect(() => {
      const user = this.user();
      if (user) {
        this.checkinStore.loadOnceForUser(user.uid);
      }
    });
  }

  // === Derived signals ===

  readonly debugState = computed(() => ({
    user: this.userStore.user(),
    checkins: this.checkinStore.checkins(),
  }));


  // ✅ All check-ins fetched for the current user (raw array from Firestore)
readonly userCheckins = this.checkinStore.checkins;

// ✅ Number of check-ins (can include repeats to the same pub)
readonly totalCheckinsCount$$ = computed(() => this.userCheckins().length);

// ✅ Unique pubs the user has visited at least once
readonly uniqueVisitedPubsList$$ = computed(() => {
  const checkins = this.checkinStore.checkins();
  const pubs = this.pubStore.pubs();
  const user = this.userStore.user();

  console.log('[DEBUG] Signals triggered:', {
    user,
    checkinsCount: checkins.length,
    pubsCount: pubs.length,
  });

  if (!user || !checkins.length || !pubs.length) return [];

  const pubIds = new Set(checkins.map(c => c.pubId));
  return pubs.filter(pub => pubIds.has(pub.id));
});


readonly uniqueVisitedPubsCount$$ = computed(() => this.uniqueVisitedPubsList$$().length);


readonly landlordPubsList$$ = computed(() => {
  const pubs = this.pubStore.pubs();
  const user = this.userStore.user();
  const today = new Date().toISOString().split('T')[0];

  if (!user) return [];

  return pubs.filter(pub =>
    pub.todayLandlord?.userId === user.uid &&
    pub.todayLandlord?.claimedAt.toDate().toISOString().split('T')[0] === today
  );
});



readonly landlordPubsCount$$ = computed(() => this.landlordPubsList$$().length);




  // === Temporary mock badges & missions ===

  readonly badges = signal([
    { id: 'first-checkin', name: 'First Check-In', iconUrl: '/assets/icons/badges/first.svg' },
    { id: 'early-riser', name: 'Early Riser', iconUrl: '/assets/icons/badges/morning.svg' },
  ]);

  // readonly missions = signal([
  //   { id: 'herts-crawl', title: 'Hertfordshire Crawl', progress: 3, total: 7 },
  //   { id: 'royalty-run', title: 'Royalty Run', progress: 1, total: 4 },
  // ]);

  browseMissions() {
    this.router.navigate(['/missions']);
  }

  readonly joinedMissionIds$$ = computed(() =>
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
}

