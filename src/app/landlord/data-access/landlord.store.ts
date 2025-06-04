// src/app/landlord/data-access/landlord.store.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { Landlord } from '../utils/landlord.model';
import { LandlordService } from './landlord.service';

export type TodayLandlordMap = Record<string, Landlord | null>;

@Injectable({ providedIn: 'root' })
export class LandlordStore {
  private readonly landlordService = inject(LandlordService);

  // ✅ Clean signal names following our conventions
  private readonly _todayLandlord = signal<TodayLandlordMap>({});
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _loadedPubs = signal<Set<string>>(new Set()); // Track what we've loaded

  // ✅ Public readonly signals
  readonly todayLandlord = this._todayLandlord.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Computed signals for derived state
  readonly landlordPubIds = computed(() =>
    Object.keys(this.todayLandlord()).filter(pubId => this.todayLandlord()[pubId])
  );

  readonly landlordCount = computed(() => this.landlordPubIds().length);

  constructor() {
    console.log('[LandlordStore] 👑 Initialized');
  }

  /**
   * ✅ Load landlord data with loadOnce pattern
   */
  async loadLandlordOnce(pubId: string): Promise<void> {
    // Check if we already loaded this pub
    if (this._loadedPubs().has(pubId)) {
      console.log(`[LandlordStore] ✅ Already loaded landlord for ${pubId}:`, this.getLandlordForPub(pubId)?.userId || 'none');
      return;
    }

    console.log(`[LandlordStore] 📡 Loading landlord for ${pubId}...`);
    this._loading.set(true);
    this._error.set(null);

    try {
      const landlord = await this.landlordService.getTodayLandlord(pubId);

      // Update state
      this._todayLandlord.update(current => ({
        ...current,
        [pubId]: landlord
      }));

      // Mark as loaded
      this._loadedPubs.update(loaded => new Set([...loaded, pubId]));

      console.log(`[LandlordStore] ✅ Loaded landlord for ${pubId}:`, landlord?.userId || 'none');

    } catch (error: any) {
      const message = `Failed to load landlord for ${pubId}`;
      this._error.set(message);
      console.error('[LandlordStore] ❌ Error loading landlord:', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Set landlord for a specific pub (used by other stores)
   */
  setTodayLandlord(pubId: string, landlord: Landlord | null): void {
    this._todayLandlord.update(current => ({
      ...current,
      [pubId]: landlord
    }));

    // Mark as loaded since we're setting data
    this._loadedPubs.update(loaded => new Set([...loaded, pubId]));

    console.log(`[LandlordStore] 👑 Set landlord for ${pubId}:`, landlord?.userId || 'none');
  }

  /**
   * Get landlord for a specific pub
   */
  getLandlordForPub(pubId: string): Landlord | null {
    return this.todayLandlord()[pubId] || null;
  }

  /**
   * Check if a specific user is landlord of a pub
   */
  isUserLandlord(pubId: string, userId: string): boolean {
    const landlord = this.getLandlordForPub(pubId);
    return landlord?.userId === userId;
  }

  /**
   * Get all pubs where a user is landlord
   */
  getUserLandlordPubs(userId: string): string[] {
    return Object.entries(this.todayLandlord())
      .filter(([_, landlord]) => landlord?.userId === userId)
      .map(([pubId]) => pubId);
  }

  /**
   * Clear all landlord data
   */
  reset(): void {
    this._todayLandlord.set({});
    this._loading.set(false);
    this._error.set(null);
    this._loadedPubs.set(new Set());
    console.log('[LandlordStore] 🔄 Reset complete');
  }
}
