// src/app/services/mission.service.ts
import { Injectable } from '@angular/core';
import { FirestoreService } from '@fourfold/angular-foundation';
import { Mission } from '../utils/mission.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MissionService extends FirestoreService {
  private collectionPath = 'missions';

  // Firebase handles caching automatically with offline persistence

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
    // Firebase automatically handles cache invalidation
  }

  /**
   * Update an existing mission.
   */
  async update(id: string, partial: Partial<Mission>): Promise<void> {
    await this.updateDoc(`${this.collectionPath}/${id}`, partial);
    // Firebase automatically handles cache invalidation
  }

  /**
   * Delete a mission by ID.
   */
  async delete(id: string): Promise<void> {
    await this.deleteDoc(`${this.collectionPath}/${id}`);
    // Firebase automatically handles cache invalidation
  }
}
