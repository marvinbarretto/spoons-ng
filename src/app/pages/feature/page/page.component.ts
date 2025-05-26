import { Component, OnDestroy, OnInit, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageStore } from '../../data-access/page.store';
import { CommonModule, JsonPipe } from '@angular/common';

import { Page } from '../../utils/page.model';
import { PageTitleService } from '../../../shared/data-access/page-title.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-page',
  imports: [CommonModule],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class PageComponent implements OnInit, OnDestroy {
  private pageSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    public pageStore: PageStore,
    private titleService: PageTitleService
  ) {
    effect(() => {
      const pageData = this.pageStore.page$$();
      if (pageData && pageData.title) {
        this.titleService.setTitle(pageData.title);
      }
    });
  }

  ngOnInit() {
    this.pageSubscription = this.route.data.subscribe((data) => {
      const resolvedPage = data['page'] as {
        page: Page;
        fullPath: string;
      } | null;
      if (resolvedPage && resolvedPage.page) {
        this.pageStore.page$$.set(resolvedPage.page);
      }
    });
  }

  ngOnDestroy() {
    if (this.pageSubscription) {
      this.pageSubscription.unsubscribe();
    }
  }
}
