import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PubSelectorComponent } from '../pub-selector/pub-selector.component';
import { ButtonComponent } from '../button/button.component';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { DataAggregatorService } from '../../data-access/data-aggregator.service';
import { UserStore } from '../../../users/data-access/user.store';
import { LocationService } from '../../data-access/location.service';
import type { Pub } from '../../../pubs/utils/pub.models';

interface SmartSuggestion {
  category: 'local';
  pubs: Pub[];
  title: string;
  icon: string;
}

@Component({
  selector: 'app-historical-pub-addition-modal',
  imports: [CommonModule, PubSelectorComponent, ButtonComponent],
  template: `
    <div class="historical-modal">
      <div class="modal-header">
        <h2 class="modal-title">🍺 Add Historic Wetherspoons Visits</h2>
        <p class="modal-subtitle">Document your past loyalty to boost your legendary status</p>
      </div>

      <!-- User Profile Section -->
      <div class="profile-section">
        <div class="profile-card">
          <div class="profile-info">
            <div class="profile-name">{{ user()?.displayName || 'Anonymous User' }}</div>
            <div class="profile-stats">
              <span class="stat-item">
                <span class="stat-value">{{ currentScoreboardData().pubsVisited || 0 }}</span>
                <span class="stat-label">Pubs Visited</span>
              </span>
              <span class="stat-item">
                <span class="stat-value">{{ currentScoreboardData().totalPoints || 0 }}</span>
                <span class="stat-label">Total Points</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Section - First Priority -->
      <div class="search-section">
        <app-pub-selector
          label="Search All Wetherspoons"
          searchPlaceholder="Search pubs by name, location, or region..."
          helperText="Find any Wetherspoons you've visited in the past"
          [selectedPubIds]="selectedPubIds()"
          [maxDisplayResults]="15"
          (selectionChange)="onPubSelectorChange($event)"
        />
      </div>

      <!-- Location-Based Quick Add -->
      @if (localSuggestions().length > 0) {
        <div class="suggestions-section">
          <h3 class="section-title">🏠 Quick Add - Near You</h3>
          
          <div class="suggestion-chips">
            @for (pub of localSuggestions(); track pub.id) {
              <button 
                class="suggestion-chip"
                [class.selected]="isPubSelected(pub.id)"
                (click)="toggleSuggestionPub(pub.id)"
                type="button"
              >
                {{ pub.name }}
                <span class="chip-location">{{ pub.city }}</span>
                <span class="chip-indicator">{{ isPubSelected(pub.id) ? '✓' : '+' }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- Selection Summary with Live Score Update -->
      @if (selectedPubIds().length > 0) {
        <div class="selection-summary">
          <div class="summary-content">
            <span class="summary-icon">📈</span>
            <div class="summary-stats">
              <span class="summary-text">
                {{ selectedPubIds().length }} historic visit{{ selectedPubIds().length === 1 ? '' : 's' }} ready to add
              </span>
              <span class="score-preview">
                Pub count: {{ currentScoreboardData().pubsVisited }} → {{ previewPubCount() }}
              </span>
            </div>
          </div>
          <button 
            class="clear-selection-btn"
            (click)="clearAllSelections()"
            type="button"
          >
            Clear all
          </button>
        </div>
      }

      <!-- Modal Actions -->
      <div class="modal-actions">
        <app-button
          variant="secondary"
          size="md"
          (onClick)="handleCancel()"
        >
          Cancel
        </app-button>
        
        <app-button
          variant="primary"
          size="md"
          [disabled]="selectedPubIds().length === 0"
          (onClick)="handleSave()"
        >
          Add {{ selectedPubIds().length }} Historic Visit{{ selectedPubIds().length === 1 ? '' : 's' }}
        </app-button>
      </div>
    </div>
  `,
  styles: `
    .historical-modal {
      background: var(--background);
      border-radius: 16px;
      padding: 2rem;
      max-width: 600px;
      width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      color: var(--text);
    }

    .modal-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: var(--text);
    }

    .modal-subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0;
      font-style: italic;
    }

    .profile-section {
      margin-bottom: 2rem;
    }

    .profile-card {
      padding: 1rem;
      background: var(--background-lighter);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .profile-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .profile-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--text);
    }

    .profile-stats {
      display: flex;
      gap: 1.5rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .stat-value {
      font-weight: 700;
      font-size: 1.25rem;
      color: var(--accent);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .search-section {
      margin-bottom: 2rem;
    }

    .suggestions-section {
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .suggestion-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .suggestion-chip {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text);
      flex-direction: column;
      text-align: center;
      min-width: 140px;
    }

    .chip-location {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .suggestion-chip:hover {
      background: var(--background-darker);
      border-color: var(--accent);
    }

    .suggestion-chip.selected {
      background: var(--accent);
      color: var(--accent-contrast);
      border-color: var(--accent);
    }

    .chip-indicator {
      font-weight: bold;
      font-size: 0.75rem;
    }


    .selection-summary {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .summary-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .summary-icon {
      font-size: 1.25rem;
    }

    .summary-stats {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-text {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
    }

    .score-preview {
      font-size: 0.75rem;
      color: var(--accent);
      font-weight: 600;
    }

    .clear-selection-btn {
      background: none;
      border: none;
      color: var(--error);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      transition: background-color 0.2s ease;
    }

    .clear-selection-btn:hover {
      background: var(--background-darker);
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
      .historical-modal {
        padding: 1.5rem;
        border-radius: 12px;
      }

      .suggestion-chips {
        gap: 0.375rem;
      }

      .suggestion-chip {
        padding: 0.375rem 0.75rem;
        font-size: 0.8rem;
      }

      .modal-actions {
        flex-direction: column;
      }

      .selection-summary {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      .suggestion-chip {
        min-width: 120px;
        padding: 0.375rem 0.75rem;
      }
    }
  `
})
export class HistoricalPubAdditionModalComponent {
  // Dependencies
  private readonly pubStore = inject(PubStore);
  private readonly dataAggregatorService = inject(DataAggregatorService);
  private readonly userStore = inject(UserStore);
  private readonly locationService = inject(LocationService);

