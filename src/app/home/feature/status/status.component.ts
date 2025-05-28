import { Component, computed, inject, signal } from '@angular/core';
import { FeatureFlagPipe } from "../../../shared/utils/feature-flag.pipe";
import { PubStore } from '../../../pubs/data-access/pub.store';
import { UserStore } from '../../../users/data-access/user.store';

@Component({
  selector: 'app-status',
  imports: [FeatureFlagPipe],
  templateUrl: './status.component.html',
  styleUrl: './status.component.scss'
})
export class StatusComponent {
  private readonly pubStore = inject(PubStore);
  private readonly userStore = inject(UserStore);

  // Signals
  readonly loading = this.pubStore.loading$$;
  readonly pubs = this.pubStore.pubs$$;

  // TODO: Get this from user store
  readonly claimedCount = computed(() => this.userStore.claimedCount());
  readonly totalPubs = signal(800); // can come from config later


  // Stub signals
  // Placeholder: landlord pubs (filtered for demo)
  readonly landlordPubs = computed(() =>
    this.pubs().filter((pub) => pub.landlordId === 'currentUserId') // Replace with real user ID
  );

  readonly badges = signal([
    { id: 'first-checkin', name: 'First Check-In', iconUrl: '/assets/icons/badges/first.svg' },
    { id: 'early-riser', name: 'Early Riser', iconUrl: '/assets/icons/badges/morning.svg' },
  ]);

  readonly missions = signal([
    { id: 'herts-crawl', title: 'Hertfordshire Crawl', progress: 3, total: 7 },
    { id: 'royalty-run', title: 'Royalty Run', progress: 1, total: 4 },
  ]);




  constructor() {
    this.pubStore.loadOnce();
  }
}
