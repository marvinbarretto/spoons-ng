// shared/data-access/firestore-crud.service.ts
import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export abstract class FirestoreCrudService<T extends { id: string }> extends FirestoreService {
  protected abstract path: string;

  getAll(): Promise<T[]> {
    if (!this.path) {
      throw new Error('[FirestoreCrudService] "path" is not set in subclass');
    }
    return this.getDocsWhere<T>(this.path);
  }

  async create(item: T): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    await this.setDoc(`${this.path}/${item.id}`, item);
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    await this.updateDoc<T>(`${this.path}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    await this.deleteDoc(`${this.path}/${id}`);
  }
}

