import { Injectable } from '@angular/core';
import { DirectStrapiService } from './strapi.service';
import { forkJoin, map, Observable } from 'rxjs';
import { Page } from '../../pages/utils/page.model';
import { IEvent } from '../../events/utils/event.model';

@Injectable({
  providedIn: 'root',
})
export class SearchService extends DirectStrapiService {
  // TODO: REplace any with the correct type
  // NOTE: Using observables instead of signals because involves API calls and async operations

  /**
   * Helper method to perform a filtered search for a single collection
   * @param collection The collection to search
   * @param query The search query string
   */
  private getSearchResults(collection: string, query: string): Observable<any> {
    return this.get<any>(`${collection}?_q=${query}`);
  }

  /**
   * Perform a scoped search on a specific collection
   * @param scope The collection type (e.g., events, news, research)
   * @param query The search query string
   */
  scopedSearch(scope: 'events' | 'pages', query: string): Observable<any> {
    return this.getSearchResults(scope, query).pipe(
      map((results) => results.data) // Extract Strapi's `data` field
    );
  }

  /**
   * Perform a sitewide search across multiple collections (events, news, research)
   * @param query The search query string
   */
  sitewideSearch(
    query: string,
    pageSize: number = 5
  ): Observable<{ events: Partial<IEvent>[]; pages: Page[] }> {
    const endpoint = `custom-search?query=${encodeURIComponent(
      query
    )}&pageSize=${pageSize}`;
    return this.get<{ events: Partial<IEvent>[]; pages: Page[] }>(endpoint);
  }
}
