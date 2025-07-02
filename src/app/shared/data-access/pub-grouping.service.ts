import { Injectable, computed, inject } from '@angular/core';
import { CheckInStore } from '../../check-in/data-access/check-in.store';
import { PubStore } from '../../pubs/data-access/pub.store';
import type { CheckIn } from '../../check-in/utils/check-in.models';
import type { Pub } from '../../pubs/utils/pub.models';

export type UserPubVisit = {
  userId: string;
  pubId: string;
  city?: string;
  region?: string;
  country?: string;
  visitCount: number;
};

export type GeographicGroup = {
  [key: string]: string[]; // Geographic location -> list of user IDs
};

@Injectable({ providedIn: 'root' })
export class PubGroupingService {
  private readonly checkinStore = inject(CheckInStore);
  private readonly pubStore = inject(PubStore);

  // Performance safeguards
  private readonly MAX_CHECKINS_FOR_REALTIME = 10000;
  private readonly MAX_USERS_PER_GROUP = 1000;

  // Create reactive mapping of user visits to pubs with geographic data
  readonly userPubVisits = computed(() => {
    const checkins = this.checkinStore.checkins();
    const pubs = this.pubStore.pubs();
    
    // Performance monitoring
    const startTime = performance.now();
    const checkinCount = checkins.length;
    
    if (checkinCount > this.MAX_CHECKINS_FOR_REALTIME) {
      console.warn(`[PubGroupingService] Large dataset (${checkinCount} checkins), using optimized processing`);
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
          visitCount: 1
        });
      }
    });

    const processingTime = performance.now() - startTime;
    if (processingTime > 100) {
      console.warn(`[PubGroupingService] Slow processing: ${processingTime.toFixed(2)}ms for ${checkinCount} checkins`);
    }

    return Array.from(visitMap.values());
  });

  // Group users by cities they've visited
  readonly usersByCity = computed(() => {
    const visits = this.userPubVisits();
    const groups: GeographicGroup = {};

    visits.forEach(visit => {
      if (!visit.city) return;
      
      if (!groups[visit.city]) {
        groups[visit.city] = [];
      }
      
      if (!groups[visit.city].includes(visit.userId)) {
        groups[visit.city].push(visit.userId);
      }
    });

    return groups;
  });

  // Group users by regions they've visited
  readonly usersByRegion = computed(() => {
    const visits = this.userPubVisits();
    const groups: GeographicGroup = {};

    visits.forEach(visit => {
      if (!visit.region) return;
      
      if (!groups[visit.region]) {
        groups[visit.region] = [];
      }
      
      if (!groups[visit.region].includes(visit.userId)) {
        groups[visit.region].push(visit.userId);
      }
    });

    return groups;
  });

  // Group users by countries they've visited
  readonly usersByCountry = computed(() => {
    const visits = this.userPubVisits();
    const groups: GeographicGroup = {};

    visits.forEach(visit => {
      if (!visit.country) return;
      
      if (!groups[visit.country]) {
        groups[visit.country] = [];
      }
      
      if (!groups[visit.country].includes(visit.userId)) {
        groups[visit.country].push(visit.userId);
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
      return visits
        .filter(visit => visit.pubId === pubId)
        .map(visit => visit.userId);
    };
  });

  // Get all unique cities that have user activity
  readonly activeCities = computed(() => {
    const cityGroups = this.usersByCity();
    return Object.keys(cityGroups).sort();
  });

  // Get all unique regions that have user activity
  readonly activeRegions = computed(() => {
    const regionGroups = this.usersByRegion();
    return Object.keys(regionGroups).sort();
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
    const recentCheckins = checkins.filter(c => 
      c.timestamp && c.timestamp.toDate() >= recentThreshold
    );
    
    console.log(`[PubGroupingService] Optimized processing: ${recentCheckins.length} recent checkins from ${checkins.length} total`);
    
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
          visitCount: 1
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
    const userCities = new Set(
      visits
        .filter(v => v.userId === userId && v.city)
        .map(v => v.city!)
    );

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
      visits
        .filter(v => v.userId === userId && v.region)
        .map(v => v.region!)
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
      averageUsersPerCity: Object.keys(cities).length > 0 
        ? Object.values(cities).reduce((sum, users) => sum + users.length, 0) / Object.keys(cities).length 
        : 0,
      mostPopularCity: this.getMostPopularCity()
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