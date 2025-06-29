// src/app/shared/utils/dev-debug/dev-debug.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';

// Base and Services
import { BaseComponent } from '@shared/base/base.component';
import { CleanupService, type CleanupResult } from '@shared/utils/cleanup.service';
import { CarpetStorageService } from '@carpets/data-access/carpet-storage.service';

// Stores
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { PubStore } from '@pubs/data-access/pub.store';
import { NearbyPubStore } from '@pubs/data-access/nearby-pub.store';
import { CheckInStore } from '@/app/check-in/data-access/check-in.store';
import { LandlordStore } from '@landlord/data-access/landlord.store';
import { BadgeStore } from '@badges/data-access/badge.store';

@Component({
  selector: 'app-dev-debug',
  imports: [JsonPipe, DatePipe],
  templateUrl: './dev-debug.component.html',
  styleUrl: './dev-debug.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevDebugComponent extends BaseComponent {

  // ===================================
  // 🏪 STORE INJECTIONS
  // ===================================

  protected readonly authStore = inject(AuthStore);
  protected readonly userStore = inject(UserStore);
  protected readonly pubStore = inject(PubStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  protected readonly checkinStore = inject(CheckInStore);
  protected readonly landlordStore = inject(LandlordStore);
  protected readonly badgeStore = inject(BadgeStore);

  private readonly cleanupService = inject(CleanupService);
  private readonly carpetStorageService = inject(CarpetStorageService);

  // ===================================
  // 📊 STATE MANAGEMENT
  // ===================================

  // UI state
  readonly isExpanded = signal(false);
  readonly showVerbose = signal(false);

  // Collection counts
  protected readonly counts = signal({
    users: 0,
    checkIns: 0,
    pubs: 0,
    landlords: 0,
    earnedBadges: 0
  });

  // Database summary
  protected readonly databaseSummary = signal<{
    totalDocuments: number;
    isEmpty: boolean;
    lastUpdated?: number;
  } | null>(null);

  // Cleanup state
  protected readonly cleanupLoading = signal(false);
  protected readonly lastCleanupResult = signal<CleanupResult | null>(null);

  // ===================================
  // 🔍 COMPUTED DATA FOR DISPLAY
  // ===================================

  // Quick status summary for header
  readonly storeStatus = computed(() => [
    {
      name: 'Auth',
      status: this.authStore.ready() ? (this.authStore.user() ? 'healthy' : 'empty') : 'loading',
      indicator: this.authStore.ready() ? (this.authStore.user() ? '✅' : '👤') : '⏳',
      count: this.authStore.user()?.uid?.slice(-4) || 'none'
    },
    {
      name: 'Pubs',
      status: this.pubStore.loading() ? 'loading' : (this.pubStore.data().length > 0 ? 'healthy' : 'empty'),
      indicator: this.pubStore.loading() ? '⏳' : (this.pubStore.data().length > 0 ? '✅' : '📭'),
      count: this.pubStore.data().length.toString()
    },
    {
      name: 'User',
      status: this.userStore.loading() ? 'loading' : (this.userStore.user() ? 'healthy' : 'empty'),
      indicator: this.userStore.loading() ? '⏳' : (this.userStore.user() ? '✅' : '👤'),
      count: this.userStore.user() ? 'loaded' : 'none'
    },
    {
      name: 'Check-ins',
      status: this.checkinStore.loading() ? 'loading' :
             this.checkinStore.error() ? 'error' :
             this.checkinStore.data().length > 0 ? 'healthy' : 'empty',
      indicator: this.checkinStore.loading() ? '⏳' :
                this.checkinStore.error() ? '❌' :
                this.checkinStore.data().length > 0 ? '✅' : '📭',
      count: this.checkinStore.data().length.toString()
    },
    {
      name: 'Badges',
      status: this.badgeStore.loading() ? 'loading' :
             this.badgeStore.error() ? 'error' :
             this.badgeStore.hasEarnedBadges() ? 'healthy' : 'empty',
      indicator: this.badgeStore.loading() ? '⏳' :
                this.badgeStore.error() ? '❌' :
                this.badgeStore.hasEarnedBadges() ? '🏆' : '📭',
      count: `${this.badgeStore.earnedBadgeCount()}/${this.badgeStore.definitions().length}`
    }
  ]);

  // Authentication status for display
  readonly authData = computed(() => ({
    isAuthenticated: !!this.authStore.user(),
    user: this.authStore.user(),
    ready: this.authStore.ready(),
    // error: this.authStore.error()
  }));

  // Database health summary
  readonly databaseHealth = computed(() => {
    const summary = this.databaseSummary();
    const counts = this.counts();

    return {
      totalDocuments: summary?.totalDocuments || 0,
      isEmpty: summary?.isEmpty || false,
      collections: Object.entries(counts).map(([name, count]) => ({
        name,
        count,
        isEmpty: count === 0
      })),
      lastUpdated: summary?.lastUpdated
    };
  });

  // ===================================
  // 🚀 INITIALIZATION
  // ===================================

  constructor() {
    super();
    // Auto-refresh data when component initializes
    this.refreshCounts();
    this.refreshDatabaseSummary();
  }

  // ===================================
  // 🎛️ UI ACTIONS
  // ===================================

  toggleExpanded(): void {
    this.isExpanded.update(expanded => !expanded);
  }

  toggleVerbose(): void {
    this.showVerbose.update(verbose => !verbose);
  }

  // ===================================
  // 🧽 CLEANUP METHODS
  // ===================================

  /**
   * Nuclear option - clear absolutely everything including badge definitions
   */
  protected async clearEverything(): Promise<void> {
    if (!confirm('☢️ NUCLEAR OPTION: Delete ALL data including badge definitions?')) return;
    if (!confirm('This will destroy EVERYTHING. Are you absolutely sure?')) return;
    if (!confirm('Last chance - this cannot be undone!')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      const results = await this.cleanupService.clearEverything();

      const totalDeleted = Object.values(results).reduce((sum, result) =>
        sum + (result.deletedCount || 0), 0
      );

      const allSuccess = Object.values(results).every(result => result.success);

      this.lastCleanupResult.set({
        success: allSuccess,
        deletedCount: totalDeleted,
        error: allSuccess ? undefined : 'Some nuclear cleanup operations failed'
      });

      await this.refreshCounts();
      await this.refreshDatabaseSummary();

      // Reset ALL stores
      this.userStore.reset();
      this.checkinStore.reset();
      this.landlordStore.reset();
      this.badgeStore.reset();
      this.pubStore.reset();

      console.log('[DevDebugComponent] ☢️ Nuclear cleanup completed:', results);

    } catch (error: any) {
      console.error('[DevDebugComponent] ☢️ Nuclear cleanup failed:', error);
      this.lastCleanupResult.set({
        success: false,
        deletedCount: 0,
        error: error?.message || 'Nuclear cleanup failed'
      });
    } finally {
      this.cleanupLoading.set(false);
    }
  }


  /**
   * Clear users and ALL their cached data (Firestore + IndexedDB)
   */
  protected async clearAllUsers(): Promise<void> {
    if (!confirm('🧹 Clear ALL test data and cached images? This includes:')) return;
    if (!confirm('• Firestore: Users, check-ins, landlords, earned badges\n• IndexedDB: All cached carpet images\n• Keeps: Badge definitions, pub data\n\nThis cannot be undone!')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      console.log('[DevDebugComponent] 🧹 Starting comprehensive user cleanup...');

      // 1. Clear Firestore data (all test data except badge definitions)
      const firestoreResults = await this.cleanupService.clearAllTestData();
      console.log('[DevDebugComponent] ✅ Firestore cleanup completed:', firestoreResults);

      // 2. Clear IndexedDB carpet images
      let indexedDbSuccess = true;
      let indexedDbError: string | undefined;
      try {
        await this.carpetStorageService.clearAllCarpets();
        console.log('[DevDebugComponent] ✅ IndexedDB carpet cleanup completed');
      } catch (error: any) {
        console.error('[DevDebugComponent] ❌ IndexedDB carpet cleanup failed:', error);
        indexedDbSuccess = false;
        indexedDbError = error?.message || 'IndexedDB cleanup failed';
      }

      // 3. Calculate results
      const firestoreDeleted = firestoreResults.users.deletedCount +
        firestoreResults.checkIns.deletedCount +
        firestoreResults.landlords.deletedCount +
        firestoreResults.earnedBadges.deletedCount;
      const firestoreSuccess = firestoreResults.users.success &&
        firestoreResults.checkIns.success &&
        firestoreResults.landlords.success &&
        firestoreResults.earnedBadges.success;
      const overallSuccess = firestoreSuccess && indexedDbSuccess;

      this.lastCleanupResult.set({
        success: overallSuccess,
        deletedCount: firestoreDeleted,
        error: overallSuccess ? undefined :
          `${!firestoreSuccess ? 'Firestore cleanup issues. ' : ''}${!indexedDbSuccess ? `IndexedDB error: ${indexedDbError}` : ''}`
      });

      // 4. Refresh data and reset stores
      await this.refreshCounts();
      await this.refreshDatabaseSummary();

      // Reset ALL relevant stores (matching nuclear option pattern)
      this.userStore.reset();
      this.checkinStore.reset();
      this.landlordStore.reset();

      // For badge store, also clear the cache to ensure complete reset
      this.badgeStore.reset();

      // Force reload badge definitions but clear earned badges
      setTimeout(() => {
        this.badgeStore.loadDefinitions();
      }, 100);

      console.log('[DevDebugComponent] ✅ Comprehensive user cleanup finished');

    } catch (error: any) {
      console.error('[DevDebugComponent] ❌ Comprehensive user cleanup failed:', error);
      this.lastCleanupResult.set({
        success: false,
        deletedCount: 0,
        error: error?.message || 'Comprehensive user cleanup failed'
      });
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  /**
   * Clear individual collections
   */
  protected async clearCheckIns(): Promise<void> {
    if (!confirm('Delete ALL check-ins? This cannot be undone.')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      const result = await this.cleanupService.clearCheckIns();
      this.lastCleanupResult.set(result);
      await this.refreshCounts();
      this.checkinStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  protected async clearLandlords(): Promise<void> {
    if (!confirm('Delete ALL landlords? This cannot be undone.')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      const result = await this.cleanupService.clearLandlords();
      this.lastCleanupResult.set(result);
      await this.refreshCounts();
      this.landlordStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  protected async clearEarnedBadges(): Promise<void> {
    if (!confirm('Delete ALL earned badges? (keeps badge definitions)')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      const result = await this.cleanupService.clearEarnedBadges();
      this.lastCleanupResult.set(result);
      await this.refreshCounts();
      this.badgeStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  protected async clearPubs(): Promise<void> {
    if (!confirm('Delete ALL pubs? This cannot be undone.')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      const result = await this.cleanupService.clearCollection('pubs');
      this.lastCleanupResult.set(result);
      await this.refreshCounts();
      this.pubStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  protected async clearUsersOnly(): Promise<void> {
    if (!confirm('Delete ALL users only? (keeps badges, check-ins, etc.)')) return;

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      const result = await this.cleanupService.clearUsers();
      this.lastCleanupResult.set(result);
      await this.refreshCounts();
      this.userStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  // ===================================
  // 🔄 REFRESH METHODS
  // ===================================

  protected async refreshCounts(): Promise<void> {
    try {
      const newCounts = await this.cleanupService.getCollectionCounts();
      this.counts.set(newCounts);
      console.log('[DevDebugComponent] 📊 Refreshed counts:', newCounts);
    } catch (error: any) {
      console.error('[DevDebugComponent] ❌ Error refreshing counts:', error);
    }
  }

  protected async refreshDatabaseSummary(): Promise<void> {
    try {
      const summary = await this.cleanupService.getDatabaseSummary();
      this.databaseSummary.set({
        totalDocuments: summary.totalDocuments,
        isEmpty: summary.isEmpty,
        lastUpdated: Date.now()
      });
      console.log('[DevDebugComponent] 📊 Database summary:', summary);
    } catch (error: any) {
      console.error('[DevDebugComponent] ❌ Error refreshing database summary:', error);
    }
  }

  async refreshAllStores(): Promise<void> {
    console.log('[DevDebugComponent] 🔄 Refreshing all stores and database info...');

    // Refresh database info first
    await Promise.all([
      this.refreshCounts(),
      this.refreshDatabaseSummary()
    ]);

    // Then refresh stores
    this.pubStore.loadOnce();
    this.badgeStore.loadOnce();

    const user = this.authStore.user();
    if (user) {
      console.log(`[DevDebugComponent] Loading user-specific data for: ${user.uid}`);
      this.checkinStore.loadOnce();
      this.userStore.loadUser(user.uid);
    } else {
      console.log('[DevDebugComponent] No authenticated user - skipping user-specific stores');
    }
  }

  // ===================================
  // 🔐 AUTH ACTIONS
  // ===================================

  onLoginGoogle(): void {
    console.log('[DevDebugComponent] 🔐 Google login requested');
    this.authStore.loginWithGoogle();
  }

  onLogout(): void {
    console.log('[DevDebugComponent] 🚪 Logout requested');
    this.authStore.logout();
  }

  testUpdateDisplayName(): void {
    const user = this.authStore.user();
    if (!user) {
      console.log('[DevDebugComponent] Cannot update name - no user');
      return;
    }

    const newName = `Test Name ${Date.now()}`;
    console.log('[DevDebugComponent] 🧪 Testing display name update:', newName);

    this.userStore.updateDisplayName(newName).then(() => {
      console.log('[DevDebugComponent] Name updated successfully to:', newName);
    }).catch(err => {
      console.log('[DevDebugComponent] Name update failed:', err.message);
    });
  }

  // ===================================
  // 🔍 DEBUGGING HELPERS
  // ===================================

  logDatabaseState(): void {
    const counts = this.counts();
    const summary = this.databaseSummary();
    const health = this.databaseHealth();

    console.group('🔍 [DevDebugComponent] Database State');
    console.log('Collection Counts:', counts);
    console.log('Database Summary:', summary);
    console.log('Database Health:', health);
    console.log('Store Status:', this.storeStatus());
    console.groupEnd();
  }

  debugBadgeState(): void {
    const user = this.authStore.user();
    const badgeState = {
      user: user ? { uid: user.uid, displayName: user.displayName } : null,
      definitions: this.badgeStore.definitions().length,
      earnedBadges: this.badgeStore.earnedBadges().length,
      loading: this.badgeStore.loading(),
      error: this.badgeStore.error(),
      debugInfo: this.badgeStore.getDebugInfo()
    };

    console.log('🔍 [DevDebugComponent] Badge State Debug:', badgeState);
  }

  resetBadgeStore(): void {
    console.log('[DevDebugComponent] 🔄 Force resetting badge store...');
    this.badgeStore.reset();
    console.log('[DevDebugComponent] ✅ Badge store reset complete');
  }

  async checkDatabaseEmpty(): Promise<void> {
    const summary = await this.cleanupService.getDatabaseSummary();
    const message = summary.isEmpty
      ? '✅ Database is completely empty'
      : `📊 Database has ${summary.totalDocuments} documents total`;

    console.log('[DevDebugComponent]', message);
    alert(message);
  }

  clearErrors(): void {
    console.log('🧹 [DevDebugComponent] Clearing store errors...');
    [this.pubStore, this.checkinStore, this.userStore, this.badgeStore].forEach(store => {
      if ('clearError' in store && typeof store.clearError === 'function') {
        store.clearError();
      }
    });
  }
}
