import { Component, Input } from '@angular/core';
import { Pub } from '../../../pubs/utils/pub.models';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-check-in-homepage-widget',
  imports: [RouterModule],
  templateUrl: './check-in-homepage-widget.component.html',
  styleUrl: './check-in-homepage-widget.component.scss'
})
export class CheckInHomepageWidgetComponent {
  @Input({required: true}) closestPub!: Pub;
}
