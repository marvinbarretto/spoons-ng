import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { PageService } from './page.service';
import { catchError, map, Observable, of } from 'rxjs';
import { Page } from '../utils/page.model';

@Injectable({
  providedIn: 'root',
})
export class PageResolverService implements Resolve<any> {
  constructor(private pageService: PageService, private router: Router) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<{ page: Page; fullPath: string } | null> {
    const slug = route.paramMap.get('slug');
    console.log(`PageResolver: Resolving page with slug ${slug}`);

    if (slug) {
      const slugParts = slug.split('/');
      const actualSlug = slugParts[slugParts.length - 1]; // Extract the last part of the slug

      console.log(`PageResolver: Actual slug is ${actualSlug}`);

      return this.pageService.getPageBySlug(actualSlug).pipe(
        map((page: Page | null) => {
          if (!page) {
            return null;
          }

          // If the page exists, construct the full path dynamically
          const fullPath = this.buildFullPath(page);

          console.log(
            `PageResolver: Page found with slug ${actualSlug} and full path ${fullPath}`
          );

          // If the full path already matches the current state URL, do nothing
          if (fullPath === state.url) {
            console.log(
              'PageResolver: Full path already matches current URL, no redirect needed.'
            );
            return { page, fullPath };
          }

          // If the full path doesn't match the current URL, redirect to the correct path
          console.log(`PageResolver: Redirecting to full path: ${fullPath}`);
          this.router.navigate([fullPath], { replaceUrl: true });

          // Return null since we're navigating to the correct path
          return null;
        }),
        catchError((error) => {
          console.error('Error fetching page:', error);
          return of(null); // Return null in case of an error
        })
      );
    }

    // If slug is null or undefined, return an observable of null
    return of(null);
  }

  private buildFullPath(page: Page): string {
    console.log('Building path for:', page.slug);
    let path = page.slug;
    while (page.parentPage) {
      console.log('Parent page found:', page.parentPage.slug);
      path = `${page.parentPage.slug}/${path}`;
      page = page.parentPage;
    }
    console.log('Full path built:', path);
    return `/${path}`; // Returns the correct full path, ensuring the leading slash
  }
}
