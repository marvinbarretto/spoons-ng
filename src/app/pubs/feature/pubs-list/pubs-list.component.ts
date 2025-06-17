// src/app/pubs/feature/pubs-list/pubs-list.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { PubStore } from '../../data-access/pub.store';
import { CommonModule } from '@angular/common';
import { PubCardComponent } from '../../ui/pub-card/pub-card.component';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';

@Component({
  selector: 'app-pub-list',
  imports: [CommonModule, PubCardComponent],
  template: `
    <section>
      <h1>Pubs</h1>

      @if (pubStore.loading()) {
        <p>Loading pubs...</p>
      } @else if (pubStore.error()) {
        <div class="error">{{ pubStore.error() }}</div>
      } @else {
        <ul>
          @for (pub of pubStore.pubsWithDistance(); track pub.id) {
            <li>
              <app-pub-card
                [pub]="pub"
                [hasCheckedIn]="checkinStore.hasCheckedIn(pub.id)"
              />
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class PubListComponent extends BaseComponent implements OnInit {
  protected readonly pubStore = inject(PubStore);
  protected readonly checkinStore = inject(CheckinStore);

  protected override onInit(): void {
    this.pubStore.loadOnce();
    this.checkinStore.loadOnce(); // ✅ Load check-ins too
  }
}
