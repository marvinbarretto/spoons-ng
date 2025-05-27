// pub.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { PubsService } from './pubs.service';
import type { Pub } from '../utils/pub.models';
import pubs from '../utils/pubs.json';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';

@Injectable({ providedIn: 'root' })
export class PubStore {
  readonly pubs$$ = signal<Pub[]>([]);
  readonly loading$$ = signal(false);
  readonly error$$ = signal<string | null>(null);

  private loaded = false;
  readonly pubService = inject(PubsService);
  readonly platform = inject(SsrPlatformService);

  constructor() {
    console.log('[PubStore] Bootstrapping');

    // Always use mock response in both SSR and browser
    this.pubs$$.set(pubs); // ← this is your local JSON import
    this.loaded = true;

    // Optional: log clearly that we're skipping Firestore
    console.log('[PubStore] 🚫 Skipping Firestore; using local pubs.json');
  }

  loadOnce() {
    // no-op while using mock data
  }

  loadPubs() {
    // no-op while using mock data
  }
}

