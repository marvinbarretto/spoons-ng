// src/app/shared/ui/advanced-list-controls/advanced-list-controls.component.ts
import {
  Component,
  input,
  output,
  computed,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type SortOption = {
  key: string;
  label: string;
  icon?: string;
};

export type FilterOption = {
  key: string;
  label: string;
  icon?: string;
  count?: number;
};

export type ViewMode = 'list' | 'grid' | 'map';

export type ListControlsConfig = {
  searchPlaceholder?: string;
  sortOptions: SortOption[];
  filterOptions: FilterOption[];
  showViewToggle?: boolean;
  showBulkActions?: boolean;
  showPerformanceInfo?: boolean;
};

export type ListControlsState = {
  searchQuery: string;
  sortBy: string;
  activeFilters: string[];
  viewMode: ViewMode;
  bulkMode: boolean;
};

@Component({
  selector: 'app-advanced-list-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="list-controls">
      <!-- Search Bar -->
      <div class="list-controls__search">
        <div class="search-input">
          <span class="search-input__icon">🔍</span>
          <input
            type="text"
            class="search-input__field"
            [placeholder]="config().searchPlaceholder || 'Search...'"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            (keydown.escape)="clearSearch()"
          />
          @if (searchQuery()) {
            <button
              type="button"
              class="search-input__clear"
              (click)="clearSearch()"
              aria-label="Clear search"
            >
              ✕
            </button>
          }
        </div>
      </div>

      <!-- Controls Row -->
      <div class="list-controls__row">
        <!-- Sort Dropdown -->
        <div class="control-group">
          <label class="control-label">Sort:</label>
          <select
            class="control-select"
            [value]="sortBy()"
            (change)="onSortChange($event)"
          >
            @for (option of config().sortOptions; track option.key) {
              <option [value]="option.key">
                {{ option.icon || '' }} {{ option.label }}
              </option>
            }
          </select>
        </div>

        <!-- Filter Chips -->
        <div class="control-group">
          <label class="control-label">Filters:</label>
          <div class="filter-chips">
            @for (filter of config().filterOptions; track filter.key) {
              <button
                type="button"
                class="filter-chip"
                [class.active]="isFilterActive(filter.key)"
                (click)="toggleFilter(filter.key)"
              >
                {{ filter.icon || '' }} {{ filter.label }}
                @if (filter.count !== undefined) {
                  <span class="filter-count">({{ filter.count }})</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- View Mode Toggle -->
        @if (config().showViewToggle) {
          <div class="control-group">
            <div class="view-toggle">
              <button
                type="button"
                class="view-btn"
                [class.active]="viewMode() === 'list'"
                (click)="setViewMode('list')"
                title="List view"
              >
                ☰
              </button>
              <button
                type="button"
                class="view-btn"
                [class.active]="viewMode() === 'grid'"
                (click)="setViewMode('grid')"
                title="Grid view"
              >
                ⊞
              </button>
              <button
                type="button"
                class="view-btn"
                [class.active]="viewMode() === 'map'"
                (click)="setViewMode('map')"
                title="Map view"
              >
                🗺️
              </button>
            </div>
          </div>
        }

        <!-- Bulk Actions Toggle -->
        @if (config().showBulkActions) {
          <div class="control-group">
            <button
              type="button"
              class="bulk-toggle"
              [class.active]="bulkMode()"
              (click)="toggleBulkMode()"
            >
              {{ bulkMode() ? '✓ Select' : '☰ Select' }}
            </button>
          </div>
        }
      </div>

      <!-- Performance Info -->
      @if (config().showPerformanceInfo && (totalCount() > 0 || filteredCount() > 0)) {
        <div class="list-controls__info">
          <span class="results-info">
            Showing {{ displayedCount() }} of {{ filteredCount() }}
            @if (filteredCount() !== totalCount()) {
              ({{ totalCount() }} total)
            }
          </span>

          @if (hasActiveFilters()) {
            <button
              type="button"
              class="clear-filters"
              (click)="clearAllFilters()"
            >
              Clear filters
            </button>
          }
        </div>
      }

      <!-- Mobile Collapse Toggle -->
      <button
        type="button"
        class="mobile-toggle"
        (click)="toggleMobileExpanded()"
        [class.expanded]="mobileExpanded()"
      >
        {{ hasActiveFilters() ? '●' : '' }} Filters & Sort
      </button>
    </div>
  `,
  styles: `
    .list-controls {
      background: var(--color-backgroundLightest);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Search Input */
    .list-controls__search {
      width: 100%;
    }

    .search-input {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      transition: border-color 0.2s ease;
    }

    .search-input:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-subtle);
    }

    .search-input__icon {
      padding: 0.75rem;
      color: var(--color-text-secondary);
    }

    .search-input__field {
      flex: 1;
      border: none;
      outline: none;
      padding: 0.75rem 0;
      background: transparent;
      color: var(--color-text);
      font-size: 1rem;
    }

    .search-input__clear {
      padding: 0.75rem;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .search-input__clear:hover {
      color: var(--color-error);
    }

    /* Controls Row */
    .list-controls__row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 1rem;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 0;
    }

    .control-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .control-select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-background);
      color: var(--color-text);
      font-size: 0.875rem;
      min-width: 140px;
    }

    /* Filter Chips */
    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .filter-chip {
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-background);
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .filter-chip:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .filter-chip.active {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    .filter-count {
      opacity: 0.8;
      font-size: 0.7rem;
    }

    /* View Toggle */
    .view-toggle {
      display: flex;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      overflow: hidden;
    }

    .view-btn {
      padding: 0.5rem 0.75rem;
      border: none;
      background: var(--color-background);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
      border-right: 1px solid var(--color-border);
    }

    .view-btn:last-child {
      border-right: none;
    }

    .view-btn:hover {
      background: var(--color-primary-subtle);
      color: var(--color-primary);
    }

    .view-btn.active {
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    /* Bulk Toggle */
    .bulk-toggle {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-background);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .bulk-toggle:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .bulk-toggle.active {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    /* Info Row */
    .list-controls__info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-top: 1px solid var(--color-border);
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .clear-filters {
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: transparent;
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .clear-filters:hover {
      border-color: var(--color-error);
      color: var(--color-error);
    }

    /* Mobile Toggle */
    .mobile-toggle {
      display: none;
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-background);
      color: var(--color-text);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mobile-toggle.expanded {
      border-color: var(--color-primary);
      background: var(--color-primary-subtle);
    }

    /* Responsive Behavior */
    @media (max-width: 768px) {
      .mobile-toggle {
        display: block;
        order: -1;
      }

      .list-controls__row,
      .list-controls__search {
        display: none;
      }

      .list-controls.mobile-expanded .list-controls__row,
      .list-controls.mobile-expanded .list-controls__search {
        display: flex;
      }

      .list-controls__row {
        flex-direction: column;
        gap: 1rem;
      }

      .control-group {
        width: 100%;
      }

      .control-select {
        width: 100%;
      }

      .view-toggle {
        width: 100%;
      }

      .view-btn {
        flex: 1;
      }
    }

    /* Touch improvements */
    @media (hover: none) {
      .filter-chip,
      .view-btn,
      .bulk-toggle {
        min-height: 2.75rem;
      }
    }
  `
})
export class AdvancedListControlsComponent {
  // ✅ Inputs
  readonly config = input.required<ListControlsConfig>();
  readonly totalCount = input<number>(0);
  readonly filteredCount = input<number>(0);
  readonly displayedCount = input<number>(0);

  // ✅ Internal state
  private readonly _searchQuery = signal<string>('');
  private readonly _sortBy = signal<string>('');
  private readonly _activeFilters = signal<string[]>([]);
  private readonly _viewMode = signal<ViewMode>('list');
  private readonly _bulkMode = signal<boolean>(false);
  private readonly _mobileExpanded = signal<boolean>(false);

  // ✅ Public readonly signals
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly sortBy = this._sortBy.asReadonly();
  readonly activeFilters = this._activeFilters.asReadonly();
  readonly viewMode = this._viewMode.asReadonly();
  readonly bulkMode = this._bulkMode.asReadonly();
  readonly mobileExpanded = this._mobileExpanded.asReadonly();

  // ✅ Computed
  readonly hasActiveFilters = computed(() => {
    return this.searchQuery().length > 0 ||
           this.activeFilters().length > 0 ||
           this.sortBy().length > 0;
  });

  readonly currentState = computed((): ListControlsState => ({
    searchQuery: this.searchQuery(),
    sortBy: this.sortBy(),
    activeFilters: this.activeFilters(),
    viewMode: this.viewMode(),
    bulkMode: this.bulkMode()
  }));

  // ✅ Outputs
  readonly stateChanged = output<ListControlsState>();
  readonly searchChanged = output<string>();
  readonly sortChanged = output<string>();
  readonly filtersChanged = output<string[]>();
  readonly viewModeChanged = output<ViewMode>();
  readonly bulkModeChanged = output<boolean>();

  // ✅ Event handlers
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this._searchQuery.set(input.value);
    this.searchChanged.emit(input.value);
    this.emitStateChange();
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this._sortBy.set(select.value);
    this.sortChanged.emit(select.value);
    this.emitStateChange();
  }

  toggleFilter(filterKey: string): void {
    this._activeFilters.update(filters => {
      if (filters.includes(filterKey)) {
        return filters.filter(f => f !== filterKey);
      } else {
        return [...filters, filterKey];
      }
    });
    this.filtersChanged.emit(this.activeFilters());
    this.emitStateChange();
  }

  isFilterActive(filterKey: string): boolean {
    return this.activeFilters().includes(filterKey);
  }

  setViewMode(mode: ViewMode): void {
    this._viewMode.set(mode);
    this.viewModeChanged.emit(mode);
    this.emitStateChange();
  }

  toggleBulkMode(): void {
    this._bulkMode.update(current => !current);
    this.bulkModeChanged.emit(this.bulkMode());
    this.emitStateChange();
  }

  clearSearch(): void {
    this._searchQuery.set('');
    this.searchChanged.emit('');
    this.emitStateChange();
  }

  clearAllFilters(): void {
    this._searchQuery.set('');
    this._activeFilters.set([]);
    this._sortBy.set('');
    this.emitStateChange();
  }

  toggleMobileExpanded(): void {
    this._mobileExpanded.update(current => !current);
  }

  private emitStateChange(): void {
    this.stateChanged.emit(this.currentState());
  }

  // ✅ Public API for parent components
  setState(state: Partial<ListControlsState>): void {
    if (state.searchQuery !== undefined) this._searchQuery.set(state.searchQuery);
    if (state.sortBy !== undefined) this._sortBy.set(state.sortBy);
    if (state.activeFilters !== undefined) this._activeFilters.set(state.activeFilters);
    if (state.viewMode !== undefined) this._viewMode.set(state.viewMode);
    if (state.bulkMode !== undefined) this._bulkMode.set(state.bulkMode);
  }
}
