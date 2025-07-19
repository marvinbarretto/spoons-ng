import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';

import { BaseWidgetComponent } from '../base/base-widget.component';
import { CarpetStorageService } from '@carpets/data-access/carpet-storage.service';
import { AuthStore } from '@auth/data-access/auth.store';

type CarpetDisplay = {
  key: string;
  pubName: string;
  date: string;
  imageUrl: string;
};

@Component({
  selector: 'app-carpet-widget',
  imports: [],
  template: `
    <div class="carpet-widget">
      <h3 class="widget-title">Your Carpet Collection</h3>

      @if (loading()) {
        <div class="widget-loading">
          <span class="loading-spinner"></span>
          <span>Loading carpets...</span>
        </div>
      } @else if (error()) {
        <div class="widget-error">
          <span class="error-icon">⚠️</span>
          <span>{{ error() }}</span>
        </div>
      } @else if (carpets().length === 0) {
        <div class="widget-empty">
          <span class="empty-icon">📸</span>
          <div class="empty-content">
            <p class="empty-title">No carpets collected yet</p>
            <p class="empty-subtitle">Check in to pubs to capture their unique carpets</p>
          </div>
        </div>
      } @else {
        <div class="carpet-header">
          <span class="count">{{ carpets().length }} carpets collected</span>
        </div>

        <div class="carpet-grid">
          @for (carpet of carpets(); track carpet.key) {
            <div class="carpet-item">
              <img 
                [src]="carpet.imageUrl" 
                [alt]="'Carpet from ' + carpet.pubName"
                loading="lazy"
                (error)="onImageError($event)">
              <div class="carpet-info">
                <span class="pub-name">{{ carpet.pubName }}</span>
                <span class="date">{{ formatDate(carpet.date) }}</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .carpet-widget {
      padding: 1rem;
      background: var(--background-lighter);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-title {
      margin: 0 0 1rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }

    .widget-loading,
    .widget-error,
    .widget-empty {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem 1rem;
      justify-content: center;
      color: var(--text-secondary);
    }

    .loading-spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .widget-empty {
      flex-direction: column;
      text-align: center;
      gap: 0.5rem;
    }

    .empty-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .empty-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .empty-title {
      margin: 0;
      font-weight: 600;
      color: var(--text);
    }

    .empty-subtitle {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .carpet-header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 1rem;
    }

    .count {
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .carpet-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .carpet-item {
      position: relative;
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: 0.5rem;
      background: var(--background);
      border: 1px solid var(--border-lighter);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .carpet-item:hover {
      transform: scale(1.02);
      border-color: var(--border);
      box-shadow: var(--shadow);
    }

    .carpet-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .carpet-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0.5rem;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
      color: white;
      font-size: 0.75rem;
    }

    .pub-name {
      display: block;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 0.125rem;
    }

    .date {
      display: block;
      font-size: 0.625rem;
      opacity: 0.9;
    }

    @media (max-width: 640px) {
      .carpet-widget {
        padding: 0.75rem;
      }

      .carpet-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 0.5rem;
      }

      .widget-title {
        font-size: 1rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarpetWidgetComponent extends BaseWidgetComponent implements OnDestroy {
  private readonly carpetStorageService = inject(CarpetStorageService);
  private readonly authStore = inject(AuthStore);

  // Widget state
  private readonly _carpets = signal<CarpetDisplay[]>([]);
  protected readonly carpets = this._carpets.asReadonly();

  private lastLoadedUserId: string | null = null;
  private objectUrls: string[] = [];

  constructor() {
    super();

    // Watch for auth changes and load carpets accordingly
    effect(() => {
      const user = this.authStore.user();
      const userId = user?.uid;

      if (!user) {
        this.clearCarpets();
        this.lastLoadedUserId = null;
        return;
      }

      // Load carpets if user changed
      if (userId !== this.lastLoadedUserId) {
        this.lastLoadedUserId = userId || null;
        this.loadUserCarpets();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearObjectUrls();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  private async loadUserCarpets(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      // Ensure carpet storage is initialized
      await this.carpetStorageService.initialize();

      // Get carpet data from IndexedDB
      const carpetData = await this.carpetStorageService.getUserCarpets();

      // Convert to display format with object URLs
      const displayData: CarpetDisplay[] = carpetData.map(carpet => {
        const imageUrl = URL.createObjectURL(carpet.blob);
        this.objectUrls.push(imageUrl); // Track for cleanup
        
        return {
          key: `${carpet.pubId}_${carpet.dateKey}`,
          pubName: carpet.pubName || 'Unknown Pub',
          date: carpet.date,
          imageUrl
        };
      });

      // Sort by date, newest first
      displayData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      this._carpets.set(displayData);

    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load carpets');
      console.error('[CarpetWidget] Error loading carpets:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private clearCarpets(): void {
    this.clearObjectUrls();
    this._carpets.set([]);
    this.error.set(null);
  }

  private clearObjectUrls(): void {
    // Clean up object URLs to prevent memory leaks
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls = [];
  }
}