// pub.store.ts
import { Injectable, inject, signal } from '@angular/core';
import { PubsService } from './pubs.service';
import type { Pub } from '../utils/pub.models';

@Injectable({ providedIn: 'root' })
export class PubStore {
  readonly pubs$$ = signal<Pub[]>([]);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);

  private loaded = false;
  // this feels flat, not dynamic?

  readonly pubService = inject(PubsService);

  constructor() {
    console.log('[PubStore] Bootstrapping');
  }

  loadOnce() {
    if (this.loaded) return;
    this.loadPubs();
  }

  loadPubs() {
    console.log('[PubStore] 📡 Loading pubs...');
    this.loading$$.set(true);
    this.error$$.set(null);

    this.pubService.loadPubs().subscribe({
      next: (data) => {
        console.log('[PubStore] ✅ Pubs loaded from Firestore:', data);
        this.pubs$$.set(data);
        this.loaded = true;
      },
      error: (err) => {
        console.error('[PubStore] ❌ Failed to load pubs:', err);
        this.error$$.set(String(err));
      },
      complete: () => {
        this.loading$$.set(false);
      },
    });
  }
}
