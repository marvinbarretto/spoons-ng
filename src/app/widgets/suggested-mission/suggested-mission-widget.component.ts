import { Component, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { BaseWidgetComponent } from '../base/base-widget.component';
import { UserMissionsStore } from '../../missions/data-access/user-missions.store';
import { MissionStore } from '../../missions/data-access/mission.store';
import { AuthStore } from '../../auth/data-access/auth.store';
import { UserStore } from '../../users/data-access/user.store';
import { NearbyPubStore } from '../../pubs/data-access/nearby-pub.store';
import { LocationService } from '../../shared/data-access/location.service';
import { CheckInStore } from '../../check-in/data-access/check-in.store';
import { Mission } from '../../missions/utils/mission.model';
import { LoadingStateComponent, ErrorStateComponent, EmptyStateComponent } from '../../shared/ui/state-components';
import { MissionCardLightComponent } from '../../home/ui/mission-card-light/mission-card-light.component';

@Component({
  selector: 'app-suggested-mission-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingStateComponent, ErrorStateComponent, EmptyStateComponent, MissionCardLightComponent],
  template: `
    <div class="suggested-mission-widget">
      <div class="widget-header">
        <h3 class="widget-title">💡 Suggested Mission</h3>
        @if (suggestedMission()) {
          <div class="suggestion-controls">
            <button
              class="cycle-btn"
              (click)="onCycleSuggestion()"
              [disabled]="storeLoading() || isAnimating()"
              title="See another suggestion"
            >
              🔄
            </button>
            <button
              class="dismiss-btn"
              (click)="onDismissSuggestion()"
              [disabled]="storeLoading() || isAnimating()"
              title="Not interested"
            >
              ✕
            </button>
          </div>
        }
      </div>

      @if (storeLoading()) {
        <app-loading-state text="Finding your next mission..." />
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
        <div class="mission-carousel">
          <div class="mission-track"
               [style.transform]="'translateX(calc(-100% * ' + currentIndex() + '))'">
            @for (suggestion of suggestions(); track suggestion.mission.id; let i = $index) {
              <div class="mission-slide">
                <div class="mission-suggestion">
                  <div class="mission-subtitle">{{ suggestion.reason }}</div>
                  <app-mission-card-light
                    [mission]="suggestion.mission"
                    [isJoined]="suggestion.isCurrentUserEnrolled"
                    [showPubDetails]="true"
                  />
                  <div class="mission-actions">
                    @if (suggestion.isCurrentUserEnrolled) {
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

    .suggestion-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .cycle-btn, .dismiss-btn {
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

    .dismiss-btn:hover:not(:disabled) {
      background: var(--background-darkest);
      color: var(--error);
      border-color: var(--error);
    }

    .cycle-btn:disabled, .dismiss-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .mission-carousel {
      position: relative;
      width: 100%;
      overflow: hidden;
      margin-top: 1rem;
    }

    .mission-track {
      display: flex;
      transition: transform 0.3s ease-in-out;
      will-change: transform;
    }

    .mission-slide {
      flex: 0 0 100%;
      min-width: 100%;
      width: 100%;
    }

    .mission-suggestion {
      width: 100%;
      padding: 0 0.25rem;
      box-sizing: border-box;
    }

    .mission-subtitle {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.3;
      font-style: italic;
      text-align: center;
    }

    .mission-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 1rem;
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
      color: var(--on-primary);
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

    /* Accessibility: Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      .mission-track {
        transition: none;
      }
    }
  `]
})
export class SuggestedMissionWidgetComponent extends BaseWidgetComponent {
  protected readonly userMissionsStore = inject(UserMissionsStore);
  protected readonly missionStore = inject(MissionStore);
  protected readonly userStore = inject(UserStore);
  protected readonly nearbyPubStore = inject(NearbyPubStore);
  protected readonly locationService = inject(LocationService);
  protected readonly checkInStore = inject(CheckInStore);

  private readonly _enrolling = signal(false);
  private readonly _suggestedMissionIndex = signal(0);
  private readonly _isAnimating = signal(false);

  protected readonly enrolling = this._enrolling.asReadonly();
  protected readonly isAnimating = this._isAnimating.asReadonly();
  protected readonly currentIndex = this._suggestedMissionIndex.asReadonly();
  protected readonly storeLoading = computed(() =>
    this.missionStore.loading() || this.userMissionsStore.loading()
  );
  protected readonly storeError = computed(() =>
    this.missionStore.error() || this.userMissionsStore.error()
  );

  protected readonly suggestions = computed(() => {
    return this.generateSuggestions();
  });

