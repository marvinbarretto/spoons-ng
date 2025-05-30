import { Component, computed, effect, inject, signal } from '@angular/core';
import { FeatureFlagPipe } from "../../../shared/utils/feature-flag.pipe";
import { PubStore } from '../../../pubs/data-access/pub.store';
import { UserStore } from '../../../users/data-access/user.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { User } from '../../../users/utils/user.model';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-status',
  imports: [FeatureFlagPipe, JsonPipe],
  templateUrl: './status.component.html',
  styleUrl: './status.component.scss'
})
export class StatusComponent {
  private readonly pubStore = inject(PubStore);
  private readonly userStore = inject(UserStore);
  private readonly checkinStore = inject(CheckinStore);

  // Signals
  readonly loading = this.pubStore.loading$$;
  readonly pubs$$ = this.pubStore.pubs$$;
  readonly user$$ = this.userStore.user$$;
  readonly totalCheckins$$ = this.checkinStore.checkins$$;
  readonly totalPubs = signal(800); // TODO: pull from config later

  // Load on init
  constructor() {
    this.pubStore.loadOnce();

    effect(() => {
      const user = this.user$$();
      if (user) {
        this.checkinStore.loadOnce(user.uid);
      }
    });
  }

  // === Derived signals ===

  readonly debugState = computed(() => ({
    user: this.userStore.user$$(),
    checkins: this.checkinStore.checkins$$(),
  }));


  // ✅ All check-ins fetched for the current user (raw array from Firestore)
readonly userCheckins$$ = this.checkinStore.checkins$$;

// ✅ Number of check-ins (can include repeats to the same pub)
readonly totalCheckinsCount$$ = computed(() => this.userCheckins$$().length);

// ✅ Unique pubs the user has visited at least once
readonly uniqueVisitedPubsList$$ = computed(() => {
  const checkins = this.checkinStore.checkins$$();
  const pubs = this.pubStore.pubs$$();
  const user = this.userStore.user$$();

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

// ✅ Pubs where the user is currently landlord
readonly landlordPubsList$$ = computed(() => {
  const pubs = this.pubStore.pubs$$();
  const user = this.userStore.user$$();

  console.log('[DEBUG] landlord signal triggered', {
    user: user?.uid,
    pubs: pubs.map(p => ({ id: p.id, landlordId: p.landlordId })),
  });

  if (!user) return [];

  return pubs.filter((pub) => pub.landlordId === user.uid);
});


readonly landlordPubsCount$$ = computed(() => this.landlordPubsList$$().length);




  // === Temporary mock badges & missions ===

  readonly badges = signal([
    { id: 'first-checkin', name: 'First Check-In', iconUrl: '/assets/icons/badges/first.svg' },
    { id: 'early-riser', name: 'Early Riser', iconUrl: '/assets/icons/badges/morning.svg' },
  ]);

  readonly missions = signal([
    { id: 'herts-crawl', title: 'Hertfordshire Crawl', progress: 3, total: 7 },
    { id: 'royalty-run', title: 'Royalty Run', progress: 1, total: 4 },
  ]);
}

