import { ChangeDetectionStrategy, Component, computed, EventEmitter, input, Output } from '@angular/core';

@Component({
  selector: 'app-button',
  template: `
    <button
    [attr.data-variant]="variant$$()"
    [disabled]="isDisabled()"
    [class.is-loading]="loading$$()"
    [attr.aria-busy]="loading$$()"
    [class.full-width]="fullWidth$$()"
    (click)="handleClick()"
    [attr.type]="type$$()"
  >

    @if (loading$$()) {
      <span class="spinner" aria-hidden="true"></span>
      <!-- TODO: Use the spinner from the material icons -->
    } @else if (icon$$()) {
      <span class="material-symbols-outlined icon">
        {{ icon$$() }}
      </span>
    }
    <span>
      <ng-content />
    </span>
  </button>
`,
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly variant$$ = input<'primary' | 'secondary' | 'link'>('secondary');
  readonly loading$$ = input(false);
  readonly disabled$$ = input(false);
  readonly icon$$ = input<string | null>(null);
  readonly fullWidth$$ = input(false);
  readonly type$$ = input<'button' | 'submit' | 'reset'>('button');

  @Output() onClick = new EventEmitter<void>();

  readonly isDisabled = computed(() => this.disabled$$() || this.loading$$());

  handleClick(): void {
    if (!this.isDisabled()) {
      this.onClick.emit();
    }
  }
}
