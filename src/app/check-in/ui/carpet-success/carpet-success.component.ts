// src/app/check-in/ui/carpet-success/carpet-success.component.ts
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
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

  readonly continueScanning = output<void>();
  readonly viewCollection = output<void>();

  // ✅ Development debugging
  protected readonly showDebugInfo = signal(true); // Set to false for production

  protected onConfirm(): void {
    console.log('[CarpetSuccess] ✅ User confirmed carpet scan');
    this.confirmed.emit();
  }

  protected onScanAgain(): void {
    console.log('[CarpetSuccess] 🔄 User wants to scan again');
    this.scanAgain.emit();
  }

protected onContinue(): void {
  console.log('🚪 [CarpetSuccess] User clicked Continue');
  this.continueScanning.emit();
}

protected onViewCollection(): void {
  console.log('📋 [CarpetSuccess] User wants to view collection');
  this.viewCollection.emit();
}


  // ✅ Debug helpers
  protected onImageLoaded(): void {
    console.log('[CarpetSuccess] ✅ Image loaded successfully');
  }

  protected onImageError(event: any): void {
    console.error('[CarpetSuccess] ❌ Image failed to load:', event);
    const data = this.carpetData();
    console.log('[CarpetSuccess] Photo blob size:', data.capturedPhoto?.size);
    console.log('[CarpetSuccess] Display URL:', data.photoDisplayUrl);
    console.log('[CarpetSuccess] Photo format:', data.photoFormat);
  }

  protected getImageDebugInfo(): string {
    const data = this.carpetData();
    if (!data.capturedPhoto) return 'No photo';

    return `${data.photoSizeKB}KB (${data.photoFormat})`;
  }
}
