import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface StepConfig {
  id: string;
  label?: string;
  completed?: boolean;
}

@Component({
  selector: 'app-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="stepper-container">
      <!-- Progress Dots -->
      <div class="progress-dots">
        @for (step of steps(); track step.id; let i = $index) {
          <div
            class="progress-dot"
            [class.active]="i === currentStepIndex()"
            [class.completed]="i < currentStepIndex()"
            [attr.aria-label]="step.label || 'Step ' + (i + 1)"
          ></div>
        }
      </div>

      <!-- Progress Bar -->
      @if (showProgressBar()) {
        <div
          class="progress-bar"
          role="progressbar"
          [attr.aria-valuenow]="progressPercentage()"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
        </div>
      }

      <!-- Progress Text -->
      @if (showStepText()) {
        <div class="progress-text" aria-live="polite">
          Step {{ currentStepIndex() + 1 }} of {{ steps().length }}
        </div>
      }
    </div>
  `,
  styleUrl: './stepper.component.scss',
})
export class StepperComponent {
  // Input signals
  readonly steps = input.required<StepConfig[]>();
  readonly currentStepIndex = input<number>(0);
  readonly showProgressBar = input<boolean>(true);
  readonly showStepText = input<boolean>(true);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  // Computed progress percentage
  readonly progressPercentage = () => {
    const total = this.steps().length;
    const current = this.currentStepIndex() + 1;
    return total > 0 ? (current / total) * 100 : 0;
  };
}
