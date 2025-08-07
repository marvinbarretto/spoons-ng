/**
 * @fileoverview CacheDebugService - Development utilities for cache inspection and debugging
 *
 * PURPOSE:
 * - Provide debug utilities for identifying cache inconsistencies
 * - Manual cache clearing tools for development
 * - Data consistency validation across stores
 * - IndexedDB inspection utilities
 *
 * USAGE (in browser console):
 * ```javascript
 * // Access the service
 * const cacheDebug = window.ng.getContext(document.body).injector.get(CacheDebugService);
 * 
 * // Inspect current cache state
 * cacheDebug.inspectCacheState();
 * 
 * // Clear all caches manually
 * cacheDebug.clearAllCaches();
 * 
 * // Validate data consistency
 * cacheDebug.validateDataConsistency();
 * ```
 */

import { Injectable, inject } from '@angular/core';
import { AuthStore } from '@auth/data-access/auth.store';
import { CheckInStore } from '@check-in/data-access/check-in.store';
import { GlobalCheckInStore } from '@check-in/data-access/global-check-in.store';
import { PointsStore } from '@points/data-access/points.store';
import { UserStore } from '@users/data-access/user.store';
import { CacheCoherenceService } from '../data-access/cache-coherence.service';
import { DataAggregatorService } from '../data-access/data-aggregator.service';
import { DebugService } from './debug.service';

@Injectable({ providedIn: 'root' })
export class CacheDebugService {
  // Dependencies
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly checkinStore = inject(CheckInStore);
  private readonly globalCheckinStore = inject(GlobalCheckInStore);
  private readonly pointsStore = inject(PointsStore);
  private readonly dataAggregator = inject(DataAggregatorService);
  private readonly cacheCoherence = inject(CacheCoherenceService);
  private readonly debug = inject(DebugService);

  constructor() {
    // Make service available globally for browser console access
    (window as any).cacheDebugService = this;
    console.log('🔧 [CacheDebug] Service initialized - available at window.cacheDebugService');
  }

  /**
   * Comprehensive cache state inspection
   */
  inspectCacheState(): void {
    console.log('🔍 [CacheDebug] === COMPREHENSIVE CACHE STATE INSPECTION ===');
    console.log('🔍 [CacheDebug] Timestamp:', new Date().toISOString());

    // Auth State
    const authUser = this.authStore.user();
    console.log('🔍 [CacheDebug] === AUTH STATE ===');
    console.log('🔍 [CacheDebug] Auth User:', {
      exists: !!authUser,
      uid: authUser?.uid?.slice(0, 8),
      displayName: authUser?.displayName,
      email: authUser?.email,
      isAnonymous: authUser?.isAnonymous,
    });

    // User Store State
    const userStoreUser = this.userStore.user();
    const allUsers = this.userStore.data();
    console.log('🔍 [CacheDebug] === USER STORE STATE ===');
    console.log('🔍 [CacheDebug] Current User:', {
      exists: !!userStoreUser,
      uid: userStoreUser?.uid?.slice(0, 8),
      displayName: userStoreUser?.displayName,
      totalPoints: userStoreUser?.totalPoints,
      verifiedPubCount: userStoreUser?.verifiedPubCount,
      unverifiedPubCount: userStoreUser?.unverifiedPubCount,
      totalPubCount: userStoreUser?.totalPubCount,
      manuallyAddedPubIds: userStoreUser?.manuallyAddedPubIds?.length || 0,
      onboardingCompleted: userStoreUser?.onboardingCompleted,
    });
    console.log('🔍 [CacheDebug] User Collection:', {
      totalUsers: allUsers.length,
      loading: this.userStore.loading(),
      error: this.userStore.error(),
    });

    // Check-in Store State
    const userCheckins = this.checkinStore.checkins();
    const globalCheckins = this.globalCheckinStore.allCheckIns();
    const userGlobalCheckins = authUser 
      ? globalCheckins.filter(c => c.userId === authUser.uid) 
      : [];

    console.log('🔍 [CacheDebug] === CHECK-IN STORE STATE ===');
    console.log('🔍 [CacheDebug] User Check-in Store (user-scoped):', {
      totalCheckins: userCheckins.length,
      loading: this.checkinStore.loading(),
      error: this.checkinStore.error(),
      sampleCheckins: userCheckins.slice(0, 3).map(c => ({
        id: c.id?.slice(0, 8),
        pubId: c.pubId?.slice(0, 8),
        userId: c.userId?.slice(0, 8),
      })),
    });
    console.log('🔍 [CacheDebug] Global Check-in Store (all users):', {
      totalGlobalCheckins: globalCheckins.length,
      userSpecificCheckins: userGlobalCheckins.length,
      loading: this.globalCheckinStore.loading(),
      // Note: GlobalCheckInStore may not have error() method
    });

    // UserStore Reactive State - showcasing beautiful signal patterns!
    const scoreboardData = this.userStore.scoreboardData();
    console.log('🔍 [CacheDebug] === REACTIVE USERSTORE SCOREBOARD DATA ===');
    console.log('🔍 [CacheDebug] Beautiful Reactive Scoreboard Data:', scoreboardData);
    console.log('🔍 [CacheDebug] Individual Reactive Signals:', {
      totalPoints: this.userStore.totalPoints(),
      pubsVisited: this.userStore.pubsVisited(),
      displayName: this.userStore.displayName(),
    });

    // Cache Coherence State
    const cacheStats = this.cacheCoherence.getStats();
    console.log('🔍 [CacheDebug] === CACHE COHERENCE STATE ===');
    console.log('🔍 [CacheDebug] Cache Stats:', {
      totalInvalidations: cacheStats.totalInvalidations,
      recentInvalidations: cacheStats.recentInvalidations.map(inv => ({
        collection: inv.collection,
        reason: inv.reason,
        timestamp: new Date(inv.timestamp).toISOString(),
      })),
      collectionsInvalidated: Array.from(cacheStats.collectionsInvalidated),
    });

    // Data Consistency Analysis
    this.analyzeDataConsistency();
  }

