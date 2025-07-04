import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { UserExperienceLevel } from '../../../shared/utils/user-progression.models';


type LandlordStatusData = {
  isNewLandlord: boolean;
  landlordMessage?: string;
  pub?: { id: string; name: string; };
};

@Component({
  selector: 'app-landlord-status-modal',
  imports: [ButtonComponent],
  template: `
    <div class="modal-container">
      <div class="modal-header">
        <h2>{{ headerTitle() }}</h2>
      </div>

      <div class="modal-body">
        @if (data().isNewLandlord) {
          <!-- New Landlord Success -->
          <div class="landlord-success">
            <div class="crown-icon">👑</div>

            @switch (UserExperienceLevel()) {
              @case ('brandNew') {
                <div class="onboarding-explanation">
                  <h3>You're the Landlord!</h3>
                  <p><strong>What does this mean?</strong></p>
                  <ul>
                    <li>You're the most recent person to check into {{ data().pub?.name }}</li>
                    <li>Defend your territory by checking in regularly</li>
                    <li>Other users will try to claim your landlord status</li>
                    <li>The more pubs you control, the higher your status</li>
                  </ul>
                  <div class="tip">
                    <strong>💡 Tip:</strong> Visit your pubs regularly to maintain landlord status
                  </div>
                </div>
              }
              @case ('firstTime') {
                <div class="encouragement">
                  <h3>Landlord Status Claimed!</h3>
                  <p>Excellent work! You're now the landlord of {{ data().pub?.name }}.</p>
                  <p>Keep exploring to expand your pub empire and compete with other players.</p>
                </div>
              }
              @default {
                <div class="standard-success">
                  <h3>New Landlord Status!</h3>
                  <p>You've successfully claimed {{ data().pub?.name }}</p>
                  <p>{{ data().landlordMessage }}</p>
                </div>
              }
            }
          </div>
        } @else {
          <!-- Landlord Challenge Failed -->
          <div class="landlord-challenge">
            @switch (UserExperienceLevel()) {
              @case ('brandNew') {
                <div class="learning-explanation">
                  <h3>Landlord Status</h3>
                  <p>{{ data().landlordMessage }}</p>
                  <div class="explanation">
                    <p><strong>How landlord status works:</strong></p>
                    <ul>
                      <li>The most recent check-in claims landlord status</li>
                      <li>Visit pubs regularly to compete for control</li>
                      <li>Each pub can only have one landlord at a time</li>
                    </ul>
                  </div>
                </div>
              }
              @default {
                <div class="standard-challenge">
                  <p>{{ data().landlordMessage }}</p>
                  <p>Keep checking in to compete for landlord status!</p>
                </div>
              }
            }
          </div>
        }
      </div>

      <div class="modal-footer">
        <app-button
          variant="secondary"
          (onClick)="previousModal.emit()"
        >
          ← Back
        </app-button>

        <app-button
          variant="primary"
          (onClick)="navigate.emit()"
        >
          View {{ data().pub?.name }}
        </app-button>
      </div>
    </div>
  `,
  styles: `
    .crown-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 1rem;
    }

    .onboarding-explanation ul,
    .learning-explanation ul {
      text-align: left;
      margin: 1rem 0;
      padding-left: 1.5rem;
    }

    .tip {
      background: var(--color-info);
      padding: 0.75rem;
      border-radius: 4px;
      margin-top: 1rem;
      font-size: 0.9rem;
    }

    .explanation {
      background: var(--background-lighter);
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1rem;
    }

    /* Rest of modal styles similar to check-in status modal */
  `
})
export class LandlordStatusModalComponent {
  readonly data = input.required<LandlordStatusData>();
  readonly UserExperienceLevel = input.required<UserExperienceLevel>();

  readonly navigate = output<void>();
  readonly dismiss = output<void>();
  readonly previousModal = output<void>();

  readonly headerTitle = computed(() =>
    this.data().isNewLandlord ? 'Landlord Status' : 'Challenge Result'
  );
}
