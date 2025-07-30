import { Component, computed, inject, input } from '@angular/core';
import { CheckInStore } from '../../../check-in/data-access/check-in.store';
import { BaseComponent } from '../../../shared/base/base.component';
import { Pub } from '../../utils/pub.models';
import { NearestPubsItemComponent } from '../nearest-pubs-item/nearest-pubs-item.component';

@Component({
  selector: 'app-nearest-pubs',
  imports: [NearestPubsItemComponent],
  templateUrl: './nearest-pubs.component.html',
  styleUrl: './nearest-pubs.component.scss',
})
export class NearestPubsComponent extends BaseComponent {
  readonly pubs = input.required<(Pub & { distance: number })[]>();
  readonly filter = input<'all' | 'checked-in' | 'not-checked-in'>('all');

  private readonly checkinStore = inject(CheckInStore);
  readonly userCheckins = this.checkinStore.userCheckins;

  readonly filteredPubs = computed(() => {
    const pubIds = this.userCheckins();
    switch (this.filter()) {
      case 'checked-in':
        return this.pubs().filter(p => pubIds.includes(p.id));
      case 'not-checked-in':
        return this.pubs().filter(p => !pubIds.includes(p.id));
      default:
        return this.pubs();
    }
  });
}
