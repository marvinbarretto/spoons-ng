import { Injectable } from '@angular/core';
import { DirectStrapiService } from '../../shared/data-access/strapi.service';
import { Page, PageResponse, PrimaryNavLink } from '../utils/page.model';
import { catchError, map, tap, Observable, of } from 'rxjs';
import { StrapiPageResponse } from '../../shared/utils/strapi.types';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PageService extends DirectStrapiService {
  // https://docs.strapi.io/dev-docs/api/rest/filters-locale-publication#filtering
  getPageBySlug(slug: string): Observable<Page | null> {
    return this.get<PageResponse>(
      `pages?filters[slug][$eq]=${slug}&populate=parentPage`
    ).pipe(
      tap((response) => {
        console.log('API Response for slug:', slug, response);
      }),
      map((response) => {
        // Check if we have at least one page in the response
        return response.data.length > 0 ? response.data[0] : null;
      }),
      catchError((error) => {
        console.error('Error fetching page by slug:', error);
        return of(null); // Return null if there's an error
      })
    );
  }

  getPages(): Observable<Page[]> {
    return this.get<PageResponse>('pages?populate[parentPage]=*').pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  getPrimaryNavPageLinks(): Observable<PrimaryNavLink[]> {


    return this.http.get<any>('api/getPrimaryNavLinks').pipe(
      map((res) => res.navigation)
    );


    // const params = new HttpParams()
    //   .set('filters[primaryNavigation][$eq]', 'true')
    //   .set('fields[0]', 'title')
    //   .set('fields[1]', 'slug');

    // return this.get<StrapiPageResponse>('pages', { params }).pipe(
    //   tap((res) => {
    //     console.log('[Strapi] Got response with', res.data.length, 'items');
    //     console.log('[Strapi] Sample item:', res.data[0]);
    //   }),
    //   map((res) =>
    //     res.data.map((item) => ({
    //       id: item.id,
    //       documentId: item.id.toString(),
    //       title: item.title,
    //       slug: item.slug,
    //     }))
    //   )
    // );
  }
}

// NOTE: Use this syntax later for specific queries
// getSiteMap() {
//   return this.get<PageResponse>(
//     `pages?fields[0]=id&fields[1]=title&fields[2]=slug
//     &populate[parentPage][fields][0]=id
//     &populate[parentPage][fields][1]=title
//     &populate[parentPage][fields][2]=slug`
//   );
// }