  // Outputs
  readonly result = output<string[]>();

  // State
  private readonly _selectedPubIds = signal<string[]>([]);
  readonly selectedPubIds = this._selectedPubIds.asReadonly();

  // Computed data
  readonly allPubs = computed(() => this.pubStore.data());
  readonly user = computed(() => this.userStore.user());

  // Current scoreboard data (reactive)
  readonly currentScoreboardData = computed(() => this.dataAggregatorService.scoreboardData());

  // Preview what the pub count would be with selections
  readonly previewPubCount = computed(() => {
    const current = this.currentScoreboardData().pubsVisited || 0;
    return current + this.selectedPubIds().length;
  });

  // Location-based suggestions only
  readonly localSuggestions = computed((): Pub[] => {
    const allPubs = this.allPubs();
    if (allPubs.length === 0) return [];

    // TODO: Use user's actual location for better suggestions
    // For now, get first 8 pubs from different cities
    const localPubs = allPubs
      .filter(pub => pub.city && pub.region)
      .slice(0, 8);

    return localPubs;
  });

  constructor() {
    // Ensure pubs are loaded
    this.pubStore.loadOnce();
  }


  // Helper methods
  isPubSelected(pubId: string): boolean {
    return this.selectedPubIds().includes(pubId);
  }

  // Event handlers
  toggleSuggestionPub(pubId: string): void {
    const currentIds = [...this.selectedPubIds()];
    const index = currentIds.indexOf(pubId);

    if (index === -1) {
      currentIds.push(pubId);
    } else {
      currentIds.splice(index, 1);
    }

    this._selectedPubIds.set(currentIds);
  }

  onPubSelectorChange(pubIds: string[]): void {
    this._selectedPubIds.set(pubIds);
  }

  clearAllSelections(): void {
    this._selectedPubIds.set([]);
  }

  handleCancel(): void {
    this.result.emit([]);
  }

  async handleSave(): Promise<void> {
    const selectedIds = this.selectedPubIds();
    const user = this.user();
    
    if (selectedIds.length === 0 || !user) {
      return;
    }

    try {
      // Get current manually added pub IDs to avoid duplicates
      const currentManualIds = user.manuallyAddedPubIds || [];
      
      // Filter out any IDs that are already in the user's manual list
      const newPubIds = selectedIds.filter(id => !currentManualIds.includes(id));
      
      if (newPubIds.length === 0) {
        console.log('[HistoricalPubModal] All selected pubs already in user\'s manual list');
        this.result.emit([]);
        return;
      }

      // Update user's manually added pub IDs
      const updatedManualIds = [...currentManualIds, ...newPubIds];
      
      // Calculate new pub counts
      const newUnverifiedCount = (user.unverifiedPubCount || 0) + newPubIds.length;
      const newTotalCount = (user.verifiedPubCount || 0) + newUnverifiedCount;

      // Update user document with new manually added pubs
      await this.userStore.patchUser({
        manuallyAddedPubIds: updatedManualIds,
        unverifiedPubCount: newUnverifiedCount,
        totalPubCount: newTotalCount
      });

      console.log(`[HistoricalPubModal] Successfully added ${newPubIds.length} historic pubs to user ${user.uid}`);
      
      // Emit the successfully added IDs
      this.result.emit(newPubIds);
      
    } catch (error) {
      console.error('[HistoricalPubModal] Error saving historic pubs:', error);
      // Still emit empty array to close modal gracefully
      this.result.emit([]);
    }
  }
}