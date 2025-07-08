/**
 * @fileoverview Test Providers Utility
 * 
 * Standardized test providers following Firebase best practices:
 * - Mock at service layer, not Firebase SDK level
 * - Consistent provider patterns across all tests
 * - Easy to use helper functions
 * 
 * Usage:
 * ```typescript
 * import { getStandardTestProviders } from './testing/test-providers';
 * 
 * beforeEach(async () => {
 *   await TestBed.configureTestingModule({
 *     imports: [MyComponent],
 *     providers: getStandardTestProviders()
 *   }).compileComponents();
 * });
 * ```
 */

import { Provider } from '@angular/core';
import { 
  MockAuthStore, 
  MockUserStore, 
  MockCheckInStore,
  MockUserService,
  MockLandlordService,
  MockEarnedBadgeService,
  MockCacheCoherenceService,
  MockDataAggregatorService,
  MockViewportService,
  MockPanelStore
} from './store-mocks';

// Core services
import { AuthStore } from '../auth/data-access/auth.store';
import { UserStore } from '../users/data-access/user.store';
import { CheckInStore } from '../check-in/data-access/check-in.store';
import { UserService } from '../users/data-access/user.service';
import { LandlordService } from '../landlord/data-access/landlord.service';
import { EarnedBadgeService } from '../badges/data-access/earned-badge.service';
import { CacheCoherenceService } from '../shared/data-access/cache-coherence.service';
import { DataAggregatorService } from '../shared/data-access/data-aggregator.service';
import { ViewportService } from '../shared/data-access/viewport.service';
import { PanelStore } from '../shared/ui/panel/panel.store';

/**
 * Standard test providers for most component tests
 * Replaces Firebase-dependent services with mocks
 */
export function getStandardTestProviders(): Provider[] {
  return [
    // Core stores
    { provide: AuthStore, useClass: MockAuthStore },
    { provide: UserStore, useClass: MockUserStore },
    { provide: CheckInStore, useClass: MockCheckInStore },
    
    // Firebase-dependent services (following best practices)
    { provide: UserService, useClass: MockUserService },
    { provide: LandlordService, useClass: MockLandlordService },
    { provide: EarnedBadgeService, useClass: MockEarnedBadgeService },
    { provide: CacheCoherenceService, useClass: MockCacheCoherenceService },
    
    // Shared services
    { provide: DataAggregatorService, useClass: MockDataAggregatorService },
    { provide: ViewportService, useClass: MockViewportService },
    { provide: PanelStore, useClass: MockPanelStore }
  ];
}

/**
 * Minimal test providers for simple unit tests
 * Only includes core dependencies
 */
export function getMinimalTestProviders(): Provider[] {
  return [
    { provide: AuthStore, useClass: MockAuthStore },
    { provide: ViewportService, useClass: MockViewportService }
  ];
}

/**
 * Extended test providers for complex components
 * Includes additional services that might be needed
 */
export function getExtendedTestProviders(): Provider[] {
  return [
    ...getStandardTestProviders(),
    // Add additional providers here as needed
    // { provide: SomeOtherService, useClass: MockSomeOtherService }
  ];
}

/**
 * Service-specific providers for testing individual services
 * Use when testing services in isolation
 */
export function getServiceTestProviders(): Provider[] {
  return [
    { provide: CacheCoherenceService, useClass: MockCacheCoherenceService },
    { provide: UserService, useClass: MockUserService },
    { provide: LandlordService, useClass: MockLandlordService },
    { provide: EarnedBadgeService, useClass: MockEarnedBadgeService }
  ];
}

/**
 * Quick setup for component tests that need Firebase services
 * Automatically provides all necessary mocks
 */
export function setupComponentTest(imports: any[] = []): any {
  return {
    imports,
    providers: getStandardTestProviders()
  };
}