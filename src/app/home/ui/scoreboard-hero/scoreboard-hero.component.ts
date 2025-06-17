// src/app/home/ui/scoreboard-hero/scoreboard-hero.component.ts
import { Component, input, output, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '@shared/data-access/base.component';
import { UserStore } from '@users/data-access/user.store';
import { BadgeStore } from '@badges/data-access/badge.store';
import { MissionStore } from '@missions/data-access/mission.store';
import { AuthStore } from '@auth/data-access/auth.store';
import type { User } from '@users/utils/user.model';

@Component({
  selector: 'app-scoreboard-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="scoreboard-hero">
      <!-- ✅ Main Scoreboard -->
      <div class="scoreboard">
        <div class="score-display">
          <div class="score-item">
            <span class="score-number">{{ totalPoints() }}</span>
            <span class="score-label">Points</span>
          </div>
          <div class="score-divider">•</div>
          <div class="score-item">
            <span class="score-number">{{ pubsVisited() }}</span>
            <span class="score-label">/ {{ totalPubs }} Pubs</span>
          </div>
        </div>

        <!-- ✅ Overall Progress Bar -->
        <div class="progress-container">
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="overallProgress()"
            ></div>
          </div>
          <span class="progress-text">{{ overallProgress() }}% Complete</span>
        </div>
      </div>

      <!-- ✅ Badges Section (Football Crest Style) -->
      @if (earnedBadges().length > 0) {
        <div class="badges-showcase">
          <h3 class="badges-title">🏅 Your Badges</h3>
          <div class="badges-grid">
            @for (badge of displayBadges(); track badge.badge?.id) {
              <div class="badge-crest" [title]="badge.badge?.name">
                <div class="badge-shield">
                  <div class="badge-icon">{{ getBadgeIcon(badge.badge?.id) }}</div>
                  <div class="badge-banner">{{ getBadgeShortName(badge.badge?.name) }}</div>
                </div>
              </div>
            }

            <!-- Show "view all" if more badges than displayed -->
            @if (earnedBadges().length > maxDisplayBadges) {
              <div class="badge-crest view-all" (click)="handleViewAllBadges()">
                <div class="badge-shield">
                  <div class="badge-icon">+{{ earnedBadges().length - maxDisplayBadges }}</div>
                  <div class="badge-banner">More</div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ✅ Mission Progress Section -->
      @if (activeMissions().length > 0) {
        <div class="missions-section">
          <h3 class="missions-title">🎯 Active Missions</h3>
          <div class="missions-grid">
            @for (mission of activeMissions(); track mission.id) {
              <div class="mission-card" (click)="handleViewMission(mission.id)">
                <div class="mission-header">
                  <span class="mission-name">{{ mission.name }}</span>
                  <span class="mission-progress">{{ mission.progress }}/{{ mission.total }}</span>
                </div>
                <div class="mission-progress-bar">
                  <div
                    class="mission-fill"
                    [style.width.%]="getMissionProgress(mission)"
                  ></div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ✅ Action Cards -->
      <div class="action-cards">
        @if (activeMissions().length === 0) {
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

      <!-- ✅ New User Onboarding Hint -->
      @if (isNewUser()) {
        <div class="onboarding-hint">
          <span class="hint-icon">💡</span>
          <span class="hint-text">
            Welcome to Spooncount! Start a mission to begin your pub adventure.
          </span>
        </div>
      }
    </div>
  `,
  styles: `
    .scoreboard-hero {
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%);
      color: white;
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    }

    /* ✅ Main Scoreboard */
    .scoreboard {
      text-align: center;
      margin-bottom: 2rem;
    }

    .score-display {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .score-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .score-number {
      font-size: 3rem;
      font-weight: 900;
      line-height: 1;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      background: linear-gradient(45deg, #ffd700, #ffed4e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .score-label {
      font-size: 0.875rem;
      font-weight: 600;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .score-divider {
      font-size: 2rem;
      opacity: 0.6;
      font-weight: bold;
    }

    .progress-container {
      max-width: 300px;
      margin: 0 auto;
    }

    .progress-bar {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      height: 8px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      background: linear-gradient(90deg, #ffd700, #ffed4e);
      height: 100%;
      border-radius: 10px;
      transition: width 0.8s ease;
    }

    .progress-text {
      font-size: 0.875rem;
      font-weight: 600;
      opacity: 0.9;
    }

    /* ✅ Football Badge Crests */
    .badges-showcase {
      margin-bottom: 2rem;
    }

    .badges-title, .missions-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 1rem;
      text-align: center;
    }

    .badges-grid {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .badge-crest {
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .badge-crest:hover {
      transform: scale(1.1);
    }

    .badge-shield {
      width: 60px;
      height: 70px;
      background: linear-gradient(145deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
      border: 3px solid #ffd700;
      border-radius: 50% 50% 10px 10px;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .badge-icon {
      font-size: 1.5rem;
      margin-bottom: 2px;
    }

    .badge-banner {
      position: absolute;
      bottom: 2px;
      left: 0;
      right: 0;
      background: #ffd700;
      color: #1e40af;
      font-size: 0.6rem;
      font-weight: 700;
      text-align: center;
      padding: 1px 2px;
      border-radius: 0 0 6px 6px;
      text-transform: uppercase;
    }

    .badge-crest.view-all .badge-shield {
      background: linear-gradient(145deg, #64748b 0%, #475569 50%, #334155 100%);
      border-color: #e2e8f0;
    }

    .badge-crest.view-all .badge-banner {
      background: #e2e8f0;
      color: #334155;
    }

    /* ✅ Mission Progress */
    .missions-section {
      margin-bottom: 2rem;
    }

    .missions-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mission-card {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mission-card:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }

    .mission-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .mission-name {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .mission-progress {
      font-size: 0.8rem;
      font-weight: 700;
      color: #ffd700;
    }

    .mission-progress-bar {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      height: 6px;
      overflow: hidden;
    }

    .mission-fill {
      background: linear-gradient(90deg, #10b981, #059669);
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s ease;
    }

    /* ✅ Action Cards */
    .action-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .action-card {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      color: white;
    }

    .action-card:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }

    .action-card.primary {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border-color: #10b981;
    }

    .action-card.primary:hover {
      background: linear-gradient(135deg, #047857 0%, #065f46 100%);
    }

    .action-icon {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .action-title {
      display: block;
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }

    .action-subtitle {
      display: block;
      font-size: 0.75rem;
      opacity: 0.8;
    }

    /* ✅ Onboarding Hint */
    .onboarding-hint {
      background: rgba(255, 237, 78, 0.15);
      border: 1px solid rgba(255, 237, 78, 0.3);
      border-radius: 8px;
      padding: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-align: left;
    }

    .hint-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .hint-text {
      font-size: 0.875rem;
      line-height: 1.4;
    }

    /* ✅ Responsive Design */
    @media (max-width: 640px) {
      .scoreboard-hero {
        padding: 1.5rem;
      }

      .score-number {
        font-size: 2.5rem;
      }

      .action-cards {
        grid-template-columns: 1fr;
      }

      .badges-grid {
        justify-content: center;
      }
    }
  `
})
export class ScoreboardHeroComponent extends BaseComponent {
  // ✅ Store Injections (with safe injection)
  private readonly userStore = inject(UserStore);
  private readonly badgeStore = inject(BadgeStore, { optional: true });
  private readonly missionStore = inject(MissionStore, { optional: true });
  private readonly authStore = inject(AuthStore);

  // ✅ Configuration
  readonly maxDisplayBadges = 6;
  readonly totalPubs = 856; // TODO: Get from PubStore when available

  // ✅ Outputs
  readonly openSettings = output<void>();
  readonly openGuide = output<void>();
  readonly startMission = output<void>();
  readonly viewMission = output<string>();
  readonly viewAllBadges = output<void>();

  // ✅ Data Signals (with safe defaults)
  readonly user = this.userStore.user;
  readonly earnedBadges = computed(() => {
    return this.badgeStore?.earnedBadgesWithDefinitions?.() || [];
  });
  readonly allMissions = computed(() => {
    return this.missionStore?.missions?.() || [];
  });

  // ✅ Computed Values
  readonly isNewUser = computed(() => {
    const user = this.user();
    return !user || (user.checkedInPubIds?.length || 0) === 0;
  });

  readonly pubsVisited = computed(() => {
    const user = this.user();
    return user?.checkedInPubIds?.length || 0;
  });

  readonly totalPoints = computed(() => {
    // TODO: Implement points calculation
    const pubs = this.pubsVisited();
    const badges = this.earnedBadges().length;
    return pubs * 10 + badges * 50; // Placeholder calculation
  });

  readonly overallProgress = computed(() => {
    const visited = this.pubsVisited();
    return Math.round((visited / this.totalPubs) * 100);
  });

  readonly displayBadges = computed(() => {
    return this.earnedBadges().slice(0, this.maxDisplayBadges);
  });

  readonly activeMissions = computed(() => {
    const user = this.user();
    const missions = this.allMissions();

    if (!user?.joinedMissionIds?.length || !missions.length) return [];

    return missions
      .filter(mission => user.joinedMissionIds!.includes(mission.id))
      .map(mission => ({
        ...mission,
        progress: mission.pubIds?.filter(id =>
          user.checkedInPubIds?.includes(id)
        ).length || 0,
        total: mission.pubIds?.length || 0
      }))
      .slice(0, 3); // Show max 3 active missions
  });

  // ✅ Utility Methods
  getMissionProgress(mission: any): number {
    return mission.total > 0 ? Math.round((mission.progress / mission.total) * 100) : 0;
  }

  getBadgeIcon(badgeId?: string): string {
    // TODO: Create proper badge icon mapping
    const iconMap: Record<string, string> = {
      'first-checkin': '🥇',
      'early-bird': '🌅',
      'night-owl': '🦉',
      'weekend-warrior': '⚔️',
      'local-hero': '🏠',
      'explorer': '🗺️',
      'social-butterfly': '🦋',
      'regular': '⭐',
      'landlord': '👑',
      'marathon': '🏃',
    };
    return iconMap[badgeId || ''] || '🏅';
  }

  getBadgeShortName(name?: string): string {
    if (!name) return '';
    // Convert "First Check-in" to "FIRST" etc.
    return name.split(' ')[0].toUpperCase().slice(0, 6);
  }

  // ✅ Event Handlers
  handleOpenSettings(): void {
    this.openSettings.emit();
  }

  handleOpenGuide(): void {
    this.openGuide.emit();
  }

  handleStartMission(): void {
    this.startMission.emit();
  }

  handleViewMission(id: string): void {
    this.viewMission.emit(id);
  }

  handleViewAllBadges(): void {
    this.viewAllBadges.emit();
  }

  protected override onInit(): void {
    // ✅ Load required data (safely)
    try {
      this.badgeStore?.loadOnce?.();
      this.missionStore?.loadOnce?.();
      console.log('[ScoreboardHero] Data loading initiated');
    } catch (error) {
      console.warn('[ScoreboardHero] Some stores not available:', error);
    }
  }
}
