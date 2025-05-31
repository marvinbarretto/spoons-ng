// src/app/pubs/feature/pub-detail/pub-detail.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import type { Pub } from '../../utils/pub.models';
import { PubStore } from '../../data-access/pub.store';
import { PubService } from '../../data-access/pub.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-pub-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pub-detail.component.html',
  styleUrl: './pub-detail.component.scss',
})
export class PubDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pubsService = inject(PubService);
  private pubStore = inject(PubStore);

  pub: Pub | null = null;
  loading = true;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return this.fail();

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

  get locationString(): string {
    if (!this.pub) return '';
    const { city, region, country } = this.pub;
    return [city, region, country].filter(Boolean).join(', ');
  }

  formatDate(timestamp?: Timestamp): string {
    return timestamp ? timestamp.toDate().toLocaleDateString() : '—';
  }

  formatTime(timestamp?: Timestamp): string {
    return timestamp ? timestamp.toDate().toLocaleTimeString() : '—';
  }

  private fail() {
    this.router.navigate(['/pubs']);
  }
}

