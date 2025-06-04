// src/app/pubs/feature/pub-detail/pub-detail.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import type { Pub } from '../../utils/pub.models';
import { PubStore } from '../../data-access/pub.store';
import { PubService } from '../../data-access/pub.service';
import { BaseComponent } from '../../../shared/data-access/base.component';
import { formatDate, formatTime, formatTimestamp } from '../../../shared/utils/timestamp.utils';

@Component({
  selector: 'app-pub-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './pub-detail.component.html',
  styleUrl: './pub-detail.component.scss',
})
export class PubDetailComponent extends BaseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pubsService = inject(PubService);

  protected readonly pubStore = inject(PubStore);

  readonly pub = signal<Pub | null>(null);

  protected override onInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pubs']);
      return;
    }

    this.loadPub(id);
  }

  private async loadPub(id: string): Promise<void> {
    const local = this.pubStore.pubs().find(p => p.id === id);
    if (local) {
      this.pub.set(local);
      return;
    }

    await this.handleAsync(
      async () => {
        const found = await this.pubsService.getPubById(id).toPromise();
        this.pub.set(found ?? null);
        return found;
      },
      { errorMessage: 'Failed to load pub details' }
    );
  }

  get locationString(): string {
    const pubValue = this.pub();
    if (!pubValue) return '';
    const { city, region, country } = pubValue;
    return [city, region, country].filter(Boolean).join(', ');
  }

  // Safe timestamp formatting methods
  formatDate(timestamp: unknown): string {
    return formatDate(timestamp);
  }

  formatTime(timestamp: unknown): string {
    return formatTime(timestamp);
  }

  formatTimestamp(timestamp: unknown): string {
    return formatTimestamp(timestamp);
  }
}
