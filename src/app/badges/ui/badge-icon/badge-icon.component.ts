import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Badge } from '../../utils/badge.model';

@Component({
  selector: 'app-badge-icon',
  imports: [],
  template: `
    <span class="badge-icon" [title]="badgeName()">
      @if (emoji()) {
        {{ emoji() }}
      } @else if (iconUrl()) {
        <img [src]="iconUrl()" [alt]="badgeName()" />
      } @else {
        🏅
      }
    </span>
  `,
  styles: `
    .badge-icon {
      font-size: 2rem;
      line-height: 1;
      display: inline-block;
    }
    .badge-icon img {
      width: 2rem;
      height: 2rem;
      vertical-align: middle;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeIconComponent {
  readonly badge = input<Badge>();

  readonly emoji = computed(() => this.badge()?.emoji);
  readonly iconUrl = computed(() => this.badge()?.iconUrl);
  readonly badgeName = computed(() => this.badge()?.name ?? 'Badge');
}
