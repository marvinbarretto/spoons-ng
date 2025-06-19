// =====================================
// 🏪 NEW-CHECKIN STORE
// =====================================

// src/app/new-checkin/data-access/new-checkin-store.ts
import { Injectable, inject, signal } from '@angular/core';
import { NewCheckinService } from './new-checkin.service';

@Injectable({ providedIn: 'root' })
export class NewCheckinStore {
  private readonly newCheckinService = inject(NewCheckinService);

  private readonly _isProcessing = signal(false);
  readonly isProcessing = this._isProcessing.asReadonly();

  /**
   * Check in to a pub
   *
   * @param pubId - The pub to check into
   * @returns Promise<void>
   */
  async checkinToPub(pubId: string): Promise<void> {
    console.log('[NewCheckinStore] 🚀 checkinToPub() called with pubId:', pubId);

    if (this._isProcessing()) {
      console.log('[NewCheckinStore] ⚠️ Already processing a check-in, ignoring');
      return;
    }

    this._isProcessing.set(true);
    console.log('[NewCheckinStore] 🔄 Set processing to true');

    try {
      // Validation phase
      console.log('[NewCheckinStore] 🔍 Starting validation phase...');
      const validation = await this.newCheckinService.canCheckIn(pubId);

      if (!validation.allowed) {
        console.log('[NewCheckinStore] ❌ Validation failed:', validation.reason);
        throw new Error(validation.reason);
      }
      console.log('[NewCheckinStore] ✅ All validations passed - proceeding with check-in');

      // Creation phase
      console.log('[NewCheckinStore] 💾 Starting check-in creation...');
      await this.newCheckinService.createCheckin(pubId);
      console.log('[NewCheckinStore] ✅ Check-in creation completed successfully');

    } catch (error: any) {
      console.error('[NewCheckinStore] ❌ Check-in process failed:', error);
      console.error('[NewCheckinStore] ❌ Error message:', error?.message);
      throw error;

    } finally {
      this._isProcessing.set(false);
      console.log('[NewCheckinStore] 🔄 Set processing to false');
    }
  }
}



// =====================================
// 📁 FILE STRUCTURE
// =====================================

/*
src/app/new-checkin/
├── data-access/
│   ├── new-checkin-store.ts      ✅ Main store logic
│   └── new-checkin-service.ts    ✅ API/persistence layer
├── feature/
│   └── checkin-button/
│       └── checkin-button.component.ts  ✅ Example usage
└── utils/
    └── new-checkin.models.ts     📝 Types (if needed later)
*/

// =====================================
// 🧪 TESTING THE FLOW
// =====================================

/*
To test this:

1. Add the CheckinButtonComponent to any page:
   ```html
   <app-checkin-button [pubId]="'test-pub-123'" />
   ```

2. Click the button and watch the console logs:
   ```
   [CheckinButtonComponent] 🎯 Button clicked for pub: test-pub-123
   [CheckinButtonComponent] 📞 Calling store.checkinToPub()...
   [NewCheckinStore] 🚀 checkinToPub() called with pubId: test-pub-123
   [NewCheckinStore] 🔄 Set processing to true
   [NewCheckinStore] 📞 Calling service.createCheckin()...
   [NewCheckinService] 🚀 createCheckin() called with pubId: test-pub-123
   [NewCheckinService] ⏳ Simulating network call...
   [NewCheckinService] ✅ Check-in created successfully
   [NewCheckinService] 📝 Would normally save to Firestore here
   [NewCheckinStore] ✅ Service call completed successfully
   [NewCheckinStore] 🔄 Set processing to false
   [CheckinButtonComponent] ✅ Check-in completed successfully
   [CheckinButtonComponent] 🎉 Would show success overlay here
   ```

3. The button will be disabled during processing
4. Random failures will test error handling
*/
