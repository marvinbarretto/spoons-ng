/**
 * Mobile Optimization Services
 * 
 * PURPOSE: Barrel export for all mobile-specific optimization services.
 * These services are ONLY used on native mobile platforms (Android/iOS).
 * 
 * SEPARATION: Web app continues using existing services without these optimizations.
 * Mobile optimizations are additive and don't interfere with working web functionality.
 * 
 * USAGE:
 * - Import from this index for clean imports
 * - Services automatically detect platform and activate only when appropriate
 * - All services handle errors gracefully and won't break app startup
 */

// Core mobile optimization services
export { MobileLocationOptimizer } from './mobile-location-optimizer.service';
// MobileCameraOptimizer removed - using direct platform conditionals in components
export { MobileInitializationService } from './mobile-initialization.service';

// Feature flags and utilities (future)
// export { MobileFeatureFlags } from './mobile-feature-flags.service';
// export { MobilePermissionCoordinator } from './mobile-permission-coordinator.service';
// export { MobilePerformanceMonitor } from './mobile-performance-monitor.service';