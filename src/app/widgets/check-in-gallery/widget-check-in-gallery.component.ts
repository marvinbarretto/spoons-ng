import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';

import { AuthStore } from '@auth/data-access/auth.store';
import { CarpetStorageService } from '@carpets/data-access/carpet-storage.service';
import { CheckInStore } from '@check-in/data-access/check-in.store';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '@fourfold/angular-foundation';
import { PubStore } from '@pubs/data-access/pub.store';
import { OrdinalPipe } from '@shared/pipes/ordinal.pipe';
import { BaseWidgetComponent } from '../base/base-widget.component';

// Default placeholder image for check-ins without stored carpet images
const DEFAULT_CARPET_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMTAwQzE5Mi4yNiAxMDAgMTg2IDEwNi4yNiAxODYgMTE0VjI4NkMxODYgMjkzLjc0IDE5Mi4yNiAzMDAgMjAwIDMwMEMyMDcuNzQgMzAwIDIxNCAyOTMuNzQgMjE0IDI4NlYxMTRDMjE0IDEwNi4yNiAyMDcuNzQgMTAwIDIwMCAxMDBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xNDAgMTYwQzEzMi4yNiAxNjAgMTI2IDE2Ni4yNiAxMjYgMTc0VjIyNkMxMjYgMjMzLjc0IDEzMi4yNiAyNDAgMTQwIDI0MEMxNDcuNzQgMjQwIDE1NCAyMzMuNzQgMTU0IDIyNlYxNzRDMTU0IDE2Ni4yNiAxNDcuNzQgMTYwIDE0MCAxNjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yNjAgMTYwQzI1Mi4yNiAxNjAgMjQ2IDE2Ni4yNiAyNDYgMTc0VjIyNkMyNDYgMjMzLjc0IDI1Mi4yNiAyNDAgMjYwIDI0MEMyNjcuNzQgMjQwIDI3NCAyMzMuNzQgMjc0IDIyNlYxNzRDMjc0IDE2Ni4yNiAyNjcuNzQgMTYwIDI2MCAxNjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMzMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';

type CheckInImageDisplay = {
  key: string;
  pubName: string;
  pubId: string;
  date: string;
  imageUrl: string;
  pubVisitNumber: number;
  badgeName?: string;
  missionUpdated?: boolean;
  isPlaceholder?: boolean; // True if using fallback image, false/undefined if real image
};

