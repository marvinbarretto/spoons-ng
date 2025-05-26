import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PageStore } from '../../data-access/page.store';

@Component({
  selector: 'app-site-map',
  imports: [CommonModule, RouterModule],
  templateUrl: './site-map.component.html',
  styleUrl: './site-map.component.scss',
})
export class SiteMapComponent implements OnInit {
  constructor(public pageStore: PageStore) {}

  ngOnInit() {
    this.pageStore.loadPages();
  }
}
