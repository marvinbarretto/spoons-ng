import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Pub } from '../../utils/pub.models';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-pub-card',
  imports: [CommonModule, RouterModule],
  template: `
    <a [routerLink]="['/pubs', pub.id]" class="pub-card">
      <h2>{{ pub.name }}</h2>
      <p>{{ pub.city }}</p>
    </a>
  `,
  styles: [`
    .pub-card {
      display: block;
      padding: 1rem;
      border-bottom: 1px solid #ddd;
      text-decoration: none;
      color: inherit;
    }
    .pub-card:hover {
      background: #f9f9f9;
    }
  `],
})
export class PubCardComponent {
  @Input({ required: true }) pub!: Pub;
}
