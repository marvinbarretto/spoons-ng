import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-inline-svg',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src) {
      <img [src]="src" [alt]="alt || 'icon'" class="inline-svg" />
    }
  `,
  styles: [
    `
      .inline-svg {
        width: 2rem;
        height: 2rem;
        display: inline-block;
        vertical-align: middle;
      }
    `,
  ],
})
export class InlineSvgComponent {
  // TODO: Should these be decorators
  @Input() src!: string;
  @Input() alt?: string;
}
