// src/app/home/ui/action-cards/action-cards.component.ts
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-action-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="action-cards">
      @if (showStartMission()) {
        <button class="action-card primary" (click)="handleStartMission()">
          <div class="action-icon">🎯</div>
          <div class="action-content">
            <span class="action-title">Start a Mission</span>
            <span class="action-subtitle">Choose your first quest</span>
          </div>
        </button>
      }

      <button class="action-card secondary" (click)="handleOpenGuide()">
        <div class="action-icon">📖</div>
        <div class="action-content">
          <span class="action-title">How to Play</span>
          <span class="action-subtitle">Learn the rules</span>
        </div>
      </button>

      <button class="action-card secondary" (click)="handleOpenSettings()">
        <div class="action-icon">⚙️</div>
        <div class="action-content">
          <span class="action-title">Customize</span>
          <span class="action-subtitle">Profile & theme</span>
        </div>
      </button>
    </div>
  `,
  styles: `
    .action-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .action-card {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      color: var(--color-text, #1f2937);
    }

    .action-card:hover {
      background: rgba(59, 130, 246, 0.15);
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.1);
    }

    .action-card.primary {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border-color: #10b981;
      color: white;
    }

    .action-card.primary:hover {
      background: linear-gradient(135deg, #047857 0%, #065f46 100%);
      box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
    }

    .action-icon {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .action-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .action-title {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .action-subtitle {
      font-size: 0.75rem;
      opacity: 0.8;
    }

    /* ✅ Responsive Design */
    @media (max-width: 640px) {
      .action-cards {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class ActionCardsComponent {
  // ✅ Inputs
  readonly showStartMission = input(true);

  // ✅ Outputs
  readonly enrollInMission = output<void>();
  readonly openGuide = output<void>();
  readonly openSettings = output<void>();

  // ✅ Event Handlers
  handleStartMission(): void {
    this.enrollInMission.emit();
  }

  handleOpenGuide(): void {
    this.openGuide.emit();
  }

  handleOpenSettings(): void {
    this.openSettings.emit();
  }
}
