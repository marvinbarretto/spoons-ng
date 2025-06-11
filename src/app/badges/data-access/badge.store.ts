import { Injectable, inject, signal, computed } from '@angular/core';
import { BadgeService } from './badge.service';
import { UserStore } from '@users/data-access/user.store';
import type { Badge, EarnedBadge, BadgeTriggerContext } from '../utils/badge.model';

@Injectable({ providedIn: 'root' })
export class BadgeStore {
  private readonly service = inject(BadgeService);
  private readonly userStore = inject(UserStore);

  // ✅ Badge definitions using correct Badge type
  private readonly _badgeDefinitions = signal<Badge[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly badgeDefinitions = this._badgeDefinitions.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ✅ Delegate user badge queries to UserStore
  readonly userBadges = this.userStore.userBadges;
  readonly hasBadges = this.userStore.hasBadges;
  readonly badgeCount = this.userStore.badgeCount;
  readonly recentBadges = this.userStore.recentBadges;

  // ✅ Combined computed: earned badges with definitions
  readonly earnedBadgesWithDefinitions = computed(() => {
    const userBadges = this.userStore.userBadges();
    const definitions = this._badgeDefinitions();

    return userBadges.map(earnedBadge => ({
      earnedBadge,
      badge: definitions.find(def => def.id === earnedBadge.badgeId)
    })).filter(item => item.badge); // Only include badges with valid definitions
  });

  // ✅ Get display-ready recent badges
  readonly recentBadgesForDisplay = computed(() =>
    this.earnedBadgesWithDefinitions()
      .sort((a, b) => b.earnedBadge.awardedAt - a.earnedBadge.awardedAt)
      .slice(0, 3) // Show 3 most recent
  );

  // ✅ Badge definition methods
  async loadOnce(): Promise<void> {
    // Load badge definitions if not already loaded
    await this.loadBadgeDefinitions();
  }

  async loadBadgeDefinitions(): Promise<void> {
    if (this._badgeDefinitions().length || this._loading()) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const badges = await this.service.getBadgeDefinitions();
      this._badgeDefinitions.set(badges);
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to load badge definitions');
      console.error('[BadgeStore] loadBadgeDefinitions error:', err);
    } finally {
      this._loading.set(false);
    }
  }

  getBadgeDefinition(badgeId: string): Badge | undefined {
    return this._badgeDefinitions().find(badge => badge.id === badgeId);
  }

  // ✅ Award badge (now calls real API)
  async awardBadge(badgeId: string, metadata?: Record<string, any>): Promise<void> {
    const user = this.userStore.user();
    if (!user) {
      console.warn('[BadgeStore] Cannot award badge - no user');
      return;
    }

    // Check if badge definition exists
    const badgeDefinition = this.getBadgeDefinition(badgeId);
    if (!badgeDefinition) {
      console.warn('[BadgeStore] Badge definition not found:', badgeId);
      return;
    }

    try {
      // ✅ Call API to persist the earned badge
      const earnedBadge = await this.service.awardBadgeToUser(user.uid, badgeId, metadata);

      // Update UserStore (the API call succeeded)
      this.userStore.addBadge(earnedBadge);

      console.log('[BadgeStore] ✅ Badge awarded:', {
        badgeId,
        badgeName: badgeDefinition.name,
        userId: user.uid
      });
    } catch (error: any) {
      console.error('[BadgeStore] awardBadge error:', error);
      this._error.set(error?.message ?? 'Failed to award badge');
    }
  }

  // ✅ Check badge criteria (for triggering awards)
  checkBadgeCriteria(context: BadgeTriggerContext): void {
    const definitions = this._badgeDefinitions();

    for (const badge of definitions) {
      // Skip if user already has this badge
      if (context.userBadges.some(ub => ub.badgeId === badge.id)) {
        continue;
      }

      // TODO: Implement badge criteria checking logic
      // This would check badge.criteria against the context
      // For now, just a placeholder
      if (this.evaluateBadgeCriteria(badge, context)) {
        this.awardBadge(badge.id, { triggeredBy: 'checkIn' });
      }
    }
  }

  // ✅ Placeholder for badge criteria evaluation
  private evaluateBadgeCriteria(badge: Badge, context: BadgeTriggerContext): boolean {
    // TODO: Implement actual criteria evaluation based on badge.criteria
    // This is where you'd check things like:
    // - First check-in badge
    // - 10 check-ins badge
    // - Landlord badges
    // - Streak badges
    // etc.

    return false; // Placeholder
  }

  // ✅ Badge definition management (admin features)
  async createBadgeDefinition(newBadge: Omit<Badge, 'id'>): Promise<void> {
    try {
      const badge: Badge = {
        ...newBadge,
        id: crypto.randomUUID(),
      };

      await this.service.createBadgeDefinition(badge);
      this._badgeDefinitions.update(current => [...current, badge]);
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to create badge');
      console.error('[BadgeStore] createBadgeDefinition error:', err);
    }
  }

  async updateBadgeDefinition(updatedBadge: Badge): Promise<void> {
    try {
      await this.service.updateBadgeDefinition(updatedBadge);
      this._badgeDefinitions.update(current =>
        current.map(b => b.id === updatedBadge.id ? updatedBadge : b)
      );
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to update badge');
      console.error('[BadgeStore] updateBadgeDefinition error:', err);
    }
  }

  async deleteBadgeDefinition(id: string): Promise<void> {
    try {
      await this.service.deleteBadgeDefinition(id);
      this._badgeDefinitions.update(current => current.filter(b => b.id !== id));
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to delete badge');
      console.error('[BadgeStore] deleteBadgeDefinition error:', err);
    }
  }

  reset(): void {
    this._badgeDefinitions.set([]);
    this._error.set(null);
    this._loading.set(false);
  }

  // ===================================
  // 🔄 LEGACY COMPATIBILITY METHODS
  // ===================================

  // ✅ Legacy methods for backward compatibility (badge-admin component)
  get badges() {
    return this.badgeDefinitions;
  }

  async save(badge: Badge): Promise<void> {
    const exists = this._badgeDefinitions().some(b => b.id === badge.id);
    if (exists) {
      await this.updateBadgeDefinition(badge);
    } else {
      await this.createBadgeDefinition(badge);
    }
  }

  async delete(id: string): Promise<void> {
    await this.deleteBadgeDefinition(id);
  }
}
