// src/app/landlord/data-access/landlord.store.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { LandlordService } from './landlord.service';
import { AuthStore } from '../../auth/data-access/auth.store';
import { ToastService } from '../../shared/data-access/toast.service';
import { Timestamp } from 'firebase/firestore';
import type { Landlord } from '../utils/landlord.model';

@Injectable({ providedIn: 'root' })
export class LandlordStore {
  private readonly landlordService = inject(LandlordService);
  private readonly authStore = inject(AuthStore);
  private readonly toastService = inject(ToastService);

  // ✅ Apply encapsulation pattern
  private readonly _currentLandlord$$ = signal<Record<string, Landlord | null>>({});
  private readonly _todayLandlord$$ = signal<Record<string, Landlord | null>>({});
  private readonly _landlordHistory$$ = signal<Record<string, Landlord[]>>({});
  private readonly _loading$$ = signal(false);
  private readonly _error$$ = signal<string | null>(null);

  // ✅ Public readonly accessors
  readonly currentLandlord$$ = this._currentLandlord$$.asReadonly();
  readonly todayLandlord$$ = this._todayLandlord$$.asReadonly();
  readonly landlordHistory$$ = this._landlordHistory$$.asReadonly();
  readonly loading$$ = this._loading$$.asReadonly();
  readonly error$$ = this._error$$.asReadonly();

  // Track loaded pubs to avoid duplicate requests
  private readonly loadedPubs = new Set<string>();

  /**
   * Load landlord info for a pub (with deduplication)
   */
  async loadLandlordForPub(pubId: string): Promise<void> {
    this._loading$$.set(true);
    this._error$$.set(null);

    try {
      const pub = await this.landlordService.getPub(pubId);

      // Update all landlord data atomically
      this._currentLandlord$$.update(prev => ({
        ...prev,
        [pubId]: pub.currentLandlord ?? null,
      }));

      this._todayLandlord$$.update(prev => ({
        ...prev,
        [pubId]: pub.todayLandlord ?? null,
      }));

      this._landlordHistory$$.update(prev => ({
        ...prev,
        [pubId]: pub.landlordHistory ?? [],
      }));

      this.loadedPubs.add(pubId);
      console.log(`[LandlordStore] ✅ Loaded landlord info for pub ${pubId}`);
    } catch (error: any) {
      const message = 'Failed to load landlord info';
      this._error$$.set(message);
      this.toastService.error(message);
      console.error('[LandlordStore] ❌ Failed to load landlord info:', error);
    } finally {
      this._loading$$.set(false);
    }
  }

  /**
   * Load once with deduplication
   */
  async loadOnceForPub(pubId: string): Promise<void> {
    if (this.loadedPubs.has(pubId)) {
      console.log(`[LandlordStore] ✅ Already loaded landlord for ${pubId} — skipping`);
      return;
    }
    await this.loadLandlordForPub(pubId);
  }

  /**
   * Force refresh landlord data for a pub
   */
  async refreshLandlord(pubId: string): Promise<void> {
    this.loadedPubs.delete(pubId); // Clear cache
    await this.loadLandlordForPub(pubId);
  }

  /**
   * Get current landlord for specific pub
   */
  getCurrentLandlordForPub(pubId: string): Landlord | null {
    return this.currentLandlord$$()[pubId] ?? null;
  }

  /**
   * Get today's landlord for specific pub
   */
  getTodayLandlordForPub(pubId: string): Landlord | null {
    return this.todayLandlord$$()[pubId] ?? null;
  }

  /**
   * Check if current user is landlord of specific pub today
   */
  readonly isUserLandlordOfPub$$ = computed(() => {
    return (pubId: string): boolean => {
      const userId = this.authStore.uid;
      if (!userId) return false;

      const todayLandlord = this.getTodayLandlordForPub(pubId);
      if (!todayLandlord || todayLandlord.userId !== userId) return false;

      // Check if landlord claim is from today
      const today = new Date().toISOString().split('T')[0];
      const claimedDate = todayLandlord.claimedAt instanceof Timestamp
        ? todayLandlord.claimedAt.toDate().toISOString().split('T')[0]
        : new Date(todayLandlord.claimedAt).toISOString().split('T')[0];

      return claimedDate === today;
    };
  });

  /**
   * Get all pubs where current user is landlord today
   */
  readonly myLandlordPubsToday$$ = computed(() => {
    const userId = this.authStore.uid;
    const today = new Date().toISOString().split('T')[0];
    const todayLandlords = this.todayLandlord$$();

    if (!userId) return [];

    return Object.entries(todayLandlords)
      .filter(([_, landlord]) => {
        if (!landlord || landlord.userId !== userId) return false;

        const claimedDate = landlord.claimedAt instanceof Timestamp
          ? landlord.claimedAt.toDate().toISOString().split('T')[0]
          : new Date(landlord.claimedAt).toISOString().split('T')[0];

        return claimedDate === today;
      })
      .map(([pubId]) => pubId);
  });

  /**
   * Get landlord history for specific pub
   */
  getLandlordHistoryForPub(pubId: string): Landlord[] {
    return this.landlordHistory$$()[pubId] ?? [];
  }

  /**
   * Reset all landlord data
   */
  reset(): void {
    this._currentLandlord$$.set({});
    this._todayLandlord$$.set({});
    this._landlordHistory$$.set({});
    this._loading$$.set(false);
    this._error$$.set(null);
    this.loadedPubs.clear();
    console.log('[LandlordStore] 🔄 Reset complete');
  }

  /**
   * Reset data for specific pub
   */
  resetPub(pubId: string): void {
    this._currentLandlord$$.update(prev => {
      const { [pubId]: _, ...rest } = prev;
      return rest;
    });

    this._todayLandlord$$.update(prev => {
      const { [pubId]: _, ...rest } = prev;
      return rest;
    });

    this._landlordHistory$$.update(prev => {
      const { [pubId]: _, ...rest } = prev;
      return rest;
    });

    this.loadedPubs.delete(pubId);
    console.log(`[LandlordStore] 🔄 Reset data for pub ${pubId}`);
  }
}
