import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SharePanelComponent } from "../../ui/share-panel/share-panel.component";

@Component({
  selector: 'app-share-container',
  imports: [SharePanelComponent],
  template: `
  <app-share-panel></app-share-panel>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShareContainerComponent {

}