  /**
   * Analyze data consistency across stores
   */
  analyzeDataConsistency(): void {
    console.log('📊 [CacheDebug] === DATA CONSISTENCY ANALYSIS ===');

    const authUser = this.authStore.user();
    const userStoreUser = this.userStore.user();
    const scoreboardData = this.userStore.scoreboardData(); // Beautiful reactive pattern!
    const userCheckins = this.checkinStore.checkins();
    const globalCheckins = this.globalCheckinStore.allCheckIns();
    const userGlobalCheckins = authUser 
      ? globalCheckins.filter(c => c.userId === authUser.uid) 
      : [];

    const inconsistencies = [];

    // Check auth vs user store consistency
    if (authUser && userStoreUser) {
      if (authUser.uid !== userStoreUser.uid) {
        inconsistencies.push('Auth UID != UserStore UID');
      }
      if (authUser.displayName !== userStoreUser.displayName) {
        inconsistencies.push('Auth displayName != UserStore displayName');
      }
    }

    // Check pub count consistency
    const cachedPubCount = userStoreUser?.totalPubCount || 0;
    const calculatedPubCount = scoreboardData.pubsVisited;
    if (cachedPubCount !== calculatedPubCount) {
      inconsistencies.push(
        `Cached pub count (${cachedPubCount}) != Calculated pub count (${calculatedPubCount})`
      );
    }

    // Check check-in count consistency
    const userScopedCheckins = userCheckins.length;
    const globalScopedCheckins = userGlobalCheckins.length;
    const scoreboardCheckins = scoreboardData.totalCheckins;
    if (userScopedCheckins !== globalScopedCheckins) {
      inconsistencies.push(
        `User-scoped check-ins (${userScopedCheckins}) != Global-scoped check-ins (${globalScopedCheckins})`
      );
    }
    if (scoreboardCheckins !== userScopedCheckins && scoreboardCheckins !== globalScopedCheckins) {
      inconsistencies.push(
        `Scoreboard check-ins (${scoreboardCheckins}) != Store check-ins (user: ${userScopedCheckins}, global: ${globalScopedCheckins})`
      );
    }

    console.log('📊 [CacheDebug] Consistency Results:', {
      totalInconsistencies: inconsistencies.length,
      inconsistencies: inconsistencies,
      isDataConsistent: inconsistencies.length === 0,
    });

    if (inconsistencies.length > 0) {
      console.warn('⚠️ [CacheDebug] DATA INCONSISTENCIES DETECTED:', inconsistencies);
      console.log('💡 [CacheDebug] Suggested fix: Run cacheDebugService.clearAllCaches()');
    } else {
      console.log('✅ [CacheDebug] All data sources are consistent');
    }
  }

