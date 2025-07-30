import { Injectable, computed, inject } from '@angular/core';
import { CheckInStore } from '../../check-in/data-access/check-in.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import { UserService } from '../../users/data-access/user.service';

export type UserPubVisit = {
  userId: string;
  pubId: string;
  city?: string;
  region?: string;
  country?: string;
  visitCount: number;
};

export type UserHomePubMapping = {
  userId: string;
  homePubId?: string;
  city?: string;
  region?: string;
  country?: string;
};

export type GeographicGroup = {
  [key: string]: string[]; // Geographic location -> list of user IDs
};

@Injectable({ providedIn: 'root' })
export class PubGroupingService {
  private readonly checkinStore = inject(CheckInStore);
  private readonly pubStore = inject(PubStore);
  private readonly userService = inject(UserService);

  // Performance safeguards
  private readonly MAX_CHECKINS_FOR_REALTIME = 10000;
  private readonly MAX_USERS_PER_GROUP = 1000;

  // Create reactive mapping of user visits to pubs with geographic data
  readonly userPubVisits = computed(() => {
    const checkins = this.checkinStore.checkins();
    const pubs = this.pubStore.pubs();

    // Debug logging for geographic filtering diagnosis (legacy check-in based approach)
    console.log('[PubGroupingService] 🔍 LEGACY CHECK-IN DIAGNOSTIC INFO:');
    console.log('[PubGroupingService] 📊 Total pubs:', pubs.length);
    console.log('[PubGroupingService] 📊 Total check-ins:', checkins.length);
    console.log(
      '[PubGroupingService] ⚠️ Note: Geographic filters now use HOME PUB data, not check-in data'
    );

    if (checkins.length > 0) {
      const sampleCheckin = checkins[0];
      console.log('[PubGroupingService] ✅ Sample check-in:', {
        userId: sampleCheckin.userId,
        pubId: sampleCheckin.pubId,
        timestamp: sampleCheckin.timestamp?.toDate?.(),
      });
    } else {
      console.log(
        '[PubGroupingService] ⚠️ NO CHECK-INS FOUND (but geographic filters use home pub data now)'
      );
    }

    // Performance monitoring
    const startTime = performance.now();
    const checkinCount = checkins.length;

    if (checkinCount > this.MAX_CHECKINS_FOR_REALTIME) {
      console.warn(
        `[PubGroupingService] Large dataset (${checkinCount} checkins), using optimized processing`
      );
      return this.processOptimizedVisits(checkins, pubs);
    }

    const pubMap = new Map(pubs.map(pub => [pub.id, pub]));
    const visitMap = new Map<string, UserPubVisit>();

    checkins.forEach(checkin => {
      const pub = pubMap.get(checkin.pubId);
      if (!pub) return;

      const key = `${checkin.userId}-${checkin.pubId}`;
      const existing = visitMap.get(key);

      if (existing) {
        existing.visitCount++;
      } else {
        visitMap.set(key, {
          userId: checkin.userId,
          pubId: checkin.pubId,
          city: pub.city,
          region: pub.region,
          country: pub.country,
          visitCount: 1,
        });
      }
    });

    const processingTime = performance.now() - startTime;
    if (processingTime > 100) {
      console.warn(
        `[PubGroupingService] Slow processing: ${processingTime.toFixed(2)}ms for ${checkinCount} checkins`
      );
    }

    return Array.from(visitMap.values());
  });

  // Create reactive mapping of users to their home pub geographic data
  readonly userHomePubMappings = computed(() => {
    const users = this.userService.allUsers();
    const pubs = this.pubStore.pubs();

    // Debug logging for home pub geographic filtering diagnosis
    console.log('[PubGroupingService] 🏠 HOME PUB DIAGNOSTIC INFO:');
    console.log('[PubGroupingService] 📊 Total users:', users.length);
    console.log('[PubGroupingService] 📊 Total pubs:', pubs.length);
    console.log(
      '[PubGroupingService] 📊 Users with home pub:',
      users.filter(u => u.homePubId).length
    );

    const pubMap = new Map(pubs.map(pub => [pub.id, pub]));
    const mappings: UserHomePubMapping[] = [];

    users.forEach(user => {
      const homePub = user.homePubId ? pubMap.get(user.homePubId) : null;

      mappings.push({
        userId: user.uid,
        homePubId: user.homePubId,
        city: homePub?.city,
        region: homePub?.region,
        country: homePub?.country,
      });
    });

    // Log sample data
    const usersWithHomePubs = mappings.filter(m => m.homePubId);
    if (usersWithHomePubs.length > 0) {
      const sample = usersWithHomePubs[0];
      console.log('[PubGroupingService] 🏠 Sample user home pub:', {
        userId: sample.userId?.slice(0, 8),
        homePubId: sample.homePubId,
        city: sample.city,
        region: sample.region,
        country: sample.country,
      });
    } else {
      console.log('[PubGroupingService] ⚠️ NO USERS WITH HOME PUBS FOUND');
    }

    return mappings;
  });

