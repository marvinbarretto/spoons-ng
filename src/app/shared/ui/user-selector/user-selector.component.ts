// src/app/shared/ui/user-selector/user-selector.component.ts
import { Component, computed, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserStore } from '@users/data-access/user.store';
import { ChipUserComponent, type UserChipData } from '../chips/chip-user/chip-user.component';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-user-selector',
  imports: [CommonModule, FormsModule, ChipUserComponent],
  template: `
    <div class="user-selector">
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

        <!-- Selected user -->
        @if (selectedUser()) {
          <div class="selected-user">
            <div class="selected-header">
              <span class="selected-label">Selected user</span>
              <button
                type="button"
                class="clear-btn"
                (click)="clearSelection()"
              >
                Clear
              </button>
            </div>
            <div class="selected-content">
              <app-chip-user
                [user]="selectedUserChipData()"
                [showName]="true"
                size="md"
                variant="primary"
              />
            </div>
          </div>
        }

        <!-- Dropdown -->
        @if (isDropdownOpen() && filteredUsers().length > 0) {
          <div class="dropdown">
            <div class="dropdown-header">
              <span class="dropdown-title">Select a user</span>
              @if (hasSearchTerm()) {
                <span class="result-count">{{ filteredUsers().length }} results</span>
              }
            </div>
            <div class="dropdown-list">
              @for (user of filteredUsers(); track user.uid) {
                <div
                  class="dropdown-item"
                  [class.selected]="isUserSelected(user)"
                  (click)="selectUser(user)"
                >
                  <app-chip-user
                    [user]="convertToChipData(user)"
                    [showName]="true"
                    size="sm"
                    variant="default"
                  />
                  <div class="user-details">
                    <div class="user-email">{{ user.email || 'No email' }}</div>
                    <div class="user-stats">
                      {{ user.totalPoints || 0 }} points • {{ user.totalPubCount || 0 }} pubs
                    </div>
                  </div>
                  <div class="selection-indicator">
                    @if (isUserSelected(user)) {
                      <span class="selected-icon">✓</span>
                    } @else {
                      <span class="add-icon">+</span>
                    }
                  </div>
                </div>
              }
            </div>

            @if (filteredUsers().length >= maxDisplayResults()) {
              <div class="dropdown-footer">
                <span class="more-results">
                  Showing first {{ maxDisplayResults() }} results. Type to narrow search.
                </span>
              </div>
            }
          </div>
        }

        @if (isDropdownOpen() && hasSearchTerm() && filteredUsers().length === 0) {
          <div class="dropdown">
            <div class="no-results">
              <div class="no-results-icon">👤</div>
              <div class="no-results-text">No users found matching "{{ searchTerm() }}"</div>
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
    </div>
  `,
  styles: `
    .user-selector {
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

    .selected-user {
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

    .selected-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--error);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .clear-btn:hover {
      background: var(--background-darkest);
    }

    .selected-content {
      padding: 1rem;
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
      max-height: 400px;
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
      max-height: 300px;
      overflow-y: auto;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
      border-bottom: 1px solid var(--border);
    }

    .dropdown-item:last-child {
      border-bottom: none;
    }

    .dropdown-item:hover {
      background: var(--background-darkest);
    }

    .dropdown-item.selected {
      background: var(--background-darkest);
      border-bottom-color: var(--accent);
    }

    .user-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .user-email {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .user-stats {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .selection-indicator {
      flex-shrink: 0;
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

    /* Responsive design */
    @media (max-width: 640px) {
      .dropdown-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .selection-indicator {
        align-self: flex-end;
      }
    }
  `
})
export class UserSelectorComponent {
  // Dependencies
  private readonly userStore = inject(UserStore);

  // Inputs
  readonly label = input<string>('Select User');
  readonly required = input<boolean>(false);
  readonly searchPlaceholder = input<string>('Search users by name or email...');
  readonly helperText = input<string>('');
  readonly errorMessage = input<string>('');
  readonly showError = input<boolean>(false);
  readonly selectedUserId = input<string | null>(null);
  readonly maxDisplayResults = input<number>(20);

  // Outputs
  readonly selectionChange = output<string | null>();

  // Local state
  private readonly _searchTerm = signal<string>('');
  private readonly _isDropdownOpen = signal<boolean>(false);

  // Expose state for template
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly isDropdownOpen = this._isDropdownOpen.asReadonly();

  // Computed user data
  readonly allUsers = computed(() => this.userStore.data());

  readonly selectedUser = computed(() => {
    const id = this.selectedUserId();
    if (!id) return null;
    const users = this.allUsers();
    return users.find(u => u.uid === id) || null;
  });

  readonly selectedUserChipData = computed((): UserChipData => {
    const user = this.selectedUser();
    if (!user) {
      return { displayName: 'Unknown User' };
    }
    return this.convertToChipData(user);
  });

  readonly hasSearchTerm = computed(() => this.searchTerm().trim().length > 0);

  readonly filteredUsers = computed(() => {
    const searchTerm = this.searchTerm().toLowerCase().trim();
    const selectedId = this.selectedUserId();
    const allUsers = this.allUsers();

    let filtered = allUsers;

    // Filter out the already selected user
    if (selectedId) {
      filtered = filtered.filter(user => user.uid !== selectedId);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.displayName.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm) ||
        user.uid.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by display name
    filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Limit results for performance
    return filtered.slice(0, this.maxDisplayResults());
  });

  // Initialize user data
  constructor() {
    // Load users when component initializes
    effect(() => {
      this.userStore.loadOnce();
    });

    // Close dropdown when clicking outside
    effect(() => {
      if (typeof document !== 'undefined') {
        const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          if (!target.closest('.user-selector')) {
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

  // Helper methods
  convertToChipData(user: User): UserChipData {
    return {
      displayName: user.displayName,
      photoURL: user.photoURL || undefined,
      email: user.email || undefined
    };
  }

  isUserSelected(user: User): boolean {
    return this.selectedUserId() === user.uid;
  }

  // Event handlers
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._searchTerm.set(target.value);
    this.setDropdownOpen(true);
  }

  setDropdownOpen(open: boolean): void {
    this._isDropdownOpen.set(open);
  }

  selectUser(user: User): void {
    this.selectionChange.emit(user.uid);
    this._searchTerm.set('');
    this.setDropdownOpen(false);
  }

  clearSelection(): void {
    this.selectionChange.emit(null);
    this._searchTerm.set('');
    this.setDropdownOpen(false);
  }
}