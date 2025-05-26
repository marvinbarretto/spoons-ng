import { inject, Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { EventModel } from '../utils/event.model';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  protected http = inject(HttpClient);

  async getEventBySlug(slug: string): Promise<EventModel | null> {
    if (slug.includes('.')) return null; // optional guard, prob remove

    try {
      const res = await firstValueFrom(
        this.http.get<{ event: EventModel }>(`/api/events/${slug}`)
      );
      return res?.event ?? null;
    } catch (error) {
      console.error('[EventService] Failed to fetch event:', error);
      return null;
    }
  }

  getEvents(): Observable<EventModel[]> {
    return this.http.get<{ events: EventModel[] }>('/api/events').pipe(
      map((res) => {
        if (!res || !Array.isArray(res.events)) {
          throw new Error('[EventService] Invalid /api/events response');
        }
        return res.events;
      }),
      catchError((error) => {
        console.error('[EventService] Failed to fetch events:', error);
        return of([]); // fallback to empty array
      })
    );
  }
}