  // Group users by their home pub cities
  readonly usersByCity = computed(() => {
    const homePubMappings = this.userHomePubMappings();
    const groups: GeographicGroup = {};

    homePubMappings.forEach(mapping => {
      if (!mapping.city || !mapping.homePubId) return; // Only include users with home pubs that have city data

      if (!groups[mapping.city]) {
        groups[mapping.city] = [];
      }

      if (!groups[mapping.city].includes(mapping.userId)) {
        groups[mapping.city].push(mapping.userId);
      }
    });

    return groups;
  });

  // Group users by their home pub regions
  readonly usersByRegion = computed(() => {
    const homePubMappings = this.userHomePubMappings();
    const groups: GeographicGroup = {};

    homePubMappings.forEach(mapping => {
      if (!mapping.region || !mapping.homePubId) return; // Only include users with home pubs that have region data

      if (!groups[mapping.region]) {
        groups[mapping.region] = [];
      }

      if (!groups[mapping.region].includes(mapping.userId)) {
        groups[mapping.region].push(mapping.userId);
      }
    });

    return groups;
  });

  // Group users by their home pub countries
  readonly usersByCountry = computed(() => {
    const homePubMappings = this.userHomePubMappings();
    const groups: GeographicGroup = {};

    homePubMappings.forEach(mapping => {
      if (!mapping.country || !mapping.homePubId) return; // Only include users with home pubs that have country data

      if (!groups[mapping.country]) {
        groups[mapping.country] = [];
      }

      if (!groups[mapping.country].includes(mapping.userId)) {
        groups[mapping.country].push(mapping.userId);
      }
    });

    return groups;
  });

  // Group users by their most visited pub (as a proxy for home pub)
  readonly usersByMostVisitedPub = computed(() => {
    const visits = this.userPubVisits();
    const groups: GeographicGroup = {};
    const userPubCounts = new Map<string, Map<string, number>>();

    // Count visits per user per pub
    visits.forEach(visit => {
      if (!userPubCounts.has(visit.userId)) {
        userPubCounts.set(visit.userId, new Map());
      }
      userPubCounts.get(visit.userId)!.set(visit.pubId, visit.visitCount);
    });

    // Find most visited pub for each user
    userPubCounts.forEach((pubCounts, userId) => {
      let mostVisitedPub = '';
      let maxVisits = 0;

      pubCounts.forEach((count, pubId) => {
        if (count > maxVisits) {
          maxVisits = count;
          mostVisitedPub = pubId;
        }
      });

      if (mostVisitedPub) {
        if (!groups[mostVisitedPub]) {
          groups[mostVisitedPub] = [];
        }
        groups[mostVisitedPub].push(userId);
      }
    });

    return groups;
  });

  // Find users who have visited a specific pub
  readonly getUsersForPub = computed(() => {
    return (pubId: string): string[] => {
      const visits = this.userPubVisits();
      return visits.filter(visit => visit.pubId === pubId).map(visit => visit.userId);
    };
  });

  // Get all unique cities where users have home pubs
  readonly activeCities = computed(() => {
    const cityGroups = this.usersByCity();
    const cities = Object.keys(cityGroups).sort();
    console.log(
      '[PubGroupingService] 🏙️ Cities with users (home pub based):',
      cities.length,
      cities
    );
    return cities;
  });

  // Get all unique regions where users have home pubs
  readonly activeRegions = computed(() => {
    const regionGroups = this.usersByRegion();
    const regions = Object.keys(regionGroups).sort();
    console.log(
      '[PubGroupingService] 🌍 Regions with users (home pub based):',
      regions.length,
      regions
    );
    return regions;
  });

