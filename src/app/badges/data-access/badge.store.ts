// /badges/data-access/badge.store.ts
import { Injectable, computed, effect, signal } from '@angular/core';
import type { Badge } from '../utils/badge.model';
import { BadgeService } from './badge.service';
import { BaseStore } from '../../shared/data-access/base.store';
import { Timestamp } from 'firebase/firestore';
import { inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BadgeStore extends BaseStore<Badge> {
  private readonly badgeService = inject(BadgeService);

  // ✅ Internal signals
  private readonly _allBadges = signal<Badge[]>([]);
  private readonly _allBadgesLoaded = signal(false);

  // ✅ Public signals
  readonly allBadges = this._allBadges.asReadonly();
  readonly allBadgesLoaded = this._allBadgesLoaded.asReadonly();

  // ✅ Badge presence check
  hasBadge = (id: string) => computed(() => this.data().some(b => b.id === id));

  // ✅ Badge lookup helpers
  getBadgeById = (id: string): Badge | undefined => this._allBadges().find(b => b.id === id);
  getBadgesByIds = (ids: string[]): Badge[] =>
    ids.map(id => this.getBadgeById(id)).filter(Boolean) as Badge[];

  protected async fetchData(): Promise<Badge[]> {
    const userId = this._userId();
    if (!userId) {
      console.warn('[BadgeStore] Skipping fetchData — userId not set');
      return [];
    }
    return this.badgeService.getUserBadges(userId);
  }

  override resetForUser(): void {
    super.resetForUser();
    this._allBadges.set([]);
    this._allBadgesLoaded.set(false);
  }

  async loadAllBadgesOnce(): Promise<void> {
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

