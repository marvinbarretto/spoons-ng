import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { DeviceCarpetStorageService } from '../../../carpets/data-access/device-carpet-storage.service';

type SimpleCarpet = {
  pubName: string;
  date: string;
  imageUrl: string;
};

@Component({
  selector: 'app-simple-carpet-widget',
  imports: [CommonModule],
  template: `
    <div>
      <h3>Carpet Collection ({{ carpets().length }})</h3>
      
      @if (loading()) {
        <p>Loading...</p>
      } @else if (error()) {
        <p>Error: {{ error() }}</p>
      } @else if (carpets().length === 0) {
        <p>No carpets yet</p>
      } @else {
        <div>
          @for (carpet of carpets(); track carpet.imageUrl) {
            <div style="margin: 10px; padding: 10px; border: 1px solid #ccc;">
              <img [src]="carpet.imageUrl" style="width: 100px; height: 100px; object-fit: cover;" />
              <p>{{ carpet.pubName }}</p>
              <p>{{ carpet.date }}</p>
            </div>
          }
        </div>
      }
      
      <button (click)="loadCarpets()">Refresh</button>
    </div>
  `
})
export class SimpleCarpetWidgetComponent implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly carpetStorage = inject(DeviceCarpetStorageService);

  protected readonly carpets = signal<SimpleCarpet[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    this.loadCarpets();
  }

  protected async loadCarpets() {
    console.log('🔄 [SimpleCarpetWidget] Loading carpets...');
    
    const user = this.authStore.user();
    if (!user) {
      console.log('❌ [SimpleCarpetWidget] No user found');
      this.carpets.set([]);
      return;
    }
    
    console.log('✅ [SimpleCarpetWidget] User found:', { uid: user.uid, isAnonymous: user.isAnonymous });

    this.loading.set(true);
    this.error.set(null);

    try {
      const carpetData = await this.carpetStorage.getUserCarpets();
      console.log('📊 [SimpleCarpetWidget] Got carpets:', carpetData.length);

      const simpleCarpets: SimpleCarpet[] = carpetData.map(carpet => ({
        pubName: carpet.pubName || 'Unknown Pub',
        date: carpet.date,
        imageUrl: URL.createObjectURL(carpet.blob)
      }));

      this.carpets.set(simpleCarpets);
    } catch (error) {
      console.error('❌ [SimpleCarpetWidget] Error:', error);
      this.error.set('Failed to load carpets');
    } finally {
      this.loading.set(false);
    }
  }
}