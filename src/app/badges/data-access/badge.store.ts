// /badges/data-access/badge.store.ts
import { Injectable, signal } from '@angular/core';
import type { Badge } from '../utils/badge.model';
import { inject } from '@angular/core';
import { BadgeService } from './badge.service';

@Injectable({ providedIn: 'root' })
export class BadgeStore {
  private readonly service = inject(BadgeService);

  private readonly _badges = signal<Badge[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly badges = this._badges.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async loadOnce(): Promise<void> {
    if (this._badges().length || this._loading()) return;
    this._loading.set(true);
    try {
      const badges = await this.service.getBadgeDefinitions();
      this._badges.set(badges);
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to load badges');
      console.error('[BadgeStore] loadOnce error:', err);
    } finally {
      this._loading.set(false);
    }
  }

  async create(newBadge: Badge): Promise<void> {
    try {
      await this.service.create(newBadge);
      this._badges.update(current => [...current, newBadge]);
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to create badge');
      console.error('[BadgeStore] create error:', err);
    }
  }

  async update(updatedBadge: Badge): Promise<void> {
    try {
      await this.service.update(updatedBadge.id, updatedBadge);
      this._badges.update(current =>
        current.map(b => b.id === updatedBadge.id ? updatedBadge : b)
      );
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to update badge');
      console.error('[BadgeStore] update error:', err);
    }
  }

  async save(badge: Badge): Promise<void> {
    try {
      const exists = this._badges().some(b => b.id === badge.id);
      exists
        ? await this.service.update(badge.id, badge)
        : await this.service.create(badge);

      // Refresh or manually update signal
      const updated = exists
        ? this._badges().map(b => (b.id === badge.id ? badge : b))
        : [...this._badges(), badge];

      this._badges.set(updated);
    } catch (err: any) {
      this._error.set(err?.message ?? 'Save failed');
      console.error('[BadgeStore] Save error:', err);
    }
  }


  async delete(id: string): Promise<void> {
    try {
      await this.service.delete(id);
      this._badges.update(current => current.filter(b => b.id !== id));
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to delete badge');
      console.error('[BadgeStore] delete error:', err);
    }
  }
}
