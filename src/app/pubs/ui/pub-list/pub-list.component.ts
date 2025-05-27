import { Component, inject } from '@angular/core';
import { PubStore } from '../../data-access/pub.store';
import { CommonModule } from '@angular/common';
import { SsrPlatformService } from '../../../shared/utils/ssr/ssr-platform.service';


@Component({
  selector: 'app-pub-list',
  imports: [CommonModule],
  template: `
    <h2>📦 Full Pub List Debug</h2>

    <div *ngIf="store.loading$$()">⏳ Loading pubs...</div>
    <div *ngIf="store.error$$()">❌ {{ store.error$$() }}</div>

    <p *ngIf="store.pubs$$().length === 51">🧪 SSR fallback pubs loaded (51 pubs)</p>
    <p *ngIf="store.pubs$$().length && store.pubs$$().length !== 51">📡 Live pubs loaded ({{ store.pubs$$().length }})</p>
    <p *ngIf="!store.pubs$$().length && !store.loading$$()">⚠️ No pubs found.</p>

    <ul>
      @for (pub of store.pubs$$(); track pub.id) {
        <li>
          🏷 {{ pub.name }}<br />
          🌍 {{ pub.location.city }}, {{ pub.location.country }}
        </li>
      }
    </ul>
  `,
})
export class PubListComponent {
  store = inject(PubStore);
  platform = inject(SsrPlatformService);

  constructor() {
    console.log('[PubListComponent] 🧱 Constructed');

    this.platform.onlyOnBrowser(() => {
      this.store.loadOnce();
    });
  }
}
