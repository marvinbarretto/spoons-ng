import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, input, Output } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // TODO: Learn how to use inputs
  // inputs: [
  //   'variant$$:variant',
  //   'icon$$:icon',
  // ]
})
export class ButtonComponent {
  readonly variant$$ = input<'primary' | 'secondary' | 'link'>('secondary');
  readonly loading$$ = input(false);
  readonly disabled$$ = input(false);
  readonly icon$$ = input<string | null>(null);
  readonly fullWidth$$ = input(false);
  readonly type$$ = input<'button' | 'submit' | 'reset'>('button');

  @Output() onClick = new EventEmitter<void>();

  handleClick(): void {
    this.onClick.emit();
  }
}
