import { inject, Injectable, signal } from '@angular/core';
import { PageService } from './page.service';
import { SsrPlatformService } from './../../shared/utils/ssr/ssr-platform.service';
import { Page } from '../utils/page.model';

@Injectable({
  providedIn: 'root',
})
export class PageStore {
  private readonly pageService = inject(PageService);
  private readonly platform = inject(SsrPlatformService);

  readonly page$$ = signal<Page | null>(null);
  readonly pages$$ = signal<Page[]>([]);

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

}
