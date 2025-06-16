// src/app/shared/data-access/firestore-crud.service.ts
import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export abstract class FirestoreCrudService<T extends { id: string }> extends FirestoreService {
  protected abstract path: string;

  // ===================================
  // READ OPERATIONS
  // ===================================

  /**
   * Get all documents in the collection
   */
  getAll(): Promise<T[]> {
    if (!this.path) {
      throw new Error('[FirestoreCrudService] "path" is not set in subclass');
    }
    return this.getDocsWhere<T>(this.path);
  }

  /**
   * Get a single document by ID
   */
  async getById(id: string): Promise<T | null> {
    if (!this.path) {
      throw new Error('[FirestoreCrudService] "path" is not set in subclass');
    }

    const docPath = `${this.path}/${id}`;
    const doc = await this.getDocByPath<T>(docPath);
    return doc || null;
  }

  /**
   * Check if a document exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    if (!this.path) {
      throw new Error('[FirestoreCrudService] "path" is not set in subclass');
    }

    const doc = await this.getById(id);
    return doc !== null;
  }

  // ===================================
  // WRITE OPERATIONS
  // ===================================

  /**
   * Create a new document
   */
  async create(item: T): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    await this.setDoc(`${this.path}/${item.id}`, item);
  }

  /**
   * Update an existing document
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    await this.updateDoc<T>(`${this.path}/${id}`, data);
  }

  /**
   * Delete a document by ID
   */
  async delete(id: string): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    await this.deleteDoc(`${this.path}/${id}`);
  }

  // ===================================
  // BULK OPERATIONS
  // ===================================

  /**
   * Create multiple documents
   */
  async createMany(items: T[]): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');

    const promises = items.map(item => this.create(item));
    await Promise.all(promises);
  }

  /**
   * Update multiple documents
   */
  async updateMany(updates: Array<{ id: string; data: Partial<T> }>): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');

    const promises = updates.map(({ id, data }) => this.update(id, data));
    await Promise.all(promises);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(ids: string[]): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');

    const promises = ids.map(id => this.delete(id));
    await Promise.all(promises);
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Get the count of documents in the collection
   */
  async getCount(): Promise<number> {
    const docs = await this.getAll();
    return docs.length;
  }

  /**
   * Get documents with pagination
   */
  async getPaginated(offset: number = 0, limit: number = 10): Promise<T[]> {
    const allDocs = await this.getAll();
    return allDocs.slice(offset, offset + limit);
  }
}
