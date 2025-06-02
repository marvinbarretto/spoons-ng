import { Component, Input } from '@angular/core';
import { Pub } from '../../../pubs/utils/pub.models';
import { RouterModule, Router } from '@angular/router';
import { CheckinStore } from '../../data-access/check-in.store';

@Component({
  selector: 'app-check-in-homepage-widget',
  imports: [RouterModule],
  templateUrl: './check-in-homepage-widget.component.html',
  styleUrl: './check-in-homepage-widget.component.scss'
})
export class CheckInHomepageWidgetComponent {
  @Input({required: true}) closestPub!: Pub;

  constructor(
    private readonly checkinStore: CheckinStore,
    private readonly router: Router
  ) {}

  checkInToNearestPub() {
    console.log('[CheckInHomepageWidgetComponent] !!! Checking in to', this.closestPub);
    this.checkinStore.checkin(this.closestPub.id);
    this.router.navigate(['/pub', this.closestPub.id]);
  }
}
