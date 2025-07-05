import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tooltip-container" [attr.data-tooltip]="text()">
      <ng-content></ng-content>
      <div class="tooltip-text">{{ text() }}</div>
    </div>
  `,
  styles: `
    .tooltip-container {
      position: relative;
      display: inline-block;
    }

    .tooltip-text {
      visibility: hidden;
      opacity: 0;
      background-color: var(--background-darkest, #1a1a1a);
      color: var(--text-on-dark, white);
      text-align: center;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.2;

      /* Position */
      position: absolute;
      z-index: 1000;
      bottom: 125%;
      left: 50%;
      transform: translateX(-50%);
      min-width: 120px;
      max-width: 200px;

      /* Smooth transition */
      transition: opacity 0.2s ease, visibility 0.2s ease;

      /* Arrow */
      &::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: var(--background-darkest, #1a1a1a);
      }

      /* Border and shadow for better visibility */
      border: 1px solid var(--border, rgba(255, 255, 255, 0.2));
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .tooltip-container:hover .tooltip-text {
      visibility: visible;
      opacity: 1;
    }

    /* Alternative positioning for mobile */
    @media (max-width: 768px) {
      .tooltip-text {
        font-size: 0.8rem;
        padding: 0.4rem 0.6rem;
        max-width: 150px;
      }
    }
  `
})
export class TooltipComponent {
  readonly text = input.required<string>();
}