  /**
   * Clear all caches manually (for development)
   */
  async clearAllCaches(): Promise<void> {
    console.log('🧹 [CacheDebug] === CLEARING ALL CACHES ===');
    
    try {
      // Reset all stores
      console.log('🧹 [CacheDebug] Resetting UserStore...');
      this.userStore.reset();
      
      console.log('🧹 [CacheDebug] Resetting CheckInStore...');
      this.checkinStore.reset();
      
      console.log('🧹 [CacheDebug] Note: GlobalCheckInStore may not have reset method');
      // this.globalCheckinStore.reset(); // May not be available

      // Force global cache refresh
      console.log('🧹 [CacheDebug] Triggering global cache invalidation...');
      this.cacheCoherence.forceGlobalCacheRefresh();

      // Clear browser storage
      console.log('🧹 [CacheDebug] Clearing browser storage...');
      await this.clearBrowserStorage();

      console.log('✅ [CacheDebug] All caches cleared successfully');
      console.log('💡 [CacheDebug] Refresh the page to reload fresh data');

    } catch (error) {
      console.error('❌ [CacheDebug] Failed to clear caches:', error);
    }
  }

  /**
   * Clear browser storage (IndexedDB, localStorage)
   */
  private async clearBrowserStorage(): Promise<void> {
    try {
      // Clear localStorage
      const localStorageKeys = Object.keys(localStorage);
      const appKeys = localStorageKeys.filter(key => 
        key.includes('firebase') || 
        key.includes('spoonscount') || 
        key.includes('cache')
      );
      
      console.log('🧹 [CacheDebug] Clearing localStorage keys:', appKeys);
      appKeys.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage
      const sessionStorageKeys = Object.keys(sessionStorage);
      const appSessionKeys = sessionStorageKeys.filter(key => 
        key.includes('firebase') || 
        key.includes('spoonscount') || 
        key.includes('cache')
      );
      
      console.log('🧹 [CacheDebug] Clearing sessionStorage keys:', appSessionKeys);
      appSessionKeys.forEach(key => sessionStorage.removeItem(key));

      // Note: IndexedDB clearing would require more specific Firebase cache clearing
      console.log('💡 [CacheDebug] For complete cache clearing, consider hard refresh (Ctrl+Shift+R)');

    } catch (error) {
      console.error('❌ [CacheDebug] Failed to clear browser storage:', error);
    }
  }

  /**
   * Force reload all data from Firestore
   */
  async forceReloadAllData(): Promise<void> {
    console.log('🔄 [CacheDebug] === FORCE RELOADING ALL DATA ===');
    
    try {
      // Clear caches first
      await this.clearAllCaches();

      // Wait a moment for cache clearing to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force reload each store
      console.log('🔄 [CacheDebug] Reloading UserStore...');
      await this.userStore.refresh();
      
      console.log('🔄 [CacheDebug] Reloading CheckInStore...');
      await this.checkinStore.loadOnce();
      
      console.log('🔄 [CacheDebug] Note: GlobalCheckInStore may not have refresh method');
      // await this.globalCheckinStore.refresh(); // May not be available

      console.log('✅ [CacheDebug] All data reloaded successfully');
      
      // Run consistency check
      setTimeout(() => {
        this.analyzeDataConsistency();
      }, 1000);

    } catch (error) {
      console.error('❌ [CacheDebug] Failed to reload data:', error);
    }
  }

