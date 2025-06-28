import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { CarpetStorageService } from '../../../carpets/data-access/carpet-storage.service';

// Import the proper type from carpet storage service
type CarpetImageData = {
  userId: string;
  pubId: string;
  pubName: string;
  date: string;
  dateKey: string;
  blob: Blob;
  size: number;
  type: string;
  width: number;
  height: number;
};

type CarpetDisplayData = {
  key: string;
  pubId: string;
  pubName: string;
  date: string;
  imageUrl: string;
};

@Component({
  selector: 'app-carpet-collection-widget',
  imports: [CommonModule],
  template: `
    <div class="carpet-collection-widget">
      <div class="header">
        <h3>Your Carpet Collection</h3>
        <span class="count">{{ carpets().length }} carpets</span>
      </div>

      @if (loading()) {
        <div class="loading">Loading carpets...</div>
      } @else if (error()) {
        <div class="error">Error: {{ error() }}</div>
      } @else if (carpets().length === 0) {
        <div class="empty">No carpets collected yet</div>
      } @else {
        <div class="carpet-grid">
          @for (carpet of carpets(); track carpet.key) {
            <div class="carpet-item">
              <img [src]="carpet.imageUrl" [alt]="carpet.pubName" />
              <div class="carpet-info">
                <div class="pub-name">{{ carpet.pubName }}</div>
                <div class="date">{{ carpet.date | date:'dd MMM' }}</div>
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
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      margin-bottom: 1rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .header h3 {
      margin: 0;
      color: white;
      font-size: 1.1rem;
    }

    .count {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
    }

    .carpet-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .carpet-item {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      overflow: hidden;
    }

    .carpet-item img {
      width: 100%;
      height: 120px;
      object-fit: cover;
    }

    .carpet-info {
      padding: 0.5rem;
    }

    .pub-name {
      color: white;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .date {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.75rem;
    }

    .loading, .error, .empty {
      text-align: center;
      padding: 2rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .error {
      color: #ff6b6b;
    }
  `]
})
export class CarpetCollectionWidgetComponent {
  private readonly authStore = inject(AuthStore);
  private readonly carpetStorageService = inject(CarpetStorageService);

  // State signals
  protected readonly carpets = signal<CarpetDisplayData[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Track last loaded user to detect changes
  private lastLoadedUserId: string | undefined | null = null;

  constructor() {
    console.log('🏡 [CarpetCollectionWidget] Constructor - setting up auth effect...');

    effect(() => {
      const user = this.authStore.user();
      const userId = user?.uid;
      const isAnonymous = user?.isAnonymous;

      console.log('🔄 [CarpetCollectionWidget] Auth effect triggered:', {
        hasUser: !!user,
        userId: userId?.slice(0, 8),
        isAnonymous,
        previousUserId: this.lastLoadedUserId?.slice(0, 8) || 'null',
        userChanged: this.lastLoadedUserId !== userId,
        timestamp: new Date().toISOString()
      });

      // Clear carpets when no user or user changes
      if (!user || user.isAnonymous) {
        console.log('❌ [CarpetCollectionWidget] No user/anonymous user - clearing carpets');
        this.clearCarpets();
        return;
      }

      // Handle user change (including logout -> new user)
      if (userId !== this.lastLoadedUserId) {
        console.log('🔄 [CarpetCollectionWidget] User changed, reloading carpets:', {
          from: this.lastLoadedUserId?.slice(0, 8) || 'null',
          to: userId?.slice(0, 8) || 'null'
        });

        this.lastLoadedUserId = userId || null;
        if (userId) {
          this.loadCarpetsForUser(userId);
        }
      } else {
        console.log('⏭️ [CarpetCollectionWidget] Same user, no reload needed');
      }
    });
  }

  private clearCarpets(): void {
    console.log('🧹 [CarpetCollectionWidget] Clearing carpet data');

    // Revoke existing object URLs to prevent memory leaks
    this.carpets().forEach((carpet: CarpetDisplayData) => {
      if (carpet.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(carpet.imageUrl);
        console.log('🗑️ [CarpetCollectionWidget] Revoked object URL for:', carpet.key);
      }
    });

    this.carpets.set([]);
    this.error.set(null);
    // Don't reset lastLoadedUserId here - let the effect handle it

    console.log('✅ [CarpetCollectionWidget] Carpet data cleared');
  }

  private async loadCarpetsForUser(userId: string): Promise<void> {
    console.log('📡 [CarpetCollectionWidget] Loading carpets for user:', userId?.slice(0, 8));

    this.loading.set(true);
    this.error.set(null);

    try {
      // Get carpet data for current user
      const carpetData: CarpetImageData[] = await this.carpetStorageService.getUserCarpets();

      console.log('📊 [CarpetCollectionWidget] Carpet data received:', {
        userId: userId?.slice(0, 8),
        carpetCount: carpetData.length,
        carpetKeys: carpetData.map((c: CarpetImageData) => `${c.pubId}_${c.dateKey}`),
        timestamp: new Date().toISOString()
      });

      // Convert to display format
      const displayData: CarpetDisplayData[] = await Promise.all(
        carpetData.map(async (carpet: CarpetImageData) => {
          // Create object URL for the blob
          const imageUrl = URL.createObjectURL(carpet.blob);

          console.log('🖼️ [CarpetCollectionWidget] Processing carpet:', {
            pubId: carpet.pubId,
            pubName: carpet.pubName,
            date: carpet.date,
            blobSize: carpet.blob.size,
            imageUrl: imageUrl.slice(0, 50) + '...'
          });

          return {
            key: `${carpet.pubId}_${carpet.dateKey}`,
            pubId: carpet.pubId,
            pubName: carpet.pubName || 'Unknown Pub',
            date: carpet.date,
            imageUrl
          };
        })
      );

      // Sort by date, newest first
      displayData.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      this.carpets.set(displayData);

      console.log('✅ [CarpetCollectionWidget] Carpets loaded successfully:', {
        userId: userId?.slice(0, 8),
        totalCarpets: displayData.length,
        sortedByDate: displayData.map(c => ({ key: c.key, date: c.date })),
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('❌ [CarpetCollectionWidget] Error loading carpets:', {
        userId: userId?.slice(0, 8),
        error: error,
        timestamp: new Date().toISOString()
      });

      this.error.set(error instanceof Error ? error.message : 'Failed to load carpets');
    } finally {
      this.loading.set(false);
      console.log('🏁 [CarpetCollectionWidget] Loading finished for user:', userId?.slice(0, 8));
    }
  }
}
