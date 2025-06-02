import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { CheckIn } from '../../util/check-in.model';
import type { Pub } from '../../../pubs/utils/pub.models';

@Component({
  selector: 'app-check-in-result-overlay',
  imports: [CommonModule],
  templateUrl: './check-in-result-overlay.component.html',
  styleUrl: './check-in-result-overlay.component.scss',
})
export class CheckInResultOverlayComponent {
  @Input() status: 'success' | 'partial' | 'error' = 'success';
  @Input() checkin?: CheckIn;
  @Input() pub?: Pub;
  @Input() landlordMessage?: string;
  @Input() distanceMeters?: number;
  @Input() photoUrl?: string;
  @Input() emoji: string = '🍻';

  get timestamp(): string | null {
    return this.checkin?.timestamp
      ? new Date((this.checkin.timestamp as any) as number).toLocaleString()
      : null;
  }
}
