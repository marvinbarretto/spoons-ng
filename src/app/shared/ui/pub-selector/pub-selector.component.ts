// src/app/shared/ui/pub-selector/pub-selector.component.ts
import { Component, computed, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PubStore } from '@pubs/data-access/pub.store';
import type { Pub } from '@pubs/utils/pub.models';

@Component({
  selector: 'app-pub-selector',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pub-selector">
      <label class="selector-label">
        {{ label() }}
        @if (required()) {
          <span class="required">*</span>
        }
      </label>

      <div class="selector-container">
        <!-- Search input -->
        <div class="search-section">
          <input
            type="text"
            class="search-input"
            [placeholder]="searchPlaceholder()"
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
            (focus)="setDropdownOpen(true)"
            #searchInput
          />
          <div class="search-icon">🔍</div>
        </div>

        <!-- Selected pubs -->
        @if (selectedPubs().length > 0) {
          <div class="selected-pubs">
            <div class="selected-header">
              <span class="selected-count">{{ selectedPubs().length }} pubs selected</span>
              <button
                type="button"
                class="clear-all-btn"
                (click)="clearAll()"
              >
                Clear all
              </button>
            </div>
            <div class="selected-list">
              @for (pub of selectedPubs(); track pub.id) {
                <div class="selected-pub">
                  <span class="pub-name">{{ pub.name }}</span>
                  <span class="pub-location">{{ getPubLocationText(pub) }}</span>
                  <button
                    type="button"
                    class="remove-btn"
                    (click)="removePub(pub)"
                    title="Remove {{ pub.name }}"
                  >
                    ×
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- Dropdown -->
        @if (isDropdownOpen() && filteredPubs().length > 0) {
          <div class="dropdown">
            <div class="dropdown-header">
              <span class="dropdown-title">Select pubs to add</span>
              @if (hasSearchTerm()) {
                <span class="result-count">{{ filteredPubs().length }} results</span>
              }
            </div>
            <div class="dropdown-list">
              @for (pub of filteredPubs(); track pub.id) {
                <div
                  class="dropdown-item"
                  [class.selected]="isPubSelected(pub)"
                  (click)="togglePub(pub)"
                >
                  <div class="pub-info">
                    <div class="pub-name">{{ pub.name }}</div>
                    <div class="pub-location">{{ getPubLocationText(pub) }}</div>
                  </div>
                  <div class="selection-indicator">
                    @if (isPubSelected(pub)) {
                      <span class="selected-icon">✓</span>
                    } @else {
                      <span class="add-icon">+</span>
                    }
                  </div>
                </div>
              }
            </div>

            @if (filteredPubs().length >= maxDisplayResults()) {
              <div class="dropdown-footer">
                <span class="more-results">
                  Showing first {{ maxDisplayResults() }} results. Type to narrow search.
                </span>
              </div>
            }
          </div>
        }

        @if (isDropdownOpen() && hasSearchTerm() && filteredPubs().length === 0) {
          <div class="dropdown">
            <div class="no-results">
              <div class="no-results-icon">🔍</div>
              <div class="no-results-text">No pubs found matching "{{ searchTerm() }}"</div>
            </div>
          </div>
        }
      </div>

      @if (helperText()) {
        <div class="helper-text">{{ helperText() }}</div>
      }

      @if (showError() && errorMessage()) {
        <div class="error-text">{{ errorMessage() }}</div>
      }

      <!-- Development debug info -->
      @if (isDevelopment()) {
        <details class="debug-info">
          <summary>Pub Selector Debug</summary>
          <pre>{{ debugInfo() | json }}</pre>
        </details>
      }
    </div>
  `,
  styles: `
    .pub-selector {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      position: relative;
    }

    .selector-label {
      font-weight: 500;
      color: var(--text);
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .required {
      color: var(--error);
    }

    .selector-container {
      position: relative;
    }

    .search-section {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.875rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      background: var(--background-lighter);
      color: var(--text);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(var(--accent), 0.1);
    }

    .search-icon {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }

    .selected-pubs {
      margin-top: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--background-darker);
    }

    .selected-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      background: var(--background-lighter);
      border-radius: 8px 8px 0 0;
    }

    .selected-count {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
    }

    .clear-all-btn {
      background: none;
      border: none;
      color: var(--error);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .clear-all-btn:hover {
      background: var(--background-darkest);
    }

    .selected-list {
      max-height: 200px;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .selected-pub {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 0.5rem;
      gap: 1rem;
    }

    .selected-pub:last-child {
      margin-bottom: 0;
    }

    .pub-name {
      font-weight: 500;
      color: var(--text);
      font-size: 0.875rem;
    }

    .pub-location {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    .remove-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .remove-btn:hover {
      background: var(--background-darkest);
      color: var(--error);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow);
      z-index: 50;
      max-height: 300px;
      overflow: hidden;
      margin-top: 0.25rem;
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      background: var(--background-darker);
    }

    .dropdown-title {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text);
    }

    .result-count {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .dropdown-list {
      max-height: 200px;
      overflow-y: auto;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
      border-bottom: 1px solid var(--border);
    }

    .dropdown-item:last-child {
      border-bottom: none;
    }

    .dropdown-item:hover {
      background: var(--background-lightest);
    }

    .dropdown-item.selected {
      background: var(--background-lightest);
      border-bottom-color: var(--accent);
    }

    .pub-info {
      flex: 1;
      min-width: 0;
    }

    .dropdown-item .pub-name {
      display: block;
      margin-bottom: 0.25rem;
    }

    .selection-indicator {
      flex-shrink: 0;
      margin-left: 1rem;
    }

    .selected-icon {
      color: var(--success);
      font-weight: bold;
    }

    .add-icon {
      color: var(--accent);
      font-size: 1.125rem;
    }

    .dropdown-footer {
      padding: 0.5rem 1rem;
      border-top: 1px solid var(--border);
      background: var(--background-darker);
    }

    .more-results {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-align: center;
      display: block;
    }

    .no-results {
      padding: 2rem 1rem;
      text-align: center;
    }

    .no-results-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .no-results-text {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .helper-text {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .error-text {
      font-size: 0.75rem;
      color: var(--error);
    }

    .debug-info {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--background-darker);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.75rem;
    }

    .debug-info pre {
      background: var(--background-lighter);
      padding: 0.5rem;
      border-radius: 4px;
      margin: 0.5rem 0 0;
      overflow-x: auto;
    }

    /* Responsive design */
    @media (max-width: 640px) {
      .selected-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .dropdown-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .selection-indicator {
        margin-left: 0;
        align-self: flex-end;
      }
    }
  `
})
export class PubSelectorComponent {
  // ✅ Dependencies
  private readonly pubStore = inject(PubStore);

  // ✅ Inputs
  readonly label = input<string>('Select Pubs');
  readonly required = input<boolean>(false);
  readonly searchPlaceholder = input<string>('Search pubs by name or location...');
  readonly helperText = input<string>('');
  readonly errorMessage = input<string>('');
  readonly showError = input<boolean>(false);
  readonly selectedPubIds = input<string[]>([]);
  readonly maxDisplayResults = input<number>(20);

  // ✅ Outputs
  readonly selectionChange = output<string[]>();

  // ✅ Local state
  private readonly _searchTerm = signal<string>('');
  private readonly _isDropdownOpen = signal<boolean>(false);

  // ✅ Expose state for template
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly isDropdownOpen = this._isDropdownOpen.asReadonly();

  // ✅ Computed pub data
  readonly allPubs = computed(() => this.pubStore.data());

  readonly selectedPubs = computed(() => {
    const ids = this.selectedPubIds();
    const pubs = this.allPubs();
    return ids.map(id => pubs.find(p => p.id === id)).filter(Boolean) as Pub[];
  });

  readonly hasSearchTerm = computed(() => this.searchTerm().trim().length > 0);

  readonly filteredPubs = computed(() => {
    const searchTerm = this.searchTerm().toLowerCase().trim();
    const selectedIds = new Set(this.selectedPubIds());
    const allPubs = this.allPubs();

    let filtered = allPubs;

    // Filter out already selected pubs
    filtered = filtered.filter(pub => !selectedIds.has(pub.id));

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(pub =>
        pub.name.toLowerCase().includes(searchTerm) ||
        pub.city?.toLowerCase().includes(searchTerm) ||
        pub.region?.toLowerCase().includes(searchTerm) ||
        pub.address?.toLowerCase().includes(searchTerm)
      );
    }

    // Limit results for performance
    return filtered.slice(0, this.maxDisplayResults());
  });

  // ✅ Development helper
  readonly isDevelopment = computed(() => true);

  // ✅ Debug information
  readonly debugInfo = computed(() => ({
    searchTerm: this.searchTerm(),
    isDropdownOpen: this.isDropdownOpen(),
    selectedCount: this.selectedPubs().length,
    filteredCount: this.filteredPubs().length,
    totalPubs: this.allPubs().length,
    selectedIds: this.selectedPubIds()
  }));

  // ✅ Initialize pub data
  constructor() {
    // Load pubs when component initializes
    effect(() => {
      this.pubStore.loadOnce();
    });

    // Close dropdown when clicking outside (simple version)
    effect(() => {
      if (typeof document !== 'undefined') {
        const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          if (!target.closest('.pub-selector')) {
            this.setDropdownOpen(false);
          }
        };

        if (this.isDropdownOpen()) {
          document.addEventListener('click', handleClickOutside);
          return () => document.removeEventListener('click', handleClickOutside);
        }
      }
      return undefined;
    });
  }

  // ✅ Helper methods
  getPubLocationText(pub: Pub): string {
    const parts = [pub.city, pub.region].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : pub.address || 'Location unknown';
  }

  isPubSelected(pub: Pub): boolean {
    return this.selectedPubIds().includes(pub.id);
  }

  // ✅ Event handlers
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._searchTerm.set(target.value);
    this.setDropdownOpen(true);
  }

  setDropdownOpen(open: boolean): void {
    this._isDropdownOpen.set(open);
  }

  togglePub(pub: Pub): void {
    const currentIds = [...this.selectedPubIds()];
    const index = currentIds.indexOf(pub.id);

    if (index === -1) {
      // Add pub
      currentIds.push(pub.id);
    } else {
      // Remove pub
      currentIds.splice(index, 1);
    }

    this.selectionChange.emit(currentIds);

    // Clear search and close dropdown if we added a pub
    if (index === -1) {
      this._searchTerm.set('');
      this.setDropdownOpen(false);
    }
  }

  removePub(pub: Pub): void {
    const currentIds = this.selectedPubIds().filter(id => id !== pub.id);
    this.selectionChange.emit(currentIds);
  }

  clearAll(): void {
    this.selectionChange.emit([]);
    this._searchTerm.set('');
    this.setDropdownOpen(false);
  }
}
