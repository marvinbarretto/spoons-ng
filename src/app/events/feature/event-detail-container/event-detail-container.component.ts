import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { EventStore } from '../../data-access/event.store';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EventDetailComponent } from '../../ui/event-detail/event-detail.component';
import { Title, Meta } from '@angular/platform-browser';
import { resolveAssetUrl } from '../../../shared/utils/assets.utils';

@Component({
  selector: 'app-event-detail-container',
  standalone: true,
  imports: [CommonModule, EventDetailComponent, RouterModule],
  template: `
    <ng-container *ngIf="eventStore.event$() as event; else fallback">
      <app-event-detail [event]="event" />
    </ng-container>

    <ng-template #fallback>
      <section class="event-fallback">
        <p *ngIf="eventStore.loading$()">Loading event...</p>
        <p *ngIf="eventStore.error$()">{{ eventStore.error$() }}</p>

        <div
          *ngIf="!eventStore.loading$() && !eventStore.error$()"
          class="event-not-found"
        >
          <h2>Event not found</h2>
          <p>
            The event you're looking for doesn’t exist or may have been removed.
          </p>
          <a routerLink="/events/upcoming" class="btn">View upcoming events</a>
        </div>
      </section>
    </ng-template>

    <script type="application/ld+json">
      {{
        {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": event.title,
          "startDate": event.date,
          "eventStatus": "https://schema.org/EventScheduled",
          "location": {
            "@type": "Place",
            "name": event.location
          },
          "image": [event.hero?.url],
          "description": event.seo?.metaDescription || ''
        } | json }}
    </script>
  `,
  styles: `
      .event-fallback {
        text-align: center;
        padding: 2rem;
      }
      
      .event-not-found {
        background-color: rgba(white, .5);
        max-width: 600px;
        padding: 1rem;
        margin: 0 auto;
      }
      
      .btn {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background-color: rgba(black, .7);
        color: white;
        text-decoration: none;
      }
      
      .btn:hover {
        background-color: black;
      }
    `,
})
export class EventDetailContainerComponent implements OnInit {
  readonly eventStore = inject(EventStore);
  readonly route = inject(ActivatedRoute);
  readonly titleService = inject(Title);
  readonly meta = inject(Meta);
  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    console.log('[EventDetailContainer] Slug from route:', slug);

    if (slug) {
      this.eventStore.load(slug).then(() => {
        console.log('[EventDetailContainer] Event:', this.eventStore.event$());

        const event = this.eventStore.event$();
        if (!event) return;

        // TODO: Move this out to a shared seo

        this.titleService.setTitle(event.title);
        this.meta.updateTag({
          name: 'description',
          content: event.seo?.metaDescription || '',
        });
        this.meta.updateTag({
          name: 'keywords',
          content: event.seo?.keywords || '',
        });

        this.meta.updateTag({ property: 'og:title', content: event.title });
        this.meta.updateTag({
          property: 'og:description',
          content: event.seo?.metaDescription || '',
        });
        this.meta.updateTag({
          property: 'og:image',
          content:
            resolveAssetUrl(
              event.hero?.formats?.large?.url || event.hero?.url
            ) || '',
        });
        this.meta.updateTag({ property: 'og:type', content: 'article' });
      });
    }
  }
}
