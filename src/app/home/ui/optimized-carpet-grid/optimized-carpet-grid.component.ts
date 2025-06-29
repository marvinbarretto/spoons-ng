import { Component, Input, Signal, signal, OnDestroy, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseWidgetComponent } from '../../../widgets/base/base-widget.component';
import { ObjectUrlManager } from '@shared/utils/object-url-manager';
import { formatShortDate } from '@shared/utils/date-formatter';

export type CarpetDisplayData = {
  key: string;
  pubId: string;
  pubName: string;
  date: string;
  imageUrl: string;
};

@Component({
  selector: 'app-optimized-carpet-grid',
  imports: [CommonModule],
  template: `
    <div class="carpet-collection-widget">
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
                (error)="onImageError($event)"
                loading="lazy">
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
    .carpet-collection-widget {
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

    /* Header */
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
      color: var(--text-secondary);
    }

    /* Info */
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

    /* Mobile responsive */
    @media (max-width: 640px) {
      .carpet-collection-widget {
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
export class OptimizedCarpetGridComponent extends BaseWidgetComponent implements OnDestroy {
  @Input() carpets: Signal<CarpetDisplayData[]> = signal([]);
  @Input() loading: Signal<boolean> = signal(false);
  @Input() error: Signal<string | null> = signal(null);

  private readonly urlManager = new ObjectUrlManager();

  ngOnDestroy(): void {
    this.urlManager.cleanup();
  }

  formatDate = formatShortDate;

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.parentElement?.classList.add('error');
  }

  constructor() {
    // Track URL changes reactively
    effect(() => {
      this.urlManager.trackUrls(this.carpets());
    });
  }
}