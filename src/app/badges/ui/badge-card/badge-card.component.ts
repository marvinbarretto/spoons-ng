import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Badge } from '../../utils/badge.model';

@Component({
  selector: 'app-badge-card',
  template: `
    @if (badge()) {
      <div class="badge-card">
        <img [src]="badge().icon" [alt]="badge().name">
        <h2>{{ badge().name }}</h2>
        <p>{{ badge().description }}</p>
      </div>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeCardComponent {
  readonly badge = input.required<Badge>();
}
