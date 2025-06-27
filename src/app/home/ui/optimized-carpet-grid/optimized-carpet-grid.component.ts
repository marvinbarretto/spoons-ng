import { Component, Input, Signal, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';

export type CarpetDisplayData = {
  key: string;
  pubId: string;
  pubName: string;
  date: string;
  imageUrl: string;
};

@Component({
  selector: 'app-optimized-carpet-grid',
  imports: [CommonModule, JsonPipe],
  template: `
    <div class="carpet-grid-container">
      @if (loading()) {
        <div class="loading-state">
          <span>Loading carpets...</span>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <span>Error: {{ error() }}</span>
        </div>
      } @else if (carpets().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">📸</span>
          <h3>No carpets collected yet</h3>
          <p>Check in to pubs to capture their unique carpets</p>
        </div>
      } @else {
        <div class="carpet-header">
          <h3>Your Carpet Collection</h3>
          <span class="count">{{ carpets().length }} carpets</span>
        </div>
        
        <div class="carpet-grid">
          @for (carpet of carpets(); track carpet.key) {
            <div class="carpet-item">
              <img 
                [src]="carpet.imageUrl"
                [alt]="'Carpet from ' + carpet.pubName"
                (error)="onImageError($event)"
                loading="lazy">
              <div class="carpet-info">
                <span class="pub-name">{{ carpet.pubName }}</span>
                <span class="date">{{ formatDate(carpet.date) }}</span>
              </div>
            </div>
          }
        </div>
        
        <!-- DEBUG: Raw carpet data -->
        <details style="margin-top: 1rem; font-family: monospace;">
          <summary>🐛 Debug: Raw Carpet Data</summary>
          <pre style="background: #f5f5f5; padding: 1rem; overflow: auto; font-size: 12px;">{{ carpets() | json }}</pre>
        </details>
      }
    </div>
  `,
  styles: [`
    .carpet-grid-container {
      padding: 1rem;
    }

    /* States */
    .loading-state, .error-state, .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #666;
    }

    .error-state {
      color: #dc3545;
    }

    .empty-state .empty-icon {
      display: block;
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      color: #333;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    /* Header */
    .carpet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .carpet-header h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .count {
      font-size: 0.875rem;
      color: #666;
    }

    /* Grid */
    .carpet-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    /* Carpet Item */
    .carpet-item {
      position: relative;
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: 8px;
      background: #f5f5f5;
      cursor: pointer;
    }

    .carpet-item:hover {
      transform: scale(1.02);
      transition: transform 0.2s ease;
    }

    .carpet-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .carpet-item.error img {
      display: none;
    }

    .carpet-item.error::before {
      content: '🏞️';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2rem;
      opacity: 0.3;
    }

    /* Info */
    .carpet-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0.5rem;
      background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
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

    /* Mobile */
    @media (max-width: 640px) {
      .carpet-grid-container {
        padding: 0.75rem;
      }

      .carpet-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 0.5rem;
      }
    }
  `]
})
export class OptimizedCarpetGridComponent implements OnDestroy {
  @Input() carpets: Signal<CarpetDisplayData[]> = signal([]);
  @Input() loading: Signal<boolean> = signal(false);
  @Input() error: Signal<string | null> = signal(null);

  private objectUrls = new Set<string>();
  private keyToUrlMap = new Map<string, string>();

  ngOnDestroy(): void {
    // Clean up all object URLs to prevent memory leaks
    this.cleanupObjectUrls();
  }

  private cleanupObjectUrls(): void {
    this.objectUrls.forEach(url => {
      URL.revokeObjectURL(url);
      console.log('🧹 [OptimizedCarpetGrid] Revoked object URL');
    });
    this.objectUrls.clear();
    this.keyToUrlMap.clear();
  }

  private trackCarpetUrls(): void {
    const currentCarpets = this.carpets();
    const currentKeys = new Set(currentCarpets.map(c => c.key));
    
    // Revoke URLs for carpets that are no longer present
    this.keyToUrlMap.forEach((url, key) => {
      if (!currentKeys.has(key)) {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(url);
        this.keyToUrlMap.delete(key);
        console.log('🧹 [OptimizedCarpetGrid] Revoked URL for removed carpet:', key);
      }
    });
    
    // Track new URLs
    currentCarpets.forEach(carpet => {
      if (carpet.imageUrl.startsWith('blob:')) {
        if (!this.keyToUrlMap.has(carpet.key)) {
          this.objectUrls.add(carpet.imageUrl);
          this.keyToUrlMap.set(carpet.key, carpet.imageUrl);
          console.log('📎 [OptimizedCarpetGrid] Tracking new object URL for:', carpet.key);
        }
      }
    });
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.parentElement?.classList.add('error');
  }

  constructor() {
    // Use effect to track URL changes reactively
    effect(() => {
      this.trackCarpetUrls();
    });
  }
}