/**
 * @fileoverview Cache Tier Configuration
 * 
 * Defines standardized caching strategies based on data characteristics:
 * - STATIC: Reference data that rarely changes (pubs, missions, badges)
 * - PERSONAL: User-specific data with moderate update frequency
 * - SOCIAL: Dynamic social data requiring frequent updates
 * 
 * Each tier has predefined TTL and strategy optimized for its use case.
 */

export enum CacheTier {
  STATIC = 'static',
  PERSONAL = 'personal', 
  SOCIAL = 'social'
}

export type CacheStrategy = 'cache-first' | 'network-first' | 'cache-only' | 'network-only';

export interface CacheConfig {
  ttl: number;
  strategy: CacheStrategy;
  invalidateOn?: string[];
}

export interface TierConfig {
  [CacheTier.STATIC]: CacheConfig;
  [CacheTier.PERSONAL]: CacheConfig;
  [CacheTier.SOCIAL]: CacheConfig;
}

/**
 * Predefined cache configurations for each tier
 * 
 * Based on data access patterns and business requirements:
 * - Static data: Long TTL, cache-first for performance
 * - Personal data: Medium TTL, cache-first with invalidation
 * - Social data: Short TTL, network-first for freshness
 */
export const TIER_CONFIGS: TierConfig = {
  [CacheTier.STATIC]: {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    strategy: 'cache-first'
  },
  
  [CacheTier.PERSONAL]: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    strategy: 'cache-first'
  },
  
  [CacheTier.SOCIAL]: {
    ttl: 5 * 60 * 1000, // 5 minutes
    strategy: 'network-first'
  }
};

/**
 * Collection to tier mappings
 * 
 * Defines which cache tier each Firestore collection should use.
 * Add new collections here as they're implemented.
 */
export const COLLECTION_TIERS: Record<string, CacheTier> = {
  // Static reference data
  'pubs': CacheTier.STATIC,
  'missions': CacheTier.STATIC,
  'badges': CacheTier.STATIC,
  'landlords': CacheTier.STATIC,
  
  // Personal user data
  'checkins': CacheTier.PERSONAL,
  'user-profiles': CacheTier.PERSONAL,
  'user-missions': CacheTier.PERSONAL,
  'user-mission-progress': CacheTier.PERSONAL,
  
  // Dynamic social data
  'leaderboards': CacheTier.SOCIAL,
  'recent-activity': CacheTier.SOCIAL
};

/**
 * Get cache configuration for a collection
 * 
 * @param collection Firestore collection name
 * @returns Cache configuration based on tier mapping
 */
export function getCacheConfigForCollection(collection: string): CacheConfig {
  const tier = COLLECTION_TIERS[collection] || CacheTier.PERSONAL;
  return TIER_CONFIGS[tier];
}

/**
 * Get cache tier for a collection
 * 
 * @param collection Firestore collection name  
 * @returns Cache tier enum value
 */
export function getCacheTierForCollection(collection: string): CacheTier {
  return COLLECTION_TIERS[collection] || CacheTier.PERSONAL;
}