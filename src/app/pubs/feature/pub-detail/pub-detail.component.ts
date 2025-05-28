// src/app/pubs/feature/pub-detail/pub-detail.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import type { Pub } from '../../utils/pub.models';
import { PubStore } from '../../data-access/pub.store';
import { PubsService } from '../../data-access/pubs.service';

@Component({
  selector: 'app-pub-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section *ngIf="loading; else content">
      <p>Loading pub...</p>
      <!-- TODO: Improve -->
    </section>

    <ng-template #content>
      @if (pub) {
        <article>
          <h1>{{ pub.name }}</h1>
          <p>{{ pub.location.city }}, {{ pub.location.country }}</p>
          <p>Lat: {{ pub.location.lat }}, Lng: {{ pub.location.lng }}</p>

          <a routerLink="/pubs">← Back to pubs</a>
        </article>
      } @else {
        <p>Pub not found.</p>
        <a routerLink="/pubs">← Back to pubs</a>
      }
    </ng-template>
  `,
})
export class PubDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pubsService = inject(PubsService);
  private pubStore = inject(PubStore);

  pub: Pub | null = null;
  loading = true;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return this.fail();

    // Prefer local store if already loaded
    const local = this.pubStore.pubs$$().find(p => p.id === id);
    if (local) {
      this.pub = local;
      this.loading = false;
      return;
    }

    try {
      const found = await this.pubsService.getPubById(id).toPromise();
      this.pub = found ?? null;
    } catch (err) {
      console.warn('[PubDetail] Failed to load pub:', err);
    } finally {
      this.loading = false;
    }
  }

  private fail() {
    this.router.navigate(['/pubs']);
  }
}