@Component({
  selector: 'app-widget-check-in-gallery',
  imports: [LoadingStateComponent, ErrorStateComponent, EmptyStateComponent, OrdinalPipe],
  template: `
    <div class="check-in-gallery-widget">
      <h3 class="widget-title">Check-in Gallery</h3>

      @if (loading()) {
        <ff-loading-state text="Loading images..." />
      } @else if (error()) {
        <ff-error-state [message]="error()!" />
      } @else if (images().length === 0) {
        <ff-empty-state
          icon="📸"
          title="No check-in images yet"
          subtitle="Check in to pubs to capture memorable moments"
        />
      } @else {
        <div class="gallery-header">
          <span class="count"
            >{{ images().length }} carpet photos • {{ uniquePubCount() }} pubs visited</span
          >
        </div>

        <div class="image-grid">
          @for (image of images(); track image.key) {
            <div class="image-item" [class.placeholder]="image.isPlaceholder">
              <img
                [src]="image.imageUrl"
                [alt]="'Carpet photo from ' + image.pubName"
                loading="lazy"
                (error)="onImageError($event)"
              />
              @if (image.isPlaceholder) {
                <div class="placeholder-overlay">
                  <div class="placeholder-icon">📷</div>
                  <div class="placeholder-text">No Image</div>
                </div>
              }
              <div class="image-info">
                <div class="pub-name">{{ image.pubName }}</div>
                <div class="metadata">
                  <span class="date">{{ formatDate(image.date) }}</span>
                  <span class="visit-number">{{ image.pubVisitNumber | ordinal }} pub</span>
                  @if (image.isPlaceholder) {
                    <span class="placeholder-indicator">📋 Check-in only</span>
                  }
                  @if (image.badgeName) {
                    <span class="badge-earned">🏆 {{ image.badgeName }}</span>
                  }
                  @if (image.missionUpdated) {
                    <span class="mission-updated">🎯 Mission</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
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
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border);
      }

      .count {
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }

      .image-item {
        position: relative;
        aspect-ratio: 1;
        overflow: hidden;
        border-radius: 0.5rem;
        background: var(--background);
        border: 1px solid var(--border);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .image-item:hover {
        transform: scale(1.02);
        border-color: var(--primary);
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
        padding: 0.75rem;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6), transparent);
        color: white;
      }

      .pub-name {
        font-weight: 600;
        font-size: 0.875rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 0.25rem;
      }

      .metadata {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        font-size: 0.625rem;
        opacity: 0.9;
      }

      .metadata span {
        background: rgba(255, 255, 255, 0.2);
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        white-space: nowrap;
      }

      .date {
        background: rgba(var(--primary), 0.8) !important;
      }

      .visit-number {
        background: rgba(var(--accent), 0.8) !important;
      }

      .badge-earned {
        background: var(--warning) !important;
        color: var(--background) !important;
        font-weight: 600;
      }

      .mission-updated {
        background: var(--info) !important;
        color: var(--background-lighter) !important;
        font-weight: 600;
      }

      /* Placeholder image styles */
      .image-item.placeholder {
        border: 2px dashed var(--border);
        opacity: 0.8;
      }

      .placeholder-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: var(--text-secondary);
        pointer-events: none;
      }

      .placeholder-icon {
        font-size: 2rem;
        margin-bottom: 0.25rem;
        opacity: 0.6;
      }

      .placeholder-text {
        font-size: 0.75rem;
        font-weight: 500;
        opacity: 0.8;
      }

      .placeholder-indicator {
        background: var(--text-secondary) !important;
        color: var(--background) !important;
        font-weight: 500;
      }

      @media (max-width: 768px) {
        .image-grid {
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0.75rem;
        }
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

        .image-info {
          padding: 0.5rem;
        }

        .metadata {
          gap: 0.25rem;
        }

        .metadata span {
          font-size: 0.5rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetCheckInGalleryComponent extends BaseWidgetComponent implements OnDestroy {
  private readonly carpetStorageService = inject(CarpetStorageService);
  private readonly authStore = inject(AuthStore);
  private readonly checkinStore = inject(CheckInStore);
  private readonly pubStore = inject(PubStore);

  // Widget state
  private readonly _images = signal<CheckInImageDisplay[]>([]);
  protected readonly images = this._images.asReadonly();

  // Computed for unique pub count
  protected readonly uniquePubCount = computed(() => {
    const images = this.images();
    const uniquePubIds = new Set(images.map(img => img.pubId));
    return uniquePubIds.size;
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
      month: 'short',
      year: '2-digit',
    });
  }

  private calculatePubVisitNumber(pubId: string, checkInDate: string): number {
    console.log(
      `[CheckInGallery] 🔢 calculatePubVisitNumber called for pubId: ${pubId}, date: ${checkInDate}`
    );

    const currentUserId = this.authStore.uid();
    console.log('[CheckInGallery] 👤 Current user ID:', currentUserId);

    const userCheckins = this.checkinStore
      .checkins()
      .filter(c => c.userId === currentUserId)
      .sort((a, b) => a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime());

    console.log('[CheckInGallery] 📋 User checkins (sorted chronologically):', userCheckins.length);
    userCheckins.forEach((checkin, index) => {
      console.log(`[CheckInGallery] 📅 Checkin ${index + 1}:`, {
        pubId: checkin.pubId,
        timestamp: checkin.timestamp.toDate(),
        dateKey: checkin.dateKey,
      });
    });

    const uniquePubIds = new Set<string>();
    let visitNumber = 1;

    console.log('[CheckInGallery] 🔍 Processing checkins to find visit number...');
    for (const checkin of userCheckins) {
      console.log(`[CheckInGallery] 🏛️ Processing checkin for pub: ${checkin.pubId}`);

      if (!uniquePubIds.has(checkin.pubId)) {
        console.log(
          `[CheckInGallery] 🆕 First visit to pub: ${checkin.pubId}, assigning visit number: ${visitNumber}`
        );
        uniquePubIds.add(checkin.pubId);

        if (checkin.pubId === pubId) {
          console.log(`[CheckInGallery] 🎯 Found target pub! Visit number: ${visitNumber}`);
          return visitNumber;
        }
        visitNumber++;
      } else {
        console.log(`[CheckInGallery] 🔄 Already visited pub: ${checkin.pubId}, skipping`);
      }
    }

    console.log(
      `[CheckInGallery] ⚠️ Pub ${pubId} not found in checkins, returning default visit number: ${visitNumber}`
    );
    return visitNumber;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  private async loadUserImages(): Promise<void> {
    console.log('[CheckInGallery] 🚀 Starting loadUserImages');
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      // Ensure carpet storage is initialized
      console.log('[CheckInGallery] 🔧 Initializing carpet storage service');
      await this.carpetStorageService.initialize();

      // Get image data from IndexedDB
      console.log('[CheckInGallery] 📂 Getting user carpets from storage');
      const imageData = await this.carpetStorageService.getUserCarpets();
      console.log('[CheckInGallery] 📊 Retrieved carpet data:', imageData.length, 'images');

      // Log each image data in detail
      imageData.forEach((image, index) => {
        console.log(`[CheckInGallery] 📸 Image ${index + 1}:`, {
          pubId: image.pubId,
          pubName: image.pubName,
          date: image.date,
          userId: image.userId,
          hasBlob: !!image.blob,
        });
      });

      // Get check-in data for correlation
      console.log('[CheckInGallery] 🔍 Getting check-ins for correlation');
      const allCheckins = this.checkinStore.checkins();
      console.log('[CheckInGallery] 📋 Available check-ins:', allCheckins.length);

      // Log all check-ins in detail with carpet image association info
      allCheckins.forEach((checkin, index) => {
        console.log(`[CheckInGallery] ✅ Check-in ${index + 1}:`, {
          id: checkin.id,
          pubId: checkin.pubId,
          userId: checkin.userId,
          timestamp: checkin.timestamp.toDate(),
          dateKey: checkin.dateKey,
          carpetImageKey: checkin.carpetImageKey, // Key field for image association!
          hasCarpetImageKey: !!checkin.carpetImageKey,
          badgeName: checkin.badgeName,
          missionUpdated: checkin.missionUpdated,
        });
      });

      // ✨ ENHANCED DEBUGGING: Check carpet image key associations
      console.log('[CheckInGallery] 🔍 === CARPET IMAGE ASSOCIATION ANALYSIS ===');
      const checkinsWithImages = allCheckins.filter(c => !!c.carpetImageKey);
      const checkinsWithoutImages = allCheckins.filter(c => !c.carpetImageKey);
      console.log(
        `[CheckInGallery] 📊 Check-ins WITH carpet image keys: ${checkinsWithImages.length}`
      );
      console.log(
        `[CheckInGallery] 📊 Check-ins WITHOUT carpet image keys: ${checkinsWithoutImages.length}`
      );
      console.log(
        "[CheckInGallery] 🎯 Root cause: Check-ins missing carpetImageKey won't show in gallery"
      );
      if (checkinsWithoutImages.length > 0) {
        console.log(
          '[CheckInGallery] 💡 These check-ins have no associated images (graceful degradation needed):'
        );
        checkinsWithoutImages.forEach((checkin, index) => {
          console.log(
            `[CheckInGallery]   ${index + 1}. ${checkin.pubId} (${checkin.timestamp.toDate().toISOString()})`
          );
        });
      }
      console.log('[CheckInGallery] 🔍 ==============================================');

      // 🆕 NEW APPROACH: Process check-ins first, then find corresponding images (with fallbacks)
      console.log('[CheckInGallery] 🔄 Processing check-ins with fallback image logic...');
      
      const displayData: CheckInImageDisplay[] = allCheckins.map((checkin, index) => {
        console.log(`[CheckInGallery] 🔄 Processing check-in ${index + 1} for display`);

        // Try to find matching stored image for this check-in
        const matchingImage = imageData.find(image => {
          const timeDiff = Math.abs(
            checkin.timestamp.toDate().getTime() - new Date(image.date).getTime()
          );
          const isMatch =
            checkin.pubId === image.pubId && 
            checkin.userId === image.userId && 
            timeDiff < 24 * 60 * 60 * 1000; // Within 24 hours

          console.log(`[CheckInGallery] 🔍 Checking image match for check-in ${checkin.id}:`, {
            imageDate: image.date,
            checkinDate: checkin.timestamp.toDate(),
            pubMatch: checkin.pubId === image.pubId,
            userMatch: checkin.userId === image.userId,
            timeDiffHours: timeDiff / (1000 * 60 * 60),
            isMatch,
          });

          return isMatch;
        });

        // Determine image URL and type
        let imageUrl: string;
        let isPlaceholder: boolean;
        
        if (matchingImage) {
          // Real image found - create object URL
          imageUrl = URL.createObjectURL(matchingImage.blob);
          this.objectUrls.push(imageUrl); // Track for cleanup
          isPlaceholder = false;
          console.log(`[CheckInGallery] ✅ Found real image for check-in ${checkin.id}`);
        } else {
          // No image found - use placeholder
          imageUrl = DEFAULT_CARPET_IMAGE;
          isPlaceholder = true;
          console.log(`[CheckInGallery] 📷 Using placeholder image for check-in ${checkin.id}`);
        }

        // Calculate pub visit number based on check-in date
        const pubVisitNumber = this.calculatePubVisitNumber(checkin.pubId, checkin.timestamp.toDate().toISOString());
        
        // Get pub name from store
        const pubName = this.pubStore.get(checkin.pubId)?.name || 'Unknown Pub';

        const result: CheckInImageDisplay = {
          key: `${checkin.userId}_${checkin.pubId}_${checkin.timestamp.toMillis()}`,
          pubName,
          pubId: checkin.pubId,
          date: checkin.timestamp.toDate().toISOString(),
          imageUrl,
          pubVisitNumber,
          badgeName: checkin.badgeName,
          missionUpdated: checkin.missionUpdated,
          isPlaceholder,
        };

        console.log(`[CheckInGallery] 📝 Final display data for check-in ${index + 1}:`, {
          ...result,
          imageType: isPlaceholder ? 'PLACEHOLDER' : 'REAL IMAGE',
        });
        
        return result;
      });

      // Sort by date, newest first
      console.log('[CheckInGallery] 📊 Sorting display data by date (newest first)');
      displayData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('[CheckInGallery] 📝 Final sorted display data:');
      displayData.forEach((item, index) => {
        console.log(`[CheckInGallery] 📸 Final Image ${index + 1}:`, {
          pubName: item.pubName,
          pubId: item.pubId,
          pubVisitNumber: item.pubVisitNumber,
          date: item.date,
          badgeName: item.badgeName,
          missionUpdated: item.missionUpdated,
        });
      });

      console.log('[CheckInGallery] ✅ Setting images signal with', displayData.length, 'items');

      // ✨ ENHANCED DEBUGGING: Final image count analysis with fallback logic
      const realImages = displayData.filter(item => !item.isPlaceholder);
      const placeholderImages = displayData.filter(item => item.isPlaceholder);
      
      console.log('[CheckInGallery] 🎯 === FINAL GALLERY STATE ANALYSIS (WITH FALLBACKS) ===');
      console.log(`[CheckInGallery] 🖼️  Total items to display: ${displayData.length}`);
      console.log(`[CheckInGallery] ✅ Real images: ${realImages.length}`);
      console.log(`[CheckInGallery] 📷 Placeholder images: ${placeholderImages.length}`);
      console.log(`[CheckInGallery] 💾 Total images stored locally: ${imageData.length}`);
      console.log(`[CheckInGallery] 📋 Total check-ins available: ${allCheckins.length}`);
      
      if (displayData.length > 0) {
        console.log('[CheckInGallery] ✅ SUCCESS: Gallery will show check-ins with fallback images');
        if (placeholderImages.length > 0) {
          console.log('[CheckInGallery] 💡 NEXT STEP: Investigate why storage has 0 images');
        }
      } else {
        console.log('[CheckInGallery] ❌ ERROR: No check-ins to display');
      }
      console.log('[CheckInGallery] 🎯 ================================================================');

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