  protected readonly suggestedMission = computed(() => {
    const suggestions = this.suggestions();
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
    const nearbyPubs = this.nearbyPubStore.nearbyPubs();
    const userLocation = this.locationService.location();
    const checkedInPubIds = this.checkInStore.checkedInPubIds();

    if (!user || allMissions.length === 0) return [];

    const activeMissionIds = activeMissions.map(m => m.mission.id);
    const completedMissionIds = completedMissions.map(m => m.mission.id);
    const nearbyPubIds = nearbyPubs.map(pub => pub.id);

    let suggestions: Array<{
      mission: Mission;
      isCurrentUserEnrolled: boolean;
      reason: string;
      score: number;
    }> = [];

    // Filter out completed missions
    const availableMissions = allMissions.filter(m => !completedMissionIds.includes(m.id));

    for (const mission of availableMissions) {
      const totalPubs = mission.pubIds.length;
      const visitedPubsInMission = mission.pubIds.filter(pubId => checkedInPubIds.has(pubId)).length;
      const nearbyPubsInMission = userLocation ? mission.pubIds.filter(pubId => nearbyPubIds.includes(pubId)).length : 0;

      const completionPercentage = visitedPubsInMission / totalPubs;
      const nearbyPercentage = userLocation ? nearbyPubsInMission / totalPubs : 0;

      let score = 0;
      let reason = '';

      // Priority 1: Near-completion missions (60-90% done)
      if (completionPercentage >= 0.6 && completionPercentage <= 0.9) {
        score = 95 + (completionPercentage * 5); // 98-100 score
        const remaining = totalPubs - visitedPubsInMission;
        reason = remaining === 1 ? 'Just 1 more pub!' : `Only ${remaining} pubs left!`;
      }
      // Priority 2: Moderate progress missions (20-60% done)
      else if (completionPercentage >= 0.2 && completionPercentage < 0.6) {
        score = 70 + (completionPercentage * 25); // 75-85 score
        reason = `${visitedPubsInMission} of ${totalPubs} pubs visited`;
      }
      // Priority 3: Geographically viable missions (high nearby pub count)
      else if (nearbyPercentage >= 0.3) {
        score = 60 + (nearbyPercentage * 20); // 66-80 score
        reason = `${nearbyPubsInMission} nearby pubs`;
      }
      // Priority 4: Some progress missions (1-20% done)
      else if (completionPercentage > 0 && completionPercentage < 0.2) {
        score = 40 + (completionPercentage * 100); // 40-60 score
        reason = `${visitedPubsInMission} of ${totalPubs} pubs visited`;
      }
      // Priority 5: Some nearby pubs but no progress
      else if (nearbyPercentage > 0) {
        score = 20 + (nearbyPercentage * 20); // 20-40 score
        reason = `${nearbyPubsInMission} nearby pubs`;
      }
      // Priority 6: Fresh missions (no progress, no nearby pubs)
      else {
        score = 10;
        reason = 'New adventure';
      }

      // Bonus for featured missions
      if (mission.featured) {
        score += 10;
        reason = `Featured: ${reason}`;
      }

      const isCurrentUserEnrolled = activeMissionIds.includes(mission.id);

      // Significantly boost non-enrolled missions for better suggestion ranking
      if (!isCurrentUserEnrolled) {
        score += 50; // Major boost for actionable missions
      } else {
        // Enrolled missions get lower priority but remain in suggestions
        score = Math.max(score - 30, 5); // Reduce score but keep minimum
      }

      suggestions.push({
        mission,
        isCurrentUserEnrolled,
        reason,
        score
      });
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


  onCycleSuggestion(): void {
    if (this._isAnimating()) return;

    const suggestions = this.generateSuggestions();
    if (suggestions.length <= 1) return;

    this.animateToIndex(this._suggestedMissionIndex() + 1);
    console.log('[SuggestedMissionWidget] Cycling to next suggestion');
  }

  onDismissSuggestion(): void {
    if (this._isAnimating()) return;

    const suggestions = this.generateSuggestions();
    if (suggestions.length <= 1) return;

    this.animateToIndex(this._suggestedMissionIndex() + 1);
    console.log('[SuggestedMissionWidget] Dismissed suggestion, showing next');
  }

  private animateToIndex(newIndex: number): void {
    const suggestions = this.generateSuggestions();
    if (suggestions.length === 0) return;

    const targetIndex = newIndex % suggestions.length;

    // Check if reduced motion is preferred
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._isAnimating.set(!prefersReducedMotion);
    this._suggestedMissionIndex.set(targetIndex);

    // Reset animation state after transition duration (or immediately if reduced motion)
    const duration = prefersReducedMotion ? 0 : 300;
    setTimeout(() => {
      this._isAnimating.set(false);
    }, duration);
  }

  private getNextNonEnrolledSuggestionIndex(): number | null {
    const suggestions = this.generateSuggestions();
    const currentIndex = this._suggestedMissionIndex();

    if (suggestions.length === 0) return null;

    // Look for next non-enrolled suggestion starting from current+1
    for (let i = 1; i < suggestions.length; i++) {
      const nextIndex = (currentIndex + i) % suggestions.length;
      const suggestion = suggestions[nextIndex];
      if (!suggestion.isCurrentUserEnrolled) {
        return nextIndex;
      }
    }

    // If no non-enrolled suggestions found, return null
    return null;
  }

  private autoAdvanceToNextSuggestion(): void {
    const nextIndex = this.getNextNonEnrolledSuggestionIndex();
    if (nextIndex !== null) {
      this.animateToIndex(nextIndex);
      console.log('[SuggestedMissionWidget] Auto-advanced to next non-enrolled suggestion');
    }
  }

  async onStartMission(): Promise<void> {
    const suggestion = this.suggestedMission();
    if (!suggestion || suggestion.isCurrentUserEnrolled) return;

    this._enrolling.set(true);
    try {
      await this.userMissionsStore.enrollInMission(suggestion.mission.id);
      console.log('[SuggestedMissionWidget] Successfully enrolled in mission:', suggestion.mission.name);

      // Auto-advance to next non-enrolled suggestion
      const nextIndex = this.getNextNonEnrolledSuggestionIndex();
      if (nextIndex !== null) {
        this.autoAdvanceToNextSuggestion();
        this.showSuccess('Mission started! Here\'s your next suggestion:');
      } else {
        this.showSuccess('Mission started! Check your progress in the missions tab.');
      }
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