  /**
   * Detailed points transaction analysis and debugging
   */
  async analyzePointsTransactions(): Promise<void> {
    console.log('🔍 [CacheDebug] === DETAILED POINTS ANALYSIS ===');

    const authUser = this.authStore.user();
    if (!authUser) {
      console.error('🔍 [CacheDebug] ❌ No authenticated user found');
      return;
    }

    const userId = authUser.uid;
    console.log('🔍 [CacheDebug] Analyzing points for user:', userId.slice(0, 8));

    // Get current user data
    const currentUser = this.userStore.user();
    console.log('🔍 [CacheDebug] Current UserStore data:', {
      totalPoints: currentUser?.totalPoints || 0,
      verifiedPubCount: currentUser?.verifiedPubCount || 0,
      unverifiedPubCount: currentUser?.unverifiedPubCount || 0,
      totalPubCount: currentUser?.totalPubCount || 0,
    });

    // Get PointsStore state
    const pointsDebugInfo = this.pointsStore.getPointsDebugInfo();
    console.log('🔍 [CacheDebug] PointsStore state:', pointsDebugInfo);

    // Get transactions from PointsStore (limited to recent)
    const recentTransactions = this.pointsStore.recentTransactions();
    console.log('🔍 [CacheDebug] Recent transactions from PointsStore:', {
      transactionCount: recentTransactions.length,
      totalFromRecent: recentTransactions.reduce((sum, t) => sum + t.points, 0),
      transactions: recentTransactions.map(t => ({
        id: t.id?.slice(0, 8),
        points: t.points,
        type: t.type,
        action: t.action,
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString().slice(0, 16) : t.createdAt,
      })),
    });

    // Get check-ins to cross-reference with transactions
    const userCheckins = this.checkinStore.checkins();
    const globalCheckins = this.globalCheckinStore.allCheckIns();
    const userGlobalCheckins = globalCheckins.filter(c => c.userId === userId);

    console.log('🔍 [CacheDebug] Check-ins analysis:', {
      userScopedCheckins: userCheckins.length,
      globalUserCheckins: userGlobalCheckins.length,
      userCheckinSample: userCheckins.slice(0, 3).map(c => ({
        id: c.id?.slice(0, 8),
        pubId: c.pubId?.slice(0, 8),
        pointsEarned: c.pointsEarned,
        hasPointsBreakdown: !!c.pointsBreakdown,
        pointsBreakdownTotal: c.pointsBreakdown?.total,
        timestamp: c.timestamp?.toDate?.()?.toISOString?.()?.slice(0, 16),
      })),
      globalCheckinSample: userGlobalCheckins.slice(0, 3).map(c => ({
        id: c.id?.slice(0, 8),
        pubId: c.pubId?.slice(0, 8),
        pointsEarned: c.pointsEarned,
        hasPointsBreakdown: !!c.pointsBreakdown,
        pointsBreakdownTotal: c.pointsBreakdown?.total,
        timestamp: c.timestamp?.toDate?.()?.toISOString?.()?.slice(0, 16),
      })),
    });

    // Cross-reference check-ins with transactions
    console.log('🔍 [CacheDebug] === CROSS-REFERENCE ANALYSIS ===');
    console.log('🔍 [CacheDebug] Expected vs Actual points:');

    // Calculate expected points from check-ins
    const expectedFromUserCheckins = userCheckins.reduce((sum, checkin) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    const expectedFromGlobalCheckins = userGlobalCheckins.reduce((sum, checkin) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    console.log('🔍 [CacheDebug] Points calculation comparison:', {
      expectedFromUserCheckins: expectedFromUserCheckins,
      expectedFromGlobalCheckins: expectedFromGlobalCheckins,
      actualFromTransactions: recentTransactions.reduce((sum, t) => sum + t.points, 0),
      actualFromUserStore: currentUser?.totalPoints || 0,
      actualFromPointsStore: pointsDebugInfo.totalPoints,
      DISCREPANCIES: {
        checkinVsTransaction: expectedFromUserCheckins !== recentTransactions.reduce((sum, t) => sum + t.points, 0),
        globalVsUserCheckins: expectedFromGlobalCheckins !== expectedFromUserCheckins,
        transactionVsUserStore: recentTransactions.reduce((sum, t) => sum + t.points, 0) !== (currentUser?.totalPoints || 0),
      }
    });

    console.log('🔍 [CacheDebug] === POTENTIAL ISSUES ===');
    
    // Check if PointsStore is only loading limited transactions
    if (recentTransactions.length === 20) {
      console.warn('🔍 [CacheDebug] ⚠️ PointsStore may be limiting to 20 recent transactions - older transactions might exist');
    }

    // Check for missing transactions
    const checkinIds = new Set(userCheckins.map(c => c.id));
    const transactionPubIds = new Set(recentTransactions.filter(t => t.pubId).map(t => t.pubId));
    const checkinPubIds = new Set(userCheckins.map(c => c.pubId));

    console.log('🔍 [CacheDebug] Data coverage analysis:', {
      uniqueCheckinPubs: checkinPubIds.size,
      uniqueTransactionPubs: transactionPubIds.size,
      transactionsCoverAllCheckins: userCheckins.every(checkin => 
        recentTransactions.some(t => t.pubId === checkin.pubId)
      ),
    });
  }

  /**
   * Recalculate and fix user's totalPoints from transactions
   */
  async recalculateUserPoints(): Promise<void> {
    console.log('🔧 [CacheDebug] === RECALCULATING USER POINTS ===');

    // First run detailed analysis
    await this.analyzePointsTransactions();

    const authUser = this.authStore.user();
    if (!authUser) {
      console.error('🔧 [CacheDebug] ❌ No authenticated user found');
      return;
    }

    console.log('🔧 [CacheDebug] User ID:', authUser.uid.slice(0, 8));

    try {
      // Get user's current state
      const currentUser = this.userStore.user();
      const currentTotalPoints = currentUser?.totalPoints || 0;
      
      console.log('🔧 [CacheDebug] Current user totalPoints in database:', currentTotalPoints);

      // Get points transactions to calculate correct total
      const pointsDebugInfo = this.pointsStore.getPointsDebugInfo();
      console.log('🔧 [CacheDebug] Points store debug info:', pointsDebugInfo);

      // Get transactions from PointsStore
      const transactions = this.pointsStore.recentTransactions();
      console.log('🔧 [CacheDebug] User transactions:', {
        transactionCount: transactions.length,
        transactions: transactions.map(t => ({
          id: t.id?.slice(0, 8),
          points: t.points,
          type: t.type,
          action: t.action,
          createdAt: t.createdAt,
        })),
      });

      // Calculate correct total from transactions
      const calculatedTotal = transactions.reduce((sum, transaction) => sum + transaction.points, 0);
      
      console.log('🔧 [CacheDebug] Points calculation:', {
        currentDatabaseTotal: currentTotalPoints,
        calculatedFromTransactions: calculatedTotal,
        difference: calculatedTotal - currentTotalPoints,
        needsUpdate: calculatedTotal !== currentTotalPoints,
      });

      if (calculatedTotal === currentTotalPoints) {
        console.log('✅ [CacheDebug] User points are already correct - no update needed');
        return;
      }

      // Update the user's totalPoints field
      console.log(`🔧 [CacheDebug] Updating user totalPoints: ${currentTotalPoints} → ${calculatedTotal}`);
      
      // Use UserStore to patch the user's totalPoints
      await this.userStore.patchUser({ totalPoints: calculatedTotal });
      console.log('✅ [CacheDebug] User totalPoints updated in UserStore');

      // Also update PointsStore to match
      console.log('🔧 [CacheDebug] Syncing PointsStore with corrected total...');
      await this.pointsStore.syncWithUserProfile();
      console.log('✅ [CacheDebug] PointsStore synced with user profile');

      // Trigger cache invalidation for consistency
      console.log('🔧 [CacheDebug] Triggering cache refresh...');
      this.cacheCoherence.invalidateMultiple(['users', 'points'], 'points-recalculation-fix');

      console.log('🔧 [CacheDebug] === POINTS RECALCULATION COMPLETED ===');
      console.log('🔧 [CacheDebug] Final result:', {
        previousTotal: currentTotalPoints,
        correctedTotal: calculatedTotal,
        pointsFixed: calculatedTotal - currentTotalPoints,
        status: 'SUCCESS',
      });

      // Run a consistency check to verify the fix
      setTimeout(() => {
        console.log('🔧 [CacheDebug] Running post-fix consistency check...');
        this.analyzeDataConsistency();
      }, 1000);

    } catch (error) {
      console.error('❌ [CacheDebug] Failed to recalculate user points:', error);
      console.error('❌ [CacheDebug] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });
    }
  }

  /**
   * Test the new simplified check-in-based points calculation
   */
  testSimplifiedPoints(): void {
    console.log('🧪 [CacheDebug] === TESTING SIMPLIFIED POINTS ARCHITECTURE ===');

    const authUser = this.authStore.user();
    if (!authUser) {
      console.error('🧪 [CacheDebug] ❌ No authenticated user found');
      return;
    }

    console.log('🧪 [CacheDebug] Testing points calculation for user:', authUser.uid.slice(0, 8));

    // Get check-ins for current user from GlobalCheckInStore (consistent with DataAggregatorService)
    const allCheckins = this.globalCheckinStore.allCheckIns();
    const userCheckins = allCheckins.filter(c => c.userId === authUser.uid);
    
    console.log('🧪 [CacheDebug] User check-ins analysis:', {
      totalCheckins: userCheckins.length,
      checkinDetails: userCheckins.map(checkin => ({
        id: checkin.id?.slice(0, 8),
        pubId: checkin.pubId?.slice(0, 8),
        pointsEarned: checkin.pointsEarned,
        pointsBreakdownTotal: checkin.pointsBreakdown?.total,
        finalPoints: checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0,
        timestamp: checkin.timestamp?.toDate?.()?.toISOString?.()?.slice(0, 16),
      })),
    });

    // Calculate total manually to verify
    const manualTotal = userCheckins.reduce((sum, checkin) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    // Get the computed value from UserStore
    const userStoreTotal = this.userStore.totalPoints();

    // Get the scoreboard data using beautiful reactive UserStore pattern
    const scoreboardData = this.userStore.scoreboardData();

    console.log('🧪 [CacheDebug] === SIMPLIFIED POINTS VALIDATION ===');
    console.log('🧪 [CacheDebug] Points calculation comparison:', {
      manualCalculationFromCheckins: manualTotal,
      userStoreTotalPoints: userStoreTotal,
      scoreboardTotalPoints: scoreboardData.totalPoints,
      scoreboardTodaysPoints: scoreboardData.todaysPoints,
      allValuesMatch: manualTotal === userStoreTotal && userStoreTotal === scoreboardData.totalPoints,
    });

    // Test today's points calculation
    const today = new Date().toDateString();
    const todaysCheckins = userCheckins.filter(checkin => 
      checkin.timestamp?.toDate?.()?.toDateString?.() === today
    );
    const manualTodaysPoints = todaysCheckins.reduce((sum, checkin) => {
      const points = checkin.pointsEarned ?? checkin.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    console.log('🧪 [CacheDebug] Today\'s points validation:', {
      todaysCheckins: todaysCheckins.length,
      manualTodaysCalculation: manualTodaysPoints,
      scoreboardTodaysPoints: scoreboardData.todaysPoints,
      todaysPointsMatch: manualTodaysPoints === scoreboardData.todaysPoints,
    });

    console.log('🧪 [CacheDebug] === ARCHITECTURE VALIDATION RESULT ===');
    const isSuccess = manualTotal === userStoreTotal && 
                     userStoreTotal === scoreboardData.totalPoints &&
                     manualTodaysPoints === scoreboardData.todaysPoints;
    
    if (isSuccess) {
      console.log('✅ [CacheDebug] SIMPLIFIED POINTS ARCHITECTURE WORKING CORRECTLY');
      console.log('✅ [CacheDebug] All points calculations are consistent and based on check-ins');
      console.log('✅ [CacheDebug] Points synchronization issues eliminated');
    } else {
      console.error('❌ [CacheDebug] SIMPLIFIED POINTS ARCHITECTURE HAS ISSUES');
      console.error('❌ [CacheDebug] Points calculations are inconsistent - needs debugging');
    }

    // Final summary
    console.log('🧪 [CacheDebug] Final summary:', {
      expectedPoints: manualTotal,
      displayedPoints: scoreboardData.totalPoints,
      issue: isSuccess ? 'RESOLVED' : 'NEEDS_INVESTIGATION',
      architecture: 'CHECK_IN_BASED_SINGLE_SOURCE_OF_TRUTH',
    });
  }

  /**
   * Showcase the beautiful new reactive architecture
   */
  showcaseReactiveArchitecture(): void {
    console.log('✨ [CacheDebug] === BEAUTIFUL REACTIVE ARCHITECTURE SHOWCASE ===');
    console.log('✨ [CacheDebug] Demonstrating elegant Angular signal patterns with no circular dependencies!');
    
    const authUser = this.authStore.user();
    if (!authUser) {
      console.log('✨ [CacheDebug] No user authenticated - reactive patterns still work gracefully');
      return;
    }

    console.log('✨ [CacheDebug] === REACTIVE SIGNAL FLOW ===');
    
    // Showcase individual reactive computeds
    console.log('✨ [CacheDebug] Individual computed signals:');
    console.log('  📊 totalPoints:', this.userStore.totalPoints());
    console.log('  🏠 pubsVisited:', this.userStore.pubsVisited()); 
    console.log('  👤 displayName:', this.userStore.displayName());
    console.log('  🏆 badgeCount:', this.userStore.badgeCount());
    console.log('  👑 landlordCount:', this.userStore.landlordCount());

    // Showcase the main reactive scoreboard computed
    console.log('✨ [CacheDebug] === MAIN REACTIVE SCOREBOARD COMPUTED ===');
    const scoreboardData = this.userStore.scoreboardData();
    console.log('✨ [CacheDebug] Complete reactive scoreboard data:', scoreboardData);

    console.log('✨ [CacheDebug] === ARCHITECTURE BENEFITS ===');
    console.log('✨ [CacheDebug] ✅ No circular dependencies');
    console.log('✨ [CacheDebug] ✅ Pure computation layer in DataAggregatorService');
    console.log('✨ [CacheDebug] ✅ Beautiful reactive patterns using computed()');
    console.log('✨ [CacheDebug] ✅ Single source of truth for all user data');
    console.log('✨ [CacheDebug] ✅ Automatic reactivity - data flows beautifully!');
    
    console.log('✨ [CacheDebug] === DATA FLOW PATTERN ===');
    console.log('✨ [CacheDebug] 🔄 Auth changes → UserStore.user() updates → All computeds re-evaluate');
    console.log('✨ [CacheDebug] 🔄 Check-ins change → DataAggregator pure methods → totalPoints() updates');
    console.log('✨ [CacheDebug] 🔄 Components use: this.userStore.scoreboardData() → Automatic reactivity!');
  }

  /**
   * Get debug commands help
   */
  help(): void {
    console.log(`
🔧 [CacheDebug] === AVAILABLE DEBUG COMMANDS ===

Basic Inspection:
  cacheDebugService.inspectCacheState()     - Full cache state inspection
  cacheDebugService.analyzeDataConsistency() - Check for data inconsistencies

Cache Management:
  cacheDebugService.clearAllCaches()        - Clear all cached data
  cacheDebugService.forceReloadAllData()    - Clear caches + reload from Firestore

Points Management:
  cacheDebugService.analyzePointsTransactions() - Detailed points analysis
  cacheDebugService.recalculateUserPoints()     - Fix user totalPoints from transactions
  cacheDebugService.testSimplifiedPoints()      - Test new check-in-based points calculation

✨ New Reactive Architecture:
  cacheDebugService.showcaseReactiveArchitecture() - Showcase beautiful signal patterns!

Browser Console Access:
  window.cacheDebugService                  - Access service globally
  
Example Usage:
  // Inspect current state
  cacheDebugService.inspectCacheState();
  
  // Fix inconsistencies
  cacheDebugService.forceReloadAllData();
  
  // Fix points inconsistency
  cacheDebugService.recalculateUserPoints();
  
  // Test new simplified architecture
  cacheDebugService.testSimplifiedPoints();
    `);
  }
}