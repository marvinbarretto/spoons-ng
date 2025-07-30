import { computed, Signal } from '@angular/core';

export interface CrudStore<T> {
  data: Signal<T[]>;
  loading: Signal<boolean>;
  error: Signal<string | null>;

  load(): Promise<void>;
  loadOnce(): Promise<void>;
  add(item: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<void>;
  remove(id: string): Promise<void>;
}
export abstract class BaseCrudComponent<T extends { id: string }> {
  protected abstract getStore(): CrudStore<T>;

  protected readonly items = computed(() => this.getStore().data());
  protected readonly loading = computed(() => this.getStore().loading());
  protected readonly error = computed(() => this.getStore().error());

  protected async deleteItem(id: string): Promise<void> {
    await this.getStore().remove(id);
  }

  protected async addItem(item: T): Promise<void> {
    await this.getStore().add(item);
  }

  protected async updateItem(item: T): Promise<void> {
    await this.getStore().update(item.id, item);
  }

  protected async refresh(): Promise<void> {
    await this.getStore().load();
  }

  protected async loadOnce(): Promise<void> {
    await this.getStore().loadOnce();
  }
}
