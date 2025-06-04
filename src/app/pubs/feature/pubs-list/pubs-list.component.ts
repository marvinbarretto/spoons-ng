// src/app/pubs/feature/pubs-list/pubs-list.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { PubStore } from '../../data-access/pub.store';
import { CommonModule } from '@angular/common';
import { PubCardComponent } from '../../ui/pub-card/pub-card.component';
import { BaseComponent } from '../../../shared/data-access/base.component';

@Component({
  selector: 'app-pub-list',
  imports: [CommonModule, PubCardComponent],
  template: `
    <section>
      <h1>Pubs</h1>

      @if (pubStore.loading()) {
        <p>Loading pubs...</p>
      } @else {
        <ul>
          <li *ngFor="let pub of pubStore.sortedPubsByDistance()">
            <app-pub-card
              [pub]="pub"
              [distanceInKm]="pubStore.getDistanceForPub(pub)"
              [hasCheckedIn]="pubStore.hasCheckedIn(pub.id)"
            />
          </li>
        </ul>
      }
    </section>
  `,
})
export class PubListComponent extends BaseComponent implements OnInit {
  protected readonly pubStore = inject(PubStore);

  protected override onInit(): void {
    this.pubStore.loadOnce();
  }
}
