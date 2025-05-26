import { computed, inject, Injectable, signal } from '@angular/core';
import { of } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { Page, PrimaryNavLink } from '../utils/page.model';
import { PageService } from './page.service';
import { SsrPlatformService } from './../../shared/utils/ssr/ssr-platform.service';

@Injectable({
  providedIn: 'root',
})
export class PageStore {
  private readonly pageService = inject(PageService);
  private readonly platform = inject(SsrPlatformService);

  readonly page$$ = signal<Page | null>(null);
  readonly pages$$ = signal<Page[]>([]);
  readonly primaryNavLinks$$ = signal<PrimaryNavLink[]>([]);

  readonly loading$$ = signal<boolean>(false);
  readonly error$$ = signal<string | null>(null);
  readonly ready$$ = signal<boolean>(false);

  constructor() {
    this.debugLog('📦 PageStore constructed');
  }

  private debugLog(message: string, ...args: any[]) {
    this.platform.onlyOnBrowser(() => {
      console.log(`%c${message}`, 'color: #00F;', ...args);
    });
  }

  loadPrimaryNavLinks(): void {
    if (this.primaryNavLinks$$().length > 0) {
      this.debugLog('🔁 Nav links already loaded:', this.primaryNavLinks$$());
      return;
    }

    this.debugLog('📡 Fetching primary nav links...');
    this.loading$$.set(true);

    this.pageService
      .getPrimaryNavPageLinks()
      .pipe(
        tap((links) => {
          this.primaryNavLinks$$.set(links);
          this.debugLog('✅ Nav links loaded:', links);
        }),
        catchError((error) => {
          const msg = `❌ Failed to load nav links (${error.status} ${error.statusText})`;
          this.debugLog(msg, error);
          this.error$$.set(msg);
          return of([]);
        }),
        finalize(() => this.loading$$.set(false))
      )
      .subscribe();
  }

  loadPages(): void {
    if (this.pages$$().length > 0) {
      this.debugLog('🔁 Pages already loaded');
      return;
    }

    this.loading$$.set(true);
    this.error$$.set(null);

    this.pageService
      .getPages()
      .pipe(
        tap((pages) => {
          this.pages$$.set(pages);
          this.ready$$.set(true);
          this.debugLog('✅ Pages loaded:', pages);
        }),
        catchError((error) => {
          const msg = `❌ Failed to load pages (${error.status} ${error.statusText})`;
          this.error$$.set(msg);
          this.debugLog(msg, error);
          return of([]);
        }),
        finalize(() => this.loading$$.set(false))
      )
      .subscribe();
  }

  loadPage(slug: string): void {
    this.loading$$.set(true);
    this.error$$.set(null);

    this.pageService
      .getPageBySlug(slug)
      .pipe(
        tap((page) => {
          this.page$$.set(page);
          this.debugLog('✅ Page loaded:', page);
        }),
        catchError((error) => {
          const msg = `❌ Failed to load page (${error.status} - ${error.statusText})`;
          this.error$$.set(msg);
          this.debugLog(msg, error);
          return of(null);
        }),
        finalize(() => this.loading$$.set(false))
      )
      .subscribe();
  }

  // --------- Derived Getters ----------

  getPageBySlug(slug: string) {
    return computed(() => this.pages$$().find((p) => p.slug === slug));
  }

  getPrimaryNavPages(): Page[] {
    return this.pages$$().filter((page) => page.primaryNavigation === true);
  }

  getRootPages(): Page[] {
    return this.pages$$().filter((page) => !page.parentPage);
  }

  getChildPages(parentId: number): Page[] {
    return this.pages$$().filter((page) => page.parentPage?.id === parentId);
  }

  hasChildren(pageId: number): boolean {
    return this.getChildPages(pageId).length > 0;
  }
}
