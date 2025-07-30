import { Component } from '@angular/core';

@Component({
  selector: 'app-indicator-container',
  template: `
    <div class="indicator-container">
      <ng-content />
    </div>
  `,
  styles: `
    .indicator-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      min-height: 40px;
      flex-shrink: 0;
    }
  `,
})
export class IndicatorContainerComponent {}
