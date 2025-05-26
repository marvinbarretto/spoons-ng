import { CommonModule, JsonPipe } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface SearchResult {
  type: string; // E.g., 'Event', 'Page'
  title: string; // Highlighted title
  content?: Array<{ type: string; text: string }>; // Optional array for structured content
}

@Component({
  selector: 'app-search-results',
  imports: [CommonModule],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent {
  private sanitizer = inject(DomSanitizer);
  @Input() results: SearchResult[] = [];

  // Correctly sanitize HTML for safe rendering
  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
