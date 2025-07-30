import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { CarpetStorageService } from '../../../carpets/data-access/carpet-storage.service';

@Component({
  selector: 'app-carpet-debug',
  imports: [CommonModule],
  template: `
    <div class="carpet-debug">
      <h3>🔍 Carpet Storage Debug</h3>

      <div class="debug-info">
        <p><strong>User ID:</strong> {{ userId() || 'Not authenticated' }}</p>
        <p><strong>Carpet Count:</strong> {{ carpetCount() }}</p>
        <p><strong>Total Size:</strong> {{ totalSizeMB() }}MB</p>
      </div>

      <div class="debug-actions">
        <button (click)="listCarpets()" class="debug-btn">List All Carpets</button>
        <button (click)="testSaveCarpet()" class="debug-btn">Test Save Carpet</button>
        <button (click)="clearAllCarpets()" class="debug-btn danger">Clear All Carpets</button>
      </div>

      @if (carpetList.length > 0) {
        <div class="carpet-list">
          <h4>Stored Carpets:</h4>
          @for (carpet of carpetList; track carpet.key) {
            <div
              class="carpet-item"
              [style.background-color]="
                carpet.isCurrentUser ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)'
              "
            >
              <p><strong>Key:</strong> {{ carpet.key }}</p>
              <p><strong>Pub:</strong> {{ carpet.pubName }}</p>
              <p><strong>Date:</strong> {{ carpet.date | date: 'short' }}</p>
              <p><strong>Size:</strong> {{ (carpet.size / 1024).toFixed(1) }}KB</p>
              <p><strong>Type:</strong> {{ carpet.type }}</p>
              <p><strong>User ID:</strong> {{ carpet.userId }}</p>
              <p>
                <strong>Is Current User:</strong> {{ carpet.isCurrentUser ? '✅ YES' : '❌ NO' }}
              </p>
            </div>
          }
        </div>
      }

      @if (debugMessage) {
        <div class="debug-message">{{ debugMessage }}</div>
      }
    </div>
  `,
  styles: [
    `
      .carpet-debug {
        padding: 1rem;
        border: 2px solid #00ff00;
        margin: 1rem;
        background: rgba(0, 255, 0, 0.1);
      }

      .debug-actions {
        margin: 1rem 0;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .debug-btn {
        padding: 0.5rem 1rem;
        background: #007bff;
        color: white;
        border: none;
        cursor: pointer;
        border-radius: 4px;
      }

      .debug-btn.danger {
        background: #dc3545;
      }

      .carpet-item {
        border: 1px solid #ccc;
        padding: 0.5rem;
        margin: 0.5rem 0;
        background: rgba(255, 255, 255, 0.5);
      }

      .debug-message {
        padding: 0.5rem;
        background: rgba(255, 255, 0, 0.3);
        margin: 0.5rem 0;
      }

      .debug-info p {
        margin: 0.25rem 0;
      }
    `,
  ],
})
export class CarpetDebugComponent {
  private readonly carpetStorage = inject(CarpetStorageService);
  private readonly authStore = inject(AuthStore);

  readonly userId = this.authStore.uid;
  readonly carpetCount = this.carpetStorage.carpetCount;
  readonly totalSize = this.carpetStorage.totalSize;

  carpetList: any[] = [];
  debugMessage = '';

  totalSizeMB() {
    return (this.totalSize() / 1024 / 1024).toFixed(2);
  }

  async listCarpets() {
    try {
      this.debugMessage = 'Loading carpets...';
      await this.carpetStorage.initialize();

      // Get ALL carpets to debug user ID issues
      const allCarpets = await this.carpetStorage.getAllCarpets();
      const userCarpets = await this.carpetStorage.getUserCarpets();

      this.carpetList = allCarpets.map(carpet => ({
        key: `${carpet.userId}_${carpet.pubId}_${carpet.dateKey}`,
        pubName: carpet.pubName,
        date: carpet.date,
        size: carpet.size,
        type: carpet.type,
        userId: carpet.userId, // Show user ID for debugging
        isCurrentUser: carpet.userId === this.userId(),
      }));

      // Group carpets by pub for better overview
      const pubGroups = userCarpets.reduce(
        (acc, carpet) => {
          const pubId = carpet.pubId;
          if (!acc[pubId]) {
            acc[pubId] = { pubName: carpet.pubName, count: 0, totalSize: 0 };
          }
          acc[pubId].count++;
          acc[pubId].totalSize += carpet.size;
          return acc;
        },
        {} as Record<string, { pubName: string; count: number; totalSize: number }>
      );

      const pubSummary = Object.entries(pubGroups)
        .map(
          ([pubId, data]) =>
            `${data.pubName}: ${data.count} carpets (${(data.totalSize / 1024).toFixed(1)}KB)`
        )
        .join(', ');

      this.debugMessage = `Found ${allCarpets.length} total carpets (${userCarpets.length} for current user from ${Object.keys(pubGroups).length} pubs). ${pubSummary}`;
      console.log('🔍 Carpet Debug - All carpets:', allCarpets);
      console.log('🔍 Carpet Debug - Current user ID:', this.userId());
      console.log('🔍 Carpet Debug - User carpet filter result:', userCarpets);
      console.log('🔍 Carpet Debug - Pub summary:', pubGroups);
    } catch (error) {
      this.debugMessage = `Error loading carpets: ${error}`;
      console.error('🔍 Carpet Debug - Error:', error);
    }
  }

  async testSaveCarpet() {
    try {
      this.debugMessage = 'Creating test carpet...';

      // Create a simple test canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.fillText('TEST', 20, 60);

      const testPubId = 'test-pub-' + Date.now();
      const testPubName = 'Test Pub';

      const key = await this.carpetStorage.saveCarpetImage(canvas, testPubId, testPubName);
      this.debugMessage = `Test carpet saved with key: ${key}`;

      // Refresh the list
      await this.listCarpets();
    } catch (error) {
      this.debugMessage = `Error saving test carpet: ${error}`;
      console.error('🔍 Carpet Debug - Save error:', error);
    }
  }

  async clearAllCarpets() {
    if (confirm('Are you sure you want to clear all carpets?')) {
      try {
        await this.carpetStorage.clearUserCarpets();
        this.debugMessage = 'All carpets cleared';
        this.carpetList = [];
      } catch (error) {
        this.debugMessage = `Error clearing carpets: ${error}`;
      }
    }
  }
}
