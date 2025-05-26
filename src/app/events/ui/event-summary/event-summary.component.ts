import { Component, Input } from '@angular/core';
import { IEvent } from '../../utils/event.model';
import { RouterModule } from '@angular/router';
import { DateComponent } from '../../../shared/ui/date/date.component';

@Component({
  selector: 'app-event-summary',
  standalone: true,
  imports: [RouterModule, DateComponent],
  templateUrl: './event-summary.component.html',
  styleUrl: './event-summary.component.scss',
})
export class EventSummaryComponent {
  @Input() event!: IEvent;

  parseDate(dateString: string): Date {
    return new Date(dateString);
  }
}
