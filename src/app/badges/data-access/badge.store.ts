// /badges/data-access/badge.store.ts
import { Injectable, computed, effect, signal } from '@angular/core';
import type { Badge } from '../utils/badge.model';
import { BadgeService } from './badge.service';
import { BaseStore } from '../../shared/data-access/base.store';
import { Timestamp } from 'firebase/firestore';
import { inject } from '@angular/core';
import { AuthStore } from '../../auth/data-access/auth.store';

@Injectable({ providedIn: 'root' })
export class BadgeStore extends BaseStore<Badge> {
  private readonly _authStore = inject(AuthStore);
  private lastUserId: string | null = null;

  constructor(private readonly badgeService: BadgeService) {
    super();

    // ✅ Auto-react to auth changes
    effect(() => {
      const user = this._authStore.user();
      const currentUserId = user?.uid || null;

      if (currentUserId !== this.lastUserId) {
        console.log('[BadgeStore] User changed, resetting data');
        this.resetForUser(currentUserId || undefined);
        this.lastUserId = currentUserId;

        // Auto-load for authenticated user
        if (currentUserId) {
          this.loadOnce();
        }
      }
    });
  }

  // ✅ Internal signals
  private readonly _userId = signal<string | null>(null);
  private readonly _allBadges = signal<Badge[]>([]);
  private readonly _allBadgesLoaded = signal(false);

  // ✅ Public signals
  readonly userId = this._userId.asReadonly();
  readonly allBadges = this._allBadges.asReadonly();
  readonly allBadgesLoaded = this._allBadgesLoaded.asReadonly();

  // ✅ Awarded badges lookup
  hasBadge = (id: string) => computed(() => this.data().some(b => b.id === id));

  // ✅ Metadata lookup
  getBadgeById = (id: string): Badge | undefined => this._allBadges().find(b => b.id === id);
  getBadgesByIds = (ids: string[]): Badge[] =>
    ids.map(id => this.getBadgeById(id)).filter(Boolean) as Badge[];

  // ✅ Call this when auth state is known
  async initialize(userId: string): Promise<void> {
    this._userId.set(userId);
    if (!this.hasLoaded) await this.loadOnce();
    if (!this._allBadgesLoaded()) await this.loadAllBadgesOnce();
  }

  protected async fetchData(): Promise<Badge[]> {
    const userId = this._authStore.user()?.uid;
    if (!userId) {
      throw new Error('User ID not set in BadgeStore');
    }
    return this.badgeService.getUserBadges(userId);
  }

  private async loadAllBadgesOnce(): Promise<void> {
    if (this._allBadgesLoaded()) return;
    const all = await this.badgeService.getAllBadges();
    this._allBadges.set(all);
    this._allBadgesLoaded.set(true);
  }

  async award(badge: Badge): Promise<void> {
    const uid = this._userId();
    if (!uid) return;
    if (this.hasItem(b => b.id === badge.id)) return;

    await this.badgeService.awardBadgeToUser(uid, badge);
    this.addItem({ ...badge, createdAt: Timestamp.now() });
    this.toastService.success(`🏅 ${badge.name} badge awarded!`);
  }

  async revoke(badgeId: string): Promise<void> {
    const uid = this._userId();
    if (!uid) return;

    await this.badgeService.revokeBadgeFromUser(uid, badgeId);
    this.removeItem(b => b.id === badgeId);
  }
}

