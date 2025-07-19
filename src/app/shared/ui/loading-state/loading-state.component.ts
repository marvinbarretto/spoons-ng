import { Component, input } from '@angular/core';


@Component({
  selector: 'app-loading-state',
  imports: [],
  template: `
    <div class="widget-loading" [attr.aria-live]="'polite'">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span class="loading-text">{{ text() }}</span>
    </div>
  `,
  styleUrl: './loading-state.component.scss'
})
export class LoadingStateComponent {
  readonly text = input<string>('Loading...');
}