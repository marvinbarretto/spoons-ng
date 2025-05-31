import { Injectable } from "@angular/core";
import { inject, signal } from "@angular/core";
import { LandlordService } from "./landlord.service";
import { AuthStore } from "../../auth/data-access/auth.store";

@Injectable({
  providedIn: 'root'
})
export class LandlordStore {
  private landlordService = inject(LandlordService);
  private authStore = inject(AuthStore);

  readonly landlordToday$$ = signal<Record<string, { userId: string; date: string } | null>>({});
  readonly landlordHistory$$ = signal<Record<string, { userId: string; date: string }[]>>({});
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);

  async loadLandlordForPub(pubId: string): Promise<void> {
    this.loading$$.set(true);
    try {
      const pub = await this.landlordService.getPub(pubId);
      this.landlordToday$$.update((prev) => ({ ...prev, [pubId]: pub.landlordToday ?? null }));
      this.landlordHistory$$.update((prev) => ({ ...prev, [pubId]: pub.landlordHistory ?? [] }));
    } catch (err: any) {
      console.error('[LandlordStore] Failed to load landlord info:', err);
      this.error$$.set('Failed to load landlord info');
    } finally {
      this.loading$$.set(false);
    }
  }

  async refreshLandlord(pubId: string): Promise<void> {
    await this.loadLandlordForPub(pubId);
  }
}
