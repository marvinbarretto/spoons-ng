// src/app/shared/utils/dev-debug/dev-debug.component.ts
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';

// Base and Services
import { BaseComponent } from '@shared/base/base.component';
import { CleanupService, type CleanupResult, type UserDeletionSummary } from '@shared/utils/cleanup.service';
import { CarpetStorageService } from '@carpets/data-access/carpet-storage.service';

import { DataAggregatorService } from '@shared/data-access/data-aggregator.service';

// Stores
import { AuthStore } from '@auth/data-access/auth.store';
import { UserStore } from '@users/data-access/user.store';
import { PubStore } from '@pubs/data-access/pub.store';
import { NearbyPubStore } from '@pubs/data-access/nearby-pub.store';
import { CheckInStore } from '@/app/check-in/data-access/check-in.store';
import { LandlordStore } from '@landlord/data-access/landlord.store';
import { BadgeStore } from '@badges/data-access/badge.store';
import { LeaderboardStore } from '../../../leaderboard/data-access/leaderboard.store';
import { FeedbackStore } from '../../../feedback/data-access/feedback.store';
import { FirebaseMetricsService } from '@fourfold/angular-foundation';

// Import the carpet debug component
import { CarpetDebugComponent } from './carpet-debug.component';

@Component({
  selector: 'app-dev-debug',
  imports: [JsonPipe, DatePipe, CarpetDebugComponent],
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
  protected readonly leaderboardStore = inject(LeaderboardStore);
  protected readonly feedbackStore = inject(FeedbackStore);

  private readonly cleanupService = inject(CleanupService);
  private readonly carpetStorageService = inject(CarpetStorageService);
  // Database metrics service removed - focus on core functionality
  private readonly firebaseMetricsService = inject(FirebaseMetricsService);
  protected readonly dataAggregatorService = inject(DataAggregatorService);

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
    earnedBadges: 0,
    userMissionProgress: 0,
    pointsTransactions: 0,
    missions: 0,
    feedback: 0
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

  // User analysis state
  protected readonly userAnalysis = signal<UserDeletionSummary | null>(null);
  protected readonly analysisLoading = signal(false);

  // Firebase operations state
  readonly showFirebaseWidget = signal(true);

  // Computed stats from metrics service
  // Performance metrics removed - using Firebase native metrics instead
  // Cost estimates removed - premature optimization

  // Real business data from stores
  readonly pendingFeedback = this.feedbackStore.pendingFeedback;
  readonly scoreboardData = this.dataAggregatorService.scoreboardData;

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

  // Firebase-specific computed properties
  readonly firebaseOperations = computed(() => {
    const fbMetrics = this.firebaseMetricsService.getSessionSummary();

    return {
      totalOperations: fbMetrics.totalCalls,
      operationsPerMinute: fbMetrics.callsPerMinute,
      topCollections: [] // Database metrics removed
    };
  });

  // Cache effectiveness metrics removed - Firebase handles this

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
   * Clear users and ALL their cached data (Firestore + IndexedDB) - PROTECTS REAL USERS
   */
  protected async clearAllUsers(): Promise<void> {
    // First analyze users to show what will be protected
    console.log('[DevDebugComponent] 🔍 Analyzing users before deletion...');

    try {
      const analysis = await this.cleanupService.analyzeUsers();
      this.userAnalysis.set(analysis);

      const protectionMessage = analysis.realUsers > 0
        ? `\n🛡️ PROTECTION: ${analysis.realUsers} real users will be PROTECTED and kept safe`
        : '\n✅ No real users found - safe to proceed';

      const deletionMessage = analysis.testUsers > 0
        ? `\n🗑️ DELETION: ${analysis.testUsers} test users will be deleted`
        : '\n✅ No test users to delete';

      if (!confirm(`🧹 Clear test data and cached images?\n\nThis will:${protectionMessage}${deletionMessage}\n• Delete: Check-ins, landlords, earned badges\n• Clear: All cached carpet images\n• Keep: Badge definitions, pub data, real users\n\nContinue?`)) return;

    } catch (error) {
      console.error('[DevDebugComponent] Failed to analyze users:', error);
      if (!confirm('⚠️ Could not analyze users for protection. Proceed with caution?\n\nThis will clear test data but may not protect real users properly.')) return;
    }

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      console.log('[DevDebugComponent] 🧹 Starting comprehensive PROTECTED user cleanup...');
      console.log('[DevDebugComponent] 🛡️ Real users will be protected during this operation');

      // 1. Clear Firestore data (all test data except badge definitions) - NOW PROTECTED
      const firestoreResults = await this.cleanupService.clearAllTestData();
      console.log('[DevDebugComponent] ✅ Firestore cleanup completed (real users protected):', firestoreResults);

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

  // Individual collection clearing methods removed for UI simplification
  // Use nuclear reset or test data clearing instead

  protected async clearUsersOnly(): Promise<void> {
    // Analyze users first
    console.log('[DevDebugComponent] 🔍 Analyzing users before deletion...');

    try {
      const analysis = await this.cleanupService.analyzeUsers();
      this.userAnalysis.set(analysis);

      const protectionMessage = analysis.realUsers > 0
        ? `🛡️ ${analysis.realUsers} real users will be PROTECTED\n`
        : '✅ No real users to protect\n';

      const deletionMessage = analysis.testUsers > 0
        ? `🗑️ ${analysis.testUsers} test users will be deleted\n`
        : '✅ No test users to delete\n';

      if (!confirm(`Delete test users only? (keeps badges, check-ins, etc.)\n\n${protectionMessage}${deletionMessage}(Keeps: badges, check-ins, etc.)\n\nContinue?`)) return;

    } catch (error) {
      console.error('[DevDebugComponent] Failed to analyze users:', error);
      if (!confirm('⚠️ Could not analyze users. Proceed with deletion?')) return;
    }

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      console.log('[DevDebugComponent] 👥 Deleting test users only (protecting real users)...');
      const result = await this.cleanupService.clearUsers(); // Now protected by default
      this.lastCleanupResult.set(result);

      if (result.protectedCount && result.protectedCount > 0) {
        console.log(`[DevDebugComponent] ✅ Protected ${result.protectedCount} real users`);
      }
      console.log(`[DevDebugComponent] ✅ Deleted ${result.deletedCount} test users`);

      await this.refreshCounts();
      this.userStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  /**
   * DANGEROUS: Clear ALL users including real users
   */
  protected async clearAllUsersIncludingReal(): Promise<void> {
    console.log('[DevDebugComponent] ⚠️ DANGER MODE: Analyzing ALL users for deletion...');

    try {
      const analysis = await this.cleanupService.analyzeUsers();
      this.userAnalysis.set(analysis);

      if (analysis.realUsers > 0) {
        const realUserDetails = await this.cleanupService.getRealUsers();
        const usersList = realUserDetails.map(u => `• ${u.displayName} (${u.uid.slice(0, 8)})`).join('\n');

        if (!confirm(`⚠️ DANGER: This will delete ${analysis.realUsers} REAL USERS!\n\nReal users to be deleted:\n${usersList}\n\nThis action cannot be undone!\n\nAre you absolutely sure?`)) return;
        if (!confirm('Last chance! This will permanently delete real users. Continue?')) return;
      }

    } catch (error) {
      console.error('[DevDebugComponent] Failed to analyze users:', error);
      if (!confirm('⚠️ Could not analyze users. This is dangerous. Really proceed?')) return;
    }

    this.cleanupLoading.set(true);
    this.lastCleanupResult.set(null);

    try {
      console.log('[DevDebugComponent] ⚠️ DANGER: Deleting ALL users including real users...');
      const result = await this.cleanupService.clearAllUsersIncludingReal();
      this.lastCleanupResult.set(result);

      console.log(`[DevDebugComponent] ⚠️ COMPLETED: Deleted ${result.deletedCount} users (including real users)`);

      await this.refreshCounts();
      this.userStore.reset();
    } finally {
      this.cleanupLoading.set(false);
    }
  }

  /**
   * Analyze users without deleting
   */
  protected async analyzeUsersOnly(): Promise<void> {
    this.analysisLoading.set(true);

    try {
      console.log('[DevDebugComponent] 🔍 Analyzing users...');
      const analysis = await this.cleanupService.analyzeUsers();
      this.userAnalysis.set(analysis);

      const realUsers = await this.cleanupService.getRealUsers();

      console.group('👥 User Analysis Results');
      console.log(`Total Users: ${analysis.totalUsers}`);
      console.log(`Real Users: ${analysis.realUsers} (protected)`);
      console.log(`Test Users: ${analysis.testUsers} (deletable)`);
      if (realUsers.length > 0) {
        console.log('Real User Details:', realUsers.map(u => ({
          uid: u.uid.slice(0, 8),
          name: u.displayName,
          email: u.email,
          joined: u.joinedAt
        })));
      }
      console.groupEnd();

    } catch (error) {
      console.error('[DevDebugComponent] Failed to analyze users:', error);
    } finally {
      this.analysisLoading.set(false);
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

  // Debugging methods removed for UI simplification
  // Use browser dev tools and console logs from cleanup operations instead

  // ===================================
  // 🔥 FIREBASE OPERATIONS HELPERS
  // ===================================

  clearFirebaseCache(): void {
    this.firebaseMetricsService.resetSession('Manual cache clear from dev-debug');
    console.log('🗑️ [DevDebugComponent] Firebase cache cleared');
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatJSON(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `[Error formatting JSON: ${error}]`;
    }
  }
}
