import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';

import { BaseWidgetComponent } from '../base/base-widget.component';
import { CarpetStorageService } from '@carpets/data-access/carpet-storage.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { LoadingStateComponent } from '@shared/ui/loading-state/loading-state.component';
import { ErrorStateComponent } from '@shared/ui/error-state/error-state.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

type CheckInImageDisplay = {
  key: string;
  pubName: string;
  pubId: string;
  date: string;
  imageUrl: string;
};

type PubImageGroup = {
  pubName: string;
  pubId: string;
  images: CheckInImageDisplay[];
  totalCount: number;
  latestDate: string;
};

@Component({
  selector: 'app-widget-check-in-gallery',
  imports: [LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  template: `
    <div class="check-in-gallery-widget">
      <h3 class="widget-title">Check-in Gallery</h3>

      @if (loading()) {
        <app-loading-state text="Loading images..." />
      } @else if (error()) {
        <app-error-state [message]="error()!" />
      } @else if (images().length === 0) {
        <app-empty-state 
          icon="📸"
          title="No check-in images yet"
          subtitle="Check in to pubs to capture memorable moments" />
      } @else {
        <div class="gallery-header">
          <span class="count">{{ images().length }} images from {{ imageGroups().length }} pubs</span>
        </div>

        <div class="pub-groups">
          @for (group of imageGroups(); track group.pubId) {
            <div class="pub-group">
              <div class="pub-header">
                <span class="pub-name">{{ group.pubName }}</span>
                <span class="pub-count">{{ group.totalCount }} image{{ group.totalCount === 1 ? '' : 's' }}</span>
              </div>
              
              <div class="image-grid">
                @for (image of group.images; track image.key) {
                  <div class="image-item">
                    <img 
                      [src]="image.imageUrl" 
                      [alt]="'Photo from ' + image.pubName"
                      loading="lazy"
                      (error)="onImageError($event)">
                    <div class="image-info">
                      <span class="date">{{ formatDate(image.date) }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .check-in-gallery-widget {
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


    .gallery-header {
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

    .pub-groups {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .pub-group {
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      background: var(--background);
    }

    .pub-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .pub-header .pub-name {
      font-weight: 600;
      color: var(--text);
      font-size: 1rem;
    }

    .pub-count {
      font-size: 0.75rem;
      color: var(--text-secondary);
      background: var(--background-lighter);
      padding: 0.25rem 0.5rem;
      border-radius: 1rem;
    }

    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .image-item {
      position: relative;
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: 0.5rem;
      background: var(--background);
      border: 1px solid var(--border-lighter);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .image-item:hover {
      transform: scale(1.02);
      border-color: var(--border);
      box-shadow: var(--shadow);
    }

    .image-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-info {
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
      .check-in-gallery-widget {
        padding: 0.75rem;
      }

      .image-grid {
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
export class WidgetCheckInGalleryComponent extends BaseWidgetComponent implements OnDestroy {
  private readonly carpetStorageService = inject(CarpetStorageService);
  private readonly authStore = inject(AuthStore);

  // Widget state
  private readonly _images = signal<CheckInImageDisplay[]>([]);
  protected readonly images = this._images.asReadonly();
  
  // Group images by pub for better display
  protected readonly imageGroups = computed(() => {
    const images = this.images();
    const groups = new Map<string, PubImageGroup>();
    
    images.forEach(image => {
      const pubId = image.pubId;
      
      if (!groups.has(pubId)) {
        groups.set(pubId, {
          pubName: image.pubName,
          pubId,
          images: [],
          totalCount: 0,
          latestDate: image.date
        });
      }
      
      const group = groups.get(pubId)!;
      group.images.push(image);
      group.totalCount++;
      
      // Update latest date if this image is newer
      if (new Date(image.date) > new Date(group.latestDate)) {
        group.latestDate = image.date;
      }
    });
    
    // Sort groups by latest date, newest first
    const sortedGroups = Array.from(groups.values()).sort((a, b) => 
      new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
    
    // Sort images within each group by date, newest first
    sortedGroups.forEach(group => {
      group.images.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });
    
    return sortedGroups;
  });

  private lastLoadedUserId: string | null = null;
  private objectUrls: string[] = [];

  constructor() {
    super();

    // Watch for auth changes and load images accordingly
    effect(() => {
      const user = this.authStore.user();
      const userId = user?.uid;

      if (!user) {
        this.clearImages();
        this.lastLoadedUserId = null;
        return;
      }

      // Load images if user changed
      if (userId !== this.lastLoadedUserId) {
        this.lastLoadedUserId = userId || null;
        this.loadUserImages();
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

  private async loadUserImages(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      // Ensure carpet storage is initialized
      await this.carpetStorageService.initialize();

      // Get image data from IndexedDB
      const imageData = await this.carpetStorageService.getUserCarpets();

      // Convert to display format with object URLs
      const displayData: CheckInImageDisplay[] = imageData.map(image => {
        const imageUrl = URL.createObjectURL(image.blob);
        this.objectUrls.push(imageUrl); // Track for cleanup
        
        return {
          key: `${image.userId}_${image.pubId}_${Date.parse(image.date)}`, // Use original timestamp logic for display
          pubName: image.pubName || 'Unknown Pub',
          pubId: image.pubId, // Add pubId to display data
          date: image.date,
          imageUrl
        };
      });

      // Sort by date, newest first
      displayData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      this._images.set(displayData);

    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load images');
      console.error('[CheckInGalleryWidget] Error loading images:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private clearImages(): void {
    this.clearObjectUrls();
    this._images.set([]);
    this.error.set(null);
  }

  private clearObjectUrls(): void {
    // Clean up object URLs to prevent memory leaks
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls = [];
  }
}