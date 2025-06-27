// Update src/app/pubs/ui/nearest-pubs-item/nearest-pubs-item.component.ts
import { Component, inject, input } from '@angular/core';
import type { Pub } from '../../utils/pub.models';
import { NewCheckinStore } from '../../../new-checkin/data-access/new-checkin.store';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';

@Component({
  selector: 'app-nearest-pubs-item',
  imports: [],
  template: `
    <li>
      {{ pub().name }}
      <span class="distance">({{ pub().distance.toFixed(0) }}m)</span>
      @if (isLandlord(pub().id)) {
        <span class="badge">👑 You're the Landlord</span>
      }
      @if (hasCheckedIn(pub().id)) {
        <span class="checkmark">✔️</span>
      }
    </li>
  `,
  styleUrl: './nearest-pubs-item.component.scss'
})
export class NearestPubsItemComponent {
  readonly pub = input.required<Pub & { distance: number }>();

  private readonly checkinStore = inject(NewCheckinStore);
  private readonly authStore = inject(AuthStore);
  private readonly landlordStore = inject(LandlordStore);

  isLandlord(pubId: string): boolean {
    const userId = this.authStore.uid;
    const todayLandlord = this.landlordStore.todayLandlord()[pubId];
    return !!todayLandlord && todayLandlord.userId === userId;
  }

  hasCheckedIn(pubId: string): boolean {
    return this.checkinStore.userCheckins().includes(pubId);
  }
}
