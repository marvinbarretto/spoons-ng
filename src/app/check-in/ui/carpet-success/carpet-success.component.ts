import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CarpetRecognitionData } from '../../utils/carpet.models';

@Component({
  selector: 'app-carpet-success',
  templateUrl: './carpet-success.component.html',
  styleUrl: './carpet-success.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarpetSuccessComponent {
  readonly carpetData = input.required<CarpetRecognitionData>();

  readonly confirmed = output<void>();
  readonly scanAgain = output<void>();

  protected onConfirm(): void {
    this.confirmed.emit();
  }

  protected onScanAgain(): void {
    this.scanAgain.emit();
  }
}
