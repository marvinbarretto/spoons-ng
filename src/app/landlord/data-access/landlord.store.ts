// src/app/landlord/data-access/landlord.store.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { Landlord } from '../utils/landlord.model';
import { LandlordService } from './landlord.service';

export type LandlordResult = {
  landlord: Landlord | null;
  wasAwarded: boolean;
  isNewLandlord: boolean;
};

export type TodayLandlordMap = Record<string, Landlord | null>;

@Injectable({ providedIn: 'root' })
export class LandlordStore {
  protected readonly landlordService = inject(LandlordService);

  // 🔒 Private signals
  private readonly _todayLandlord = signal<TodayLandlordMap>({});
  private readonly _loadedPubs = signal<Set<string>>(new Set());
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ✅ Public readonly signals
  readonly todayLandlord = this._todayLandlord.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Derived signals
  readonly landlordPubIds = computed(() =>
    Object.keys(this.todayLandlord()).filter(pubId => !!this.todayLandlord()[pubId])
  );

  readonly landlordCount = computed(() => this.landlordPubIds().length);

  constructor() {
    console.log('[LandlordStore] 👑 Initialized');
  }

  // --- RESTFUL / CRUD-style METHODS ---

  /**
   * Read landlord for a specific pub from Firestore if not already loaded
   */
  async loadOnce(pubId: string): Promise<void> {
    if (this._loadedPubs().has(pubId)) return;

    console.log(`[LandlordStore] 📡 Loading landlord for ${pubId}`);
    this._loading.set(true);
    this._error.set(null);

    try {
      const landlord = await this.landlordService.getTodayLandlord(pubId);

      this._todayLandlord.update(map => ({
        ...map,
        [pubId]: landlord,
      }));

      this._loadedPubs.update(set => new Set([...set, pubId]));
      console.log(`[LandlordStore] ✅ Loaded landlord for ${pubId}:`, landlord?.userId || 'none');
    } catch (err: any) {
      const msg = `Failed to load landlord for ${pubId}`;
      this._error.set(msg);
      console.error(`[LandlordStore] ❌ ${msg}:`, err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create or update the landlord for a pub
   */
  set(pubId: string, landlord: Landlord | null): void {
    this._todayLandlord.update(map => ({
      ...map,
      [pubId]: landlord,
    }));

    this._loadedPubs.update(set => new Set([...set, pubId]));
    console.log(`[LandlordStore] 👑 Set landlord for ${pubId}:`, landlord?.userId || 'none');
  }

  /**
   * Read landlord from signal
   */
  get(pubId: string): Landlord | null {
    return this._todayLandlord()[pubId] || null;
  }

  /**
   * Delete landlord from state (local only)
   */
  clear(pubId: string): void {
    const { [pubId]: _, ...rest } = this._todayLandlord();
    this._todayLandlord.set(rest);
    this._loadedPubs.update(set => {
      const copy = new Set(set);
      copy.delete(pubId);
      return copy;
    });
    console.log(`[LandlordStore] 🧹 Cleared landlord for ${pubId}`);
  }

  /**
   * Clear all landlord data
   */
  reset(): void {
    this._todayLandlord.set({});
    this._loadedPubs.set(new Set());
    this._loading.set(false);
    this._error.set(null);
    console.log('[LandlordStore] 🔄 Reset all landlord data');
  }

  // --- CHECK-IN INTEGRATION ---

  /**
   * Handle landlord logic for a check-in
   * Encapsulates all landlord service calls and state updates
   */
  async tryAwardLandlordForCheckin(
    pubId: string,
    userId: string,
    checkinDate: Date
  ): Promise<LandlordResult> {
    console.log(`[LandlordStore] 👑 Processing landlord logic for check-in`, { pubId, userId });

    try {
      // Use landlord service to determine if user becomes landlord
      const serviceResult = await this.landlordService.tryAwardLandlord(pubId, checkinDate);

      // Update local state if landlord was awarded
      if (serviceResult.landlord) {
        this.set(pubId, serviceResult.landlord);
      }

      const result: LandlordResult = {
        landlord: serviceResult.landlord,
        wasAwarded: serviceResult.wasAwarded,
        isNewLandlord: serviceResult.wasAwarded && serviceResult.landlord?.userId === userId,
      };

      console.log(`[LandlordStore] 👑 Landlord result:`, result);
      return result;
    } catch (error) {
      console.error(`[LandlordStore] ❌ Error in landlord check-in logic:`, error);
      return {
        landlord: null,
        wasAwarded: false,
        isNewLandlord: false,
      };
    }
  }

  // --- UTILITY METHODS ---

  hasLoaded(pubId: string): boolean {
    return this._loadedPubs().has(pubId);
  }

  isUserLandlord(pubId: string, userId: string): boolean {
    return this.get(pubId)?.userId === userId;
  }

  getPubsWhereUserIsLandlord(userId: string): string[] {
    return Object.entries(this._todayLandlord()).flatMap(([pubId, landlord]) =>
      landlord?.userId === userId ? [pubId] : []
    );
  }
}
