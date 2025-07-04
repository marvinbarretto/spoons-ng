// src/app/shared/ui/list-filter-controls/list-filter-controls.component.ts
import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListFilterStore, type SortOption } from '../../data-access/list-filter.store';

@Component({
  selector: 'app-list-filter-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-controls">
      <!-- Search Input -->
      <div class="filter-controls__search">
        <div class="search-input">
          <span class="search-input__icon">🔍</span>
          <input
            type="text"
            class="search-input__field"
            [placeholder]="searchPlaceholder()"
            [value]="filterStore.searchQuery()"
            (input)="onSearchInput($event)"
            (keydown.escape)="clearSearch()"
          />
          @if (filterStore.searchQuery()) {
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

      <!-- Sort Controls -->
      @if (showSort() && filterStore.sortOptions().length > 0) {
        <div class="filter-controls__sort">
          <label class="sort-label">Sort by:</label>

          <div class="sort-controls">
            <select
              class="sort-select"
              [value]="filterStore.sortKey()"
              (change)="onSortChange($event)"
            >
              <option value="">Default</option>
              @for (option of filterStore.sortOptions(); track option.key) {
                <option [value]="option.key">{{ option.label }}</option>
              }
            </select>

            @if (filterStore.sortKey()) {
              <button
                type="button"
                class="sort-direction-btn"
                (click)="toggleSortDirection()"
                [title]="sortDirectionTitle()"
              >
                {{ filterStore.sortDirection() === 'asc' ? '↑' : '↓' }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Results Summary & Clear Button -->
      @if (filterStore.hasActiveFilters()) {
        <div class="filter-controls__summary">
          <span class="results-count">
            {{ resultsCount() }} {{ resultsCount() === 1 ? 'result' : 'results' }}
          </span>

          <button
            type="button"
            class="clear-filters-btn"
            (click)="clearAllFilters()"
          >
            Clear filters
          </button>
        </div>
      }

      <!-- Quick Filters (optional) -->
      @if (quickFilters().length > 0) {
        <div class="filter-controls__quick">
          <span class="quick-filters-label">Quick filters:</span>
          <div class="quick-filters">
            @for (filter of quickFilters(); track filter.key) {
              <button
                type="button"
                class="quick-filter-btn"
                [class.active]="activeQuickFilter() === filter.key"
                (click)="toggleQuickFilter(filter.key)"
              >
                {{ filter.label }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Mobile Dropdown Toggle -->
      @if (isMobile()) {
        <button
          type="button"
          class="mobile-filters-toggle"
          (click)="toggleMobileFilters()"
          [class.active]="showMobileFilters()"
        >
          Filters {{ filterStore.hasActiveFilters() ? '●' : '' }}
        </button>
      }
    </div>
  `,
  styles: `
    .filter-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: var(--color-backgroundLightest);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    /* Search Input */
    .filter-controls__search {
      flex: 1;
    }

    .search-input {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      overflow: hidden;
      transition: border-color 0.2s ease;
    }

    .search-input:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-subtle);
    }

    .search-input__icon {
      padding: 0.75rem;
      color: var(--color-text-secondary);
      pointer-events: none;
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

    .search-input__field::placeholder {
      color: var(--color-text-secondary);
    }

    .search-input__clear {
      padding: 0.75rem;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    }

    .search-input__clear:hover {
      color: var(--color-error);
    }

    /* Sort Controls */
    .filter-controls__sort {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .sort-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      white-space: nowrap;
    }

    .sort-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sort-select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-background);
      color: var(--color-text);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .sort-select:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .sort-direction-btn {
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-background);
      color: var(--color-text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      transition: all 0.2s ease;
    }

    .sort-direction-btn:hover {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    /* Results Summary */
    .filter-controls__summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 0;
      border-top: 1px solid var(--color-border);
    }

    .results-count {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .clear-filters-btn {
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-background);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .clear-filters-btn:hover {
      border-color: var(--color-error);
      color: var(--color-error);
    }

    /* Quick Filters */
    .filter-controls__quick {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .quick-filters-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .quick-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .quick-filter-btn {
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
    }

    .quick-filter-btn:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .quick-filter-btn.active {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    /* Mobile Toggle */
    .mobile-filters-toggle {
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

    .mobile-filters-toggle.active {
      border-color: var(--color-primary);
      background: var(--color-primary-subtle);
    }

    /* Desktop Layout */
    @media (min-width: 768px) {
      .filter-controls {
        flex-direction: row;
        align-items: flex-start;
        gap: 1.5rem;
      }

      .filter-controls__search {
        flex: 2;
      }

      .filter-controls__sort {
        flex: 1;
      }

      .filter-controls__summary {
        border-top: none;
        border-left: 1px solid var(--color-border);
        padding: 0 0 0 1.5rem;
        margin-left: auto;
      }
    }

    /* Mobile Responsive */
    @media (max-width: 640px) {
      .filter-controls {
        gap: 0.75rem;
      }

      .mobile-filters-toggle {
        display: block;
        order: -1;
      }

      .filter-controls__sort,
      .filter-controls__quick {
        display: none;
      }

      .filter-controls.mobile-expanded .filter-controls__sort,
      .filter-controls.mobile-expanded .filter-controls__quick {
        display: flex;
      }

      .sort-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }

      .sort-select {
        width: 100%;
      }
    }

    /* Touch improvements */
    @media (hover: none) {
      .search-input__clear,
      .sort-direction-btn,
      .clear-filters-btn,
      .quick-filter-btn {
        min-height: 2.75rem;
        min-width: 2.75rem;
      }
    }
  `
})
export class ListFilterControlsComponent {
  readonly filterStore = inject(ListFilterStore);

  // ✅ Inputs
  readonly searchPlaceholder = input<string>('Search...');
  readonly showSort = input<boolean>(true);
  readonly resultsCount = input<number>(0);
  readonly quickFilters = input<Array<{ key: string; label: string }>>([]);

  // ✅ Mobile state
  private readonly _showMobileFilters = signal<boolean>(false);
  private readonly _activeQuickFilter = signal<string>('');

  readonly showMobileFilters = this._showMobileFilters.asReadonly();
  readonly activeQuickFilter = this._activeQuickFilter.asReadonly();

  // ✅ Outputs
  readonly quickFilterChanged = output<string>();

  // ✅ Computed
  readonly isMobile = computed(() => {
    return window.innerWidth <= 640;
  });

  readonly sortDirectionTitle = computed(() => {
    const direction = this.filterStore.sortDirection();
    return direction === 'asc' ? 'Sort descending' : 'Sort ascending';
  });

  // ✅ Event handlers
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterStore.setSearchQuery(input.value);
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const key = select.value;

    if (key) {
      this.filterStore.setSort(key);
    } else {
      this.filterStore.clearSort();
    }
  }

  clearSearch(): void {
    this.filterStore.clearSearch();
  }

  toggleSortDirection(): void {
    this.filterStore.toggleSortDirection();
  }

  clearAllFilters(): void {
    this.filterStore.clearAllFilters();
    this._activeQuickFilter.set('');
  }

  toggleQuickFilter(key: string): void {
    const current = this.activeQuickFilter();
    const newFilter = current === key ? '' : key;
    this._activeQuickFilter.set(newFilter);
    this.quickFilterChanged.emit(newFilter);
  }

  toggleMobileFilters(): void {
    this._showMobileFilters.update(current => !current);
  }
}
