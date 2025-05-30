import { Component, inject, Input } from '@angular/core';
import type { Pub } from '../../utils/pub.models';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { AuthStore } from '../../../auth/data-access/auth.store';

@Component({
  selector: 'app-nearest-pubs-item',
  standalone: true,
  imports: [],
  template: `
    <li>
      {{ pub.name }}
      <span class="distance">({{ pub.distance.toFixed(0) }}m)</span>
      @if (isLandlord(pub.id)) {
        <span class="badge">👑 You’re the Landlord</span>
      }
      @if (hasCheckedIn(pub.id)) {
        <span class="checkmark">✔️</span>
      }
    </li>
  `,
  styleUrl: './nearest-pubs-item.component.scss'
})
export class NearestPubsItemComponent {
  @Input({ required: true }) pub!: Pub & { distance: number };

  private readonly checkinStore = inject(CheckinStore);
  private readonly authStore = inject(AuthStore);

  isLandlord(pubId: string): boolean {
    return this.checkinStore.landlordPubs$$().includes(pubId);
  }

  hasCheckedIn(pubId: string): boolean {
    return this.checkinStore.userCheckins$$().includes(pubId);
  }

}
