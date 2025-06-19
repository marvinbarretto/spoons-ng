// src/app/new-checkin/feature/checkin-button/checkin-button.component.ts
import { Component, inject, input } from '@angular/core';
import { NewCheckinStore } from '../../data-access/new-checkin.store';


@Component({
  selector: 'app-checkin-button',
  template: `
    <button
      (click)="handleCheckIn()"
      [disabled]="checkinStore.isProcessing()"
    >
      @if (checkinStore.isProcessing()) {
        Checking in...
      } @else {
        Check In
      }
    </button>
  `,
  standalone: true
})
export class CheckinButtonComponent {
  readonly pubId = input.required<string>();
  readonly checkinStore = inject(NewCheckinStore);

  async handleCheckIn(): Promise<void> {
    console.log('[CheckinButtonComponent] 🎯 Button clicked for pub:', this.pubId());

    try {
      console.log('[CheckinButtonComponent] 📞 Calling store.checkinToPub()...');
      await this.checkinStore.checkinToPub(this.pubId());
      console.log('[CheckinButtonComponent] ✅ Check-in completed successfully');

      // TODO: Show success message
      console.log('[CheckinButtonComponent] 🎉 Would show success overlay here');

    } catch (error: any) {
      console.error('[CheckinButtonComponent] ❌ Check-in failed:', error);
      console.error('[CheckinButtonComponent] ❌ Would show error message:', error?.message);

      // TODO: Show error message to user
    }
  }
}