  // Get all unique countries that have user activity
  readonly activeCountries = computed(() => {
    const countryGroups = this.usersByCountry();
    return Object.keys(countryGroups).sort();
  });

  // Utility methods
  getUsersInCity(city: string): string[] {
    const cityGroups = this.usersByCity();
    return cityGroups[city] || [];
  }

  getUsersInRegion(region: string): string[] {
    const regionGroups = this.usersByRegion();
    return regionGroups[region] || [];
  }

  getUsersInCountry(country: string): string[] {
    const countryGroups = this.usersByCountry();
    return countryGroups[country] || [];
  }

  getUsersForHomePub(pubId: string): string[] {
    const homePubGroups = this.usersByMostVisitedPub();
    return homePubGroups[pubId] || [];
  }

  // Performance optimization for large datasets
  private processOptimizedVisits(checkins: any[], pubs: any[]): UserPubVisit[] {
    // Use recent checkins only for performance
    const recentThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const recentCheckins = checkins.filter(
      c => c.timestamp && c.timestamp.toDate() >= recentThreshold
    );

    console.log(
      `[PubGroupingService] Optimized processing: ${recentCheckins.length} recent checkins from ${checkins.length} total`
    );

    const pubMap = new Map(pubs.map(pub => [pub.id, pub]));
    const visitMap = new Map<string, UserPubVisit>();

    recentCheckins.forEach(checkin => {
      const pub = pubMap.get(checkin.pubId);
      if (!pub) return;

      const key = `${checkin.userId}-${checkin.pubId}`;
      const existing = visitMap.get(key);

      if (existing) {
        existing.visitCount++;
      } else {
        visitMap.set(key, {
          userId: checkin.userId,
          pubId: checkin.pubId,
          city: pub.city,
          region: pub.region,
          country: pub.country,
          visitCount: 1,
        });
      }
    });

    return Array.from(visitMap.values());
  }

  // Site-wide utility methods

  /**
   * Get users who compete in the same city as the given user
   */
  getUserCompetitorsInCity(userId: string): string[] {
    const visits = this.userPubVisits();
    const userCities = new Set(visits.filter(v => v.userId === userId && v.city).map(v => v.city!));

    if (userCities.size === 0) return [];

    const competitors = new Set<string>();
    visits.forEach(visit => {
      if (visit.userId !== userId && visit.city && userCities.has(visit.city)) {
        competitors.add(visit.userId);
      }
    });

    return Array.from(competitors);
  }

  /**
   * Get users who compete in the same region as the given user
   */
  getUserCompetitorsInRegion(userId: string): string[] {
    const visits = this.userPubVisits();
    const userRegions = new Set(
      visits.filter(v => v.userId === userId && v.region).map(v => v.region!)
    );

    if (userRegions.size === 0) return [];

    const competitors = new Set<string>();
    visits.forEach(visit => {
      if (visit.userId !== userId && visit.region && userRegions.has(visit.region)) {
        competitors.add(visit.userId);
      }
    });

    return Array.from(competitors);
  }

  /**
   * Get the most popular city by user activity
   */
  getMostPopularCity(): string | null {
    const cityGroups = this.usersByCity();
    let mostPopular = '';
    let maxUsers = 0;

    Object.entries(cityGroups).forEach(([city, users]) => {
      if (users.length > maxUsers) {
        maxUsers = users.length;
        mostPopular = city;
      }
    });

    return mostPopular || null;
  }

  /**
   * Get geographic statistics for analytics
   */
  readonly geographicStats = computed(() => {
    const visits = this.userPubVisits();
    const cities = this.usersByCity();
    const regions = this.usersByRegion();
    const countries = this.usersByCountry();

    return {
      totalVisits: visits.length,
      activeCities: Object.keys(cities).length,
      activeRegions: Object.keys(regions).length,
      activeCountries: Object.keys(countries).length,
      averageUsersPerCity:
        Object.keys(cities).length > 0
          ? Object.values(cities).reduce((sum, users) => sum + users.length, 0) /
            Object.keys(cities).length
          : 0,
      mostPopularCity: this.getMostPopularCity(),
    };
  });

  /**
   * Check if geographic grouping is available
   */
  readonly hasGeographicData = computed(() => {
    const stats = this.geographicStats();
    return stats.activeCities > 0 || stats.activeRegions > 0;
  });
}
