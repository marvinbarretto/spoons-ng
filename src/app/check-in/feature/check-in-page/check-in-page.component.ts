import { Component } from '@angular/core';
import { CheckinComponent } from '../checkin/checkin.component';

@Component({
  selector: 'app-check-in-page',
  imports: [CheckinComponent],
  template: ` <app-checkin /> `,
})
export class CheckInPageComponent {}
