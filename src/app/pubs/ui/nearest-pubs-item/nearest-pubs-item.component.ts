// Update src/app/pubs/ui/nearest-pubs-item/nearest-pubs-item.component.ts
import { Component, inject, input } from '@angular/core';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { LandlordStore } from '../../../landlord/data-access/landlord.store';
import { LocationService } from '../../../shared/data-access/location.service';
import type { Pub } from '../../utils/pub.models';

@Component({
  selector: 'app-nearest-pubs-item',
  imports: [],
  template: `
    <li>
      {{ pub().name }}
      <span class="distance" [class.distance-pulsing]="isMoving()"
        >({{ pub().distance.toFixed(0) }}m)</span
      >
      @if (isLandlord(pub().id)) {
        <span class="badge">👑 You're the Landlord</span>
      }
      @if (hasCheckedIn(pub().id)) {
        <span class="checkmark">✔️</span>
      }
    </li>
  `,
  styleUrl: './nearest-pubs-item.component.scss',
})
export class NearestPubsItemComponent {
  readonly pub = input.required<Pub & { distance: number }>();

  private readonly checkinStore = inject(CheckInStore);
  private readonly authStore = inject(AuthStore);
  private readonly landlordStore = inject(LandlordStore);
  private readonly locationService = inject(LocationService);

  // ✅ Movement detection signal
  readonly isMoving = this.locationService.isMoving;

  isLandlord(pubId: string): boolean {
    const userId = this.authStore.uid;
    const todayLandlord = this.landlordStore.todayLandlord()[pubId];
    return !!todayLandlord && todayLandlord.userId === userId;
  }

  hasCheckedIn(pubId: string): boolean {
    return this.checkinStore.userCheckins().includes(pubId);
  }
}
