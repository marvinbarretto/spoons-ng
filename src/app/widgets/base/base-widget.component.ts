import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BaseComponent } from '@shared/base/base.component';

@Component({
  selector: 'app-base-widget',
  imports: [],
  template: `
    <p>
      base-widget works!
    </p>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export abstract class BaseWidgetComponent extends BaseComponent {

    // Inherit from BaseComponent
    // protected readonly loading = signal(false);
    // protected readonly error = signal<string | null>(null);


}
