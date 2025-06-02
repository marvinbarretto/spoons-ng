import { Component, Input, inject } from '@angular/core';
import { Pub } from '../../utils/pub.models';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { computed } from '@angular/core';
import { NearestPubsItemComponent } from "../nearest-pubs-item/nearest-pubs-item.component";

@Component({
  selector: 'app-nearest-pubs',
  standalone: true,
  imports: [NearestPubsItemComponent],
  templateUrl: './nearest-pubs.component.html',
  styleUrl: './nearest-pubs.component.scss'
})
export class NearestPubsComponent {
  @Input({ required: true }) pubs: (Pub & { distance: number })[] = [];
  @Input() filter: 'all' | 'checked-in' | 'not-checked-in' = 'all';

  private readonly checkinStore = inject(CheckinStore);

  readonly userCheckins = this.checkinStore.userCheckins;

  readonly filteredPubs$$ = computed(() => {
    const pubIds = this.userCheckins();
    switch (this.filter) {
      case 'checked-in':
        return this.pubs.filter(p => pubIds.includes(p.id));
      case 'not-checked-in':
        return this.pubs.filter(p => !pubIds.includes(p.id));
      default:
        return this.pubs;
    }
  });
}
