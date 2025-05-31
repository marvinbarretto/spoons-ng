// src/app/services/mission.service.ts
import { Injectable } from '@angular/core';
import { FirestoreService } from '../../shared/data-access/firestore.service';
import { Mission } from '../utils/mission.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MissionService extends FirestoreService {
  private collectionPath = 'missions';

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
  create(id: string, mission: Mission): Promise<void> {
    return this.setDoc(`${this.collectionPath}/${id}`, mission);
  }

  /**
   * Update an existing mission.
   */
  update(id: string, partial: Partial<Mission>): Promise<void> {
    return this.updateDoc(`${this.collectionPath}/${id}`, partial);
  }

  /**
   * Delete a mission by ID.
   */
  delete(id: string): Promise<void> {
    return this.deleteDoc(`${this.collectionPath}/${id}`);
  }
}
