import { computed, Injectable } from "@angular/core";
import { inject, signal } from "@angular/core";
import { LandlordService } from "./landlord.service";
import { AuthStore } from "../../auth/data-access/auth.store";
import { Landlord } from "../utils/landlord.model";
import { Timestamp } from "firebase/firestore";

@Injectable({
  providedIn: 'root'
})
export class LandlordStore {
  private landlordService = inject(LandlordService);
  private authStore = inject(AuthStore);

  readonly currentLandlord$$ = signal<Record<string, Landlord | null>>({});
  readonly todayLandlord$$ = signal<Record<string, Landlord | null>>({});
  readonly landlordHistory$$ = signal<Record<string, Landlord[]>>({});
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);

  async loadLandlordForPub(pubId: string): Promise<void> {
    this.loading$$.set(true);
    try {
      const pub = await this.landlordService.getPub(pubId);

      this.currentLandlord$$.update(prev => ({
        ...prev,
        [pubId]: pub.currentLandlord ?? null,
      }));

      this.todayLandlord$$.update(prev => ({
        ...prev,
        [pubId]: pub.todayLandlord ?? null,
      }));

      this.landlordHistory$$.update(prev => ({
        ...prev,
        [pubId]: pub.landlordHistory ?? [],
      }));
    } catch (err: any) {
      console.error('[LandlordStore] ❌ Failed to load landlord info:', err);
      this.error$$.set('Failed to load landlord info');
    } finally {
      this.loading$$.set(false);
    }
  }

  async refreshLandlord(pubId: string): Promise<void> {
    await this.loadLandlordForPub(pubId);
  }

  readonly myLandlordPubsToday$$ = computed(() => {
    const userId = this.authStore.uid;
    const today = new Date().toISOString().split('T')[0];
    const map = this.todayLandlord$$();

    return Object.entries(map)
      .filter(([_, val]) => {
        if (!val || val.userId !== userId) return false;
        const claimedDate = val.claimedAt instanceof Timestamp
          ? val.claimedAt.toDate().toISOString().split('T')[0]
          : new Date(val.claimedAt).toISOString().split('T')[0];
        return claimedDate === today;
      })
      .map(([pubId]) => pubId);
  });
}
