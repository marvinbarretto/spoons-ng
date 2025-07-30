// src/app/carpets/ui/carpet-grid/carpet-grid.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

export type CarpetDisplayData = {
  key: string;
  pubId: string;
  pubName: string;
  date: string;
  imageUrl: string;
};

@Component({
  selector: 'app-carpet-grid',

  imports: [CommonModule],
  template: `
    <div class="carpet-collection">
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading your carpet collection...</p>
        </div>
      } @else if (carpets().length === 0) {
        <div class="empty-state">
          <div class="icon">📸</div>
          <h3>No carpets yet!</h3>
          <p>Check in to pubs to capture their unique carpets</p>
        </div>
      } @else {
        <div class="carpet-header">
          <h3>Your Carpet Collection</h3>
          <span class="count">{{ carpets().length }} carpets</span>
        </div>

        <div class="carpet-grid">
          @for (carpet of carpets(); track carpet.key) {
            <div class="carpet-item" [title]="carpet.pubName + ' - ' + formatDate(carpet.date)">
              <img
                [src]="carpet.imageUrl"
                [alt]="'Carpet from ' + carpet.pubName"
                (error)="onImageError($event)"
                loading="lazy"
              />
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
  styles: [
    `
      .carpet-collection {
        padding: 16px;
      }

      /* Loading State */
      .loading-state,
      .empty-state {
        text-align: center;
        padding: 48px 24px;
        color: #6b7280;
      }

      .spinner {
        width: 40px;
        height: 40px;
        margin: 0 auto 16px;
        border: 3px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .empty-state .icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .empty-state h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 600;
        color: #374151;
      }

      .empty-state p {
        margin: 0;
        font-size: 14px;
      }

      /* Header */
      .carpet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .carpet-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }

      .count {
        font-size: 14px;
        color: #6b7280;
        font-weight: 500;
      }

      /* Grid Layout */
      .carpet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
      }

      /* Carpet Item */
      .carpet-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 12px;
        overflow: hidden;
        background: #f3f4f6;
        cursor: pointer;
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .carpet-item:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      .carpet-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Info Overlay */
      .carpet-info {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 8px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
        color: white;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .carpet-item:hover .carpet-info {
        opacity: 1;
      }

      .pub-name {
        display: block;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
      }

      .date {
        display: block;
        font-size: 11px;
        opacity: 0.9;
      }

      /* Mobile Adjustments */
      @media (max-width: 640px) {
        .carpet-collection {
          padding: 12px;
        }

        .carpet-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 8px;
        }

        .carpet-info {
          opacity: 1; /* Always show on mobile */
          font-size: 11px;
        }
      }

      /* Error state for broken images */
      .carpet-item.error img {
        display: none;
      }

      .carpet-item.error::before {
        content: '🏞️';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 32px;
        opacity: 0.3;
      }
    `,
  ],
})
export class CarpetGridComponent {
  @Input() carpets = signal<CarpetDisplayData[]>([]);
  @Input() loading = signal(false);

  // TODO: sort out these inputs

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return '';
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.parentElement?.classList.add('error');
  }
}
