import { Component, inject } from '@angular/core';
import { PubStore } from '../../data-access/pub.store';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-pub-list',
  imports: [CommonModule],
  template: `
    <div *ngIf="store.loading$$()">Loading pubs...</div>
    <div *ngIf="store.error$$()">{{ store.error$$() }}</div>

    <ul>
      <li *ngFor="let pub of store.pubs$$()">
        {{ pub.name }} – {{ pub.location.city }}, {{ pub.location.country }}
      </li>
    </ul>
  `,
})
export class PubListComponent {
  store = inject(PubStore);

  constructor() {
    console.log('[PubListComponent] 🧱 Constructed');
    this.store.loadOnce();
  }
}
