// src/app/shared/data-access/list-filter.store.ts
import { Injectable, signal, computed } from '@angular/core';

export type SortDirection = 'asc' | 'desc';

export type SortOption<T = any> = {
  key: string;
  label: string;
  getValue: (item: T) => any;
  direction: SortDirection;
};

export type FilterPredicate<T = any> = (item: T, query: string) => boolean;

/**
 * ✅ Generic filtering and sorting store
 * Can be used with any data type for consistent UX
 */
@Injectable()
export class ListFilterStore<T = any> {
  // ✅ Private writable signals
  private readonly _searchQuery = signal<string>('');
  private readonly _sortKey = signal<string>('');
  private readonly _sortDirection = signal<SortDirection>('asc');
  private readonly _sortOptions = signal<SortOption<T>[]>([]);
  private readonly _filterPredicate = signal<FilterPredicate<T> | null>(null);

  // ✅ Public readonly signals
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly sortKey = this._sortKey.asReadonly();
  readonly sortDirection = this._sortDirection.asReadonly();
  readonly sortOptions = this._sortOptions.asReadonly();

  // ✅ Computed signals
  readonly activeSortOption = computed(() => {
    const key = this.sortKey();
    return this.sortOptions().find(option => option.key === key) || null;
  });

  readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.sortKey() !== '';
  });

  readonly searchQueryTrimmed = computed(() => {
    return this.searchQuery().trim().toLowerCase();
  });

  // ✅ Actions
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  clearSearch(): void {
    this._searchQuery.set('');
  }

  setSortOptions(options: SortOption<T>[]): void {
    this._sortOptions.set(options);
  }

  setSort(key: string, direction: SortDirection = 'asc'): void {
    this._sortKey.set(key);
    this._sortDirection.set(direction);
  }

  toggleSortDirection(): void {
    const current = this.sortDirection();
    this._sortDirection.set(current === 'asc' ? 'desc' : 'asc');
  }

  clearSort(): void {
    this._sortKey.set('');
  }

  setFilterPredicate(predicate: FilterPredicate<T>): void {
    this._filterPredicate.set(predicate);
  }

  clearAllFilters(): void {
    this._searchQuery.set('');
    this._sortKey.set('');
  }

  // ✅ Core filtering and sorting logic
  filterAndSort(items: T[]): T[] {
    let filtered = [...items];

    // Apply search filter
    const query = this.searchQueryTrimmed();
    const predicate = this._filterPredicate();

    if (query && predicate) {
      filtered = filtered.filter(item => predicate(item, query));
    }

    // Apply sorting
    const activeSortOption = this.activeSortOption();
    if (activeSortOption) {
      filtered.sort((a, b) => {
        const valueA = activeSortOption.getValue(a);
        const valueB = activeSortOption.getValue(b);

        let comparison = 0;

        if (valueA < valueB) comparison = -1;
        else if (valueA > valueB) comparison = 1;

        return this.sortDirection() === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }

  // ✅ Helper for creating search predicates
  static createSearchPredicate<T>(
    searchFields: ((item: T) => string)[]
  ): FilterPredicate<T> {
    return (item: T, query: string): boolean => {
      return searchFields.some(getField =>
        getField(item).toLowerCase().includes(query)
      );
    };
  }

  // ✅ Debug helpers
  getDebugInfo() {
    return {
      searchQuery: this.searchQuery(),
      sortKey: this.sortKey(),
      sortDirection: this.sortDirection(),
      hasActiveFilters: this.hasActiveFilters(),
      sortOptionsCount: this.sortOptions().length
    };
  }
}
