import { Component, inject } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { CarpetStorageService } from '../../../carpets/data-access/carpet-storage.service';
import { AuthStore } from '../../../auth/data-access/auth.store';

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
            <div class="carpet-item">
              <p><strong>Key:</strong> {{ carpet.key }}</p>
              <p><strong>Pub:</strong> {{ carpet.pubName }}</p>
              <p><strong>Date:</strong> {{ carpet.date | date:'short' }}</p>
              <p><strong>Size:</strong> {{ (carpet.size / 1024).toFixed(1) }}KB</p>
              <p><strong>Type:</strong> {{ carpet.type }}</p>
            </div>
          }
        </div>
      }

      @if (debugMessage) {
        <div class="debug-message">{{ debugMessage }}</div>
      }
    </div>
  `,
  styles: [`
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
  `]
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
      const carpets = await this.carpetStorage.getUserCarpets();
      
      this.carpetList = carpets.map(carpet => ({
        key: `${carpet.userId}_${carpet.pubId}_${carpet.dateKey}`,
        pubName: carpet.pubName,
        date: carpet.date,
        size: carpet.size,
        type: carpet.type
      }));
      
      this.debugMessage = `Found ${carpets.length} carpets in IndexedDB`;
      console.log('🔍 Carpet Debug - Found carpets:', carpets);
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