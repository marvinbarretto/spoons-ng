import { Component, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseWidgetComponent } from '../base/base-widget.component';
import { UserMissionsStore } from '../../missions/data-access/user-missions.store';
import { MissionStore } from '../../missions/data-access/mission.store';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserStore } from '../../users/data-access/user.store';
import { NearbyPubStore } from '../../pubs/data-access/nearby-pub.store';
import { LocationService } from '../../shared/data-access/location.service';
import { Mission } from '../../missions/utils/mission.model';
import { LoadingStateComponent, ErrorStateComponent, EmptyStateComponent } from '../../shared/ui/state-components';

@Component({
  selector: 'app-suggested-mission-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  template: `
    <div class="suggested-mission-widget">
      <div class="widget-header">
        <h3 class="widget-title">💡 Suggested Mission</h3>
        @if (suggestedMission() && !suggestedMission()?.isCurrentUserEnrolled) {
          <button 
            class="cycle-btn" 
            (click)="onCycleSuggestion()"
            [disabled]="storeLoading()"
            title="Try a different suggestion"
          >
            🔄
          </button>
        }
      </div>

      @if (storeLoading()) {
        <app-loading-state text="Finding perfect mission..." />
      } @else if (storeError()) {
        <app-error-state 
          [message]="getErrorMessage()"
          [showRetry]="true"
          (retry)="onRetryLoadMissions()"
        />
      } @else if (!suggestedMission()) {
        <app-empty-state 
          icon="🎯"
          title="No suggestions available"
          subtitle="Try checking back later or explore all missions"
          [showAction]="true"
          actionText="See All Missions"
          (action)="onSeeAllMissions()"
        />
      } @else {
        <div class="mission-suggestion">
          <div class="mission-card">
            <div class="mission-header">
              <div class="mission-emoji">{{ suggestedMission()!.mission.emoji || '🎯' }}</div>
              <div class="mission-meta">
                <h4 class="mission-title">{{ suggestedMission()!.mission.name }}</h4>
                <p class="mission-subtitle">{{ getMissionSubtitle() }}</p>
              </div>
            </div>
            
            <div class="mission-details">
              <p class="mission-description">{{ suggestedMission()!.mission.description }}</p>
              
              <div class="mission-stats">
                <div class="stat-item">
                  <span class="stat-label">Pubs:</span>
                  <span class="stat-value">{{ suggestedMission()!.mission.pubIds.length }}</span>
                </div>
                @if (suggestedMission()!.mission.difficulty) {
                  <div class="stat-item">
                    <span class="stat-label">Difficulty:</span>
                    <span class="stat-value difficulty-{{ suggestedMission()!.mission.difficulty }}">
                      {{ formatDifficulty(suggestedMission()!.mission.difficulty!) }}
                    </span>
                  </div>
                }
                @if (suggestedMission()!.mission.pointsReward) {
                  <div class="stat-item">
                    <span class="stat-label">Points:</span>
                    <span class="stat-value">{{ suggestedMission()!.mission.pointsReward }}</span>
                  </div>
                }
              </div>
            </div>
            
            <div class="mission-actions">
              @if (suggestedMission()!.isCurrentUserEnrolled) {
                <button class="action-btn enrolled" (click)="onViewMission()">
                  View Progress
                </button>
              } @else {
                <button 
                  class="action-btn primary" 
                  (click)="onStartMission()"
                  [disabled]="enrolling()"
                >
                  @if (enrolling()) {
                    Enrolling...
                  } @else {
                    Start Mission
                  }
                </button>
              }
              <button class="action-btn secondary" (click)="onSeeAllMissions()">
                See All Missions
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .suggested-mission-widget {
      padding: 1rem;
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: var(--shadow);
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .widget-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
    }

    .cycle-btn {
      padding: 0.375rem;
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cycle-btn:hover:not(:disabled) {
      background: var(--background-darkest);
      color: var(--text);
      transform: rotate(180deg);
    }

    .cycle-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .mission-suggestion {
      margin-top: 1rem;
    }

    .mission-card {
      background: var(--background-darkest);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      transition: all 0.2s ease;
    }

    .mission-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }

    .mission-header {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .mission-emoji {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .mission-meta {
      flex: 1;
      min-width: 0;
    }

    .mission-title {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
      line-height: 1.2;
    }

    .mission-subtitle {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.3;
    }

    .mission-details {
      margin-bottom: 1rem;
    }

    .mission-description {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .mission-stats {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      gap: 0.25rem;
      align-items: center;
      font-size: 0.8rem;
    }

    .stat-label {
      color: var(--text-muted);
      font-weight: 500;
    }

    .stat-value {
      color: var(--text);
      font-weight: 600;
    }

    .difficulty-easy {
      color: var(--success);
    }

    .difficulty-medium {
      color: var(--warning);
    }

    .difficulty-hard {
      color: var(--error);
    }

    .difficulty-extreme {
      color: var(--error);
      font-weight: 700;
    }

    .mission-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      min-width: 0;
    }

    .action-btn.primary {
      background: var(--primary);
      color: var(--primary-contrast);
    }

    .action-btn.primary:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    .action-btn.primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .action-btn.secondary {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .action-btn.secondary:hover {
      background: var(--background-darkest);
      color: var(--text);
    }

    .action-btn.enrolled {
      background: var(--success);
      color: var(--background);
    }

    .action-btn.enrolled:hover {
      background: var(--success);
      opacity: 0.9;
    }

    /* Responsive Design */
    @media (max-width: 640px) {
      .mission-stats {
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .mission-actions {
        flex-direction: column;
      }
      
      .action-btn {
        flex: none;
      }
    }
  `]
})
export class SuggestedMissionWidgetComponent extends BaseWidgetComponent {
  protected override readonly router = inject(Router);
  private readonly userMissionsStore = inject(UserMissionsStore);
  private readonly missionStore = inject(MissionStore);
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  private readonly locationService = inject(LocationService);

  private readonly _enrolling = signal(false);
  private readonly _suggestedMissionIndex = signal(0);

  protected readonly enrolling = this._enrolling.asReadonly();
  protected readonly storeLoading = computed(() => 
    this.missionStore.loading() || this.userMissionsStore.loading()
  );
  protected readonly storeError = computed(() => 
    this.missionStore.error() || this.userMissionsStore.error()
  );

  protected readonly suggestedMission = computed(() => {
    const suggestions = this.generateSuggestions();
    const index = this._suggestedMissionIndex();
    
    if (suggestions.length === 0) return null;
    
    return suggestions[index % suggestions.length];
  });

  private generateSuggestions(): Array<{
    mission: Mission;
    isCurrentUserEnrolled: boolean;
    reason: string;
  }> {
    const user = this.userStore.user();
    const allMissions = this.missionStore.missions();
    const activeMissions = this.userMissionsStore.activeMissions();
    const completedMissions = this.userMissionsStore.completedMissions();
    const availableMissions = this.userMissionsStore.availableMissions();
    const nearbyPubs = this.nearbyPubStore.nearbyPubs();
    const userLocation = this.locationService.location();
    
    if (!user || allMissions.length === 0) return [];

    const activeMissionIds = activeMissions.map(m => m.mission.id);
    const completedMissionIds = completedMissions.map(m => m.mission.id);
    const isNewUser = !user || (user.badgeCount || 0) === 0;

    let suggestions: Array<{
      mission: Mission;
      isCurrentUserEnrolled: boolean;
      reason: string;
      score: number;
    }> = [];

    // 1. For new users, prioritize easy missions
    if (isNewUser) {
      const easyMissions = allMissions.filter(m => 
        m.difficulty === 'easy' && 
        !completedMissionIds.includes(m.id)
      );
      
      suggestions.push(...easyMissions.map(mission => ({
        mission,
        isCurrentUserEnrolled: activeMissionIds.includes(mission.id),
        reason: 'Perfect for beginners',
        score: 100
      })));
    }

    // 2. Location-based suggestions (missions with nearby pubs)
    if (userLocation && nearbyPubs.length > 0) {
      const nearbyPubIds = nearbyPubs.map(pub => pub.id);
      const localMissions = allMissions.filter(mission => 
        mission.pubIds.some(pubId => nearbyPubIds.includes(pubId)) &&
        !completedMissionIds.includes(mission.id)
      );

      suggestions.push(...localMissions.map(mission => {
        const localPubCount = mission.pubIds.filter(pubId => nearbyPubIds.includes(pubId)).length;
        const score = (localPubCount / mission.pubIds.length) * 80;
        
        return {
          mission,
          isCurrentUserEnrolled: activeMissionIds.includes(mission.id),
          reason: `${localPubCount} nearby pubs`,
          score
        };
      }));
    }

    // 3. Featured missions
    const featuredMissions = allMissions.filter(m => 
      m.featured && !completedMissionIds.includes(m.id)
    );
    
    suggestions.push(...featuredMissions.map(mission => ({
      mission,
      isCurrentUserEnrolled: activeMissionIds.includes(mission.id),
      reason: 'Featured mission',
      score: 60
    })));

    // 4. Regional missions (if we had region data)
    // Note: User model doesn't currently have region/country fields
    // This could be added in future if location-based targeting is needed

    // 5. Fallback: random available missions
    if (suggestions.length === 0) {
      const randomMissions = allMissions.filter(m => 
        !completedMissionIds.includes(m.id)
      );
      
      suggestions.push(...randomMissions.map(mission => ({
        mission,
        isCurrentUserEnrolled: activeMissionIds.includes(mission.id),
        reason: 'Popular choice',
        score: 10
      })));
    }

    // Remove duplicates and sort by score
    const uniqueSuggestions = suggestions.reduce((acc, current) => {
      if (!acc.find(item => item.mission.id === current.mission.id)) {
        acc.push(current);
      }
      return acc;
    }, [] as typeof suggestions);

    return uniqueSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Limit to 5 suggestions for cycling
      .map(({ mission, isCurrentUserEnrolled, reason }) => ({
        mission,
        isCurrentUserEnrolled,
        reason
      }));
  }

  getMissionSubtitle(): string {
    const suggestion = this.suggestedMission();
    return suggestion?.reason || 'Great mission to try';
  }

  getErrorMessage(): string {
    const error = this.storeError();
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as any).message;
    }
    return 'Failed to load missions';
  }

  formatDifficulty(difficulty: string): string {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  onCycleSuggestion(): void {
    const suggestions = this.generateSuggestions();
    if (suggestions.length <= 1) return;
    
    this._suggestedMissionIndex.update(index => index + 1);
    console.log('[SuggestedMissionWidget] Cycling to next suggestion');
  }

  async onStartMission(): Promise<void> {
    const suggestion = this.suggestedMission();
    if (!suggestion || suggestion.isCurrentUserEnrolled) return;

    this._enrolling.set(true);
    try {
      await this.userMissionsStore.enrollInMission(suggestion.mission.id);
      console.log('[SuggestedMissionWidget] Successfully enrolled in mission:', suggestion.mission.name);
      this.showSuccess('Mission started! Check your progress in the missions tab.');
    } catch (error: any) {
      console.error('[SuggestedMissionWidget] Failed to enroll in mission:', error);
      this.showError('Failed to start mission. Please try again.');
    } finally {
      this._enrolling.set(false);
    }
  }

  onViewMission(): void {
    console.log('[SuggestedMissionWidget] View mission clicked');
    this.router.navigate(['/missions']);
  }

  onSeeAllMissions(): void {
    console.log('[SuggestedMissionWidget] See all missions clicked');
    this.router.navigate(['/missions']);
  }

  onRetryLoadMissions(): void {
    console.log('[SuggestedMissionWidget] Retrying load missions');
    this.missionStore.loadOnce();
  }
}