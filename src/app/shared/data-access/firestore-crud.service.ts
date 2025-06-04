// shared/data-access/firestore-crud.service.ts
import { FirestoreService } from './firestore.service';

export abstract class FirestoreCrudService<T extends { id: string }> extends FirestoreService {
  protected abstract path: string;

  getAll(): Promise<T[]> {
    return this.getDocsWhere<T>(this.path);
  }

  async create(item: T): Promise<void> {
    await this.setDoc(`${this.path}/${item.id}`, item);
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    await this.updateDoc<T>(`${this.path}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await this.deleteDoc(`${this.path}/${id}`);
  }
}
