// src/app/services/mission.service.ts
import { Injectable } from '@angular/core';
import { CachedFirestoreService, CollectionCacheConfig } from '../../shared/data-access/cached-firestore.service';
import { Mission } from '../utils/mission.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MissionService extends CachedFirestoreService {
  private collectionPath = 'missions';

  // Configure caching for missions - relatively static data
  protected override cacheConfig: CollectionCacheConfig = {
    [this.collectionPath]: {
      ttl: 60 * 60 * 1000, // 1 hour TTL
      strategy: 'cache-first',
      invalidateOn: [] // No automatic invalidation
    }
  };

  /**
   * Get all missions (one-time fetch).
   */
  getAll(): Promise<Mission[]> {
    return firstValueFrom(this.collection$<Mission>(this.collectionPath));
  }

  /**
   * Get a single mission by ID.
   */
  getById(id: string): Promise<Mission | undefined> {
    return firstValueFrom(this.doc$<Mission>(`${this.collectionPath}/${id}`));
  }

  /**
   * Create or overwrite a mission by ID.
   */
  async create(id: string, mission: Mission): Promise<void> {
    await this.setDoc(`${this.collectionPath}/${id}`, mission);
    // Clear cache to force fresh data on next read
    await this.clearCollectionCache(this.collectionPath);
  }

  /**
   * Update an existing mission.
   */
  async update(id: string, partial: Partial<Mission>): Promise<void> {
    await this.updateDoc(`${this.collectionPath}/${id}`, partial);
    // Clear cache to force fresh data on next read
    await this.clearCollectionCache(this.collectionPath);
  }

  /**
   * Delete a mission by ID.
   */
  async delete(id: string): Promise<void> {
    await this.deleteDoc(`${this.collectionPath}/${id}`);
    // Clear cache to force fresh data on next read
    await this.clearCollectionCache(this.collectionPath);
  }
}
