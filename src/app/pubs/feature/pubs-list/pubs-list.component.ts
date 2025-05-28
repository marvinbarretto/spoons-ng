import { Component, inject, OnInit } from '@angular/core';
import { PubStore } from '../../data-access/pub.store';
import { CommonModule } from '@angular/common';
import { PubCardComponent } from '../../ui/pub-card/pub-card.component';

@Component({
  selector: 'app-pub-list',
  imports: [CommonModule, PubCardComponent],
  template: `
    <section>
      <h1>Pubs</h1>

      @if (pubStore.loading$$()) {
        <p>Loading pubs...</p>
      } @else {
        <ul>
          <li *ngFor="let pub of pubStore.pubs$$()">
            <app-pub-card [pub]="pub" />
          </li>
        </ul>
      }
    </section>
  `,
})
export class PubListComponent implements OnInit {
  pubStore = inject(PubStore);

  ngOnInit() {
    this.pubStore.loadOnce();
  }
}
