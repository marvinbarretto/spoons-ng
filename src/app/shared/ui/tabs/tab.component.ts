import { Component, input } from '@angular/core';

@Component({
  selector: 'ff-tab',
  template: `
    <div
      class="tab-panel"
      [attr.role]="'tabpanel'"
      [attr.id]="getTabPanelId()"
      [attr.aria-labelledby]="getTabId()"
      [attr.hidden]="!isActive()"
    >
      @if (isActive()) {
        <ng-content />
      }
    </div>
  `,
  styles: `
    .tab-panel {
      width: 100%;
    }

    .tab-panel[hidden] {
      display: none;
    }
  `,
})
export class TabComponent {
  // Input signals
  readonly id = input.required<string>();
  readonly active = input<boolean>(false);

  isActive(): boolean {
    return this.active();
  }

  getTabId(): string {
    return `tab-${this.id()}`;
  }

  getTabPanelId(): string {
    return `tabpanel-${this.id()}`;
  }
}
