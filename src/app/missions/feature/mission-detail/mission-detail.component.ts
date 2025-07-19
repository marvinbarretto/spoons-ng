import { Component, computed, inject } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@shared/base/base.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { ButtonSize } from '@shared/ui/button/button.params';
import { LoadingStateComponent, ErrorStateComponent, EmptyStateComponent } from '@shared/ui/state-components';
import { MissionStore } from '../../data-access/mission.store';
import { UserMissionsStore } from '../../data-access/user-missions.store';
import { PubStore } from '@/app/pubs/data-access/pub.store';
import { Mission } from '../../utils/mission.model';
import { PubChipComponent } from '../../ui/pub-chip/pub-chip.component';

@Component({
  selector: 'app-mission-detail',
  imports: [
    ButtonComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PubChipComponent
],
  template: `
    <section class="mission-detail-page">
      @if (isDataLoading()) {
        <app-loading-state text="Loading mission details..." />
      } @else if (dataError()) {
        <app-error-state 
          [message]="dataError()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="retryLoad()"
        />
      } @else if (!missionId() || !mission()) {
        <app-empty-state 
          icon="🎯"
          title="Mission not found"
          subtitle="The mission you're looking for doesn't exist"
          [showAction]="true"
          actionText="← Back to Missions"
          (action)="goBack()"
        />
      } @else {
        <!-- Header with Back Button -->
        <header class="mission-header">
          <app-button variant="ghost" [size]="ButtonSize.SMALL" (onClick)="goBack()">
            ← Back to Missions
          </app-button>
          
          <!-- Mission Hero Section -->
          <div class="mission-hero">
            <div class="mission-icon">
              {{ mission()!.emoji || '🎯' }}
            </div>
            <div class="mission-info">
              <h1>{{ mission()!.name }}</h1>
              <p class="mission-description">{{ mission()!.description }}</p>
              
              <!-- Mission Metadata -->
              <div class="mission-meta">
                @if (mission()!.category) {
                  <span class="meta-badge category">{{ mission()!.category }}</span>
                }
                @if (mission()!.difficulty) {
                  <span class="meta-badge difficulty difficulty--{{ mission()!.difficulty }}">
                    {{ mission()!.difficulty }}
                  </span>
                }
                @if (mission()!.region) {
                  <span class="meta-badge region">{{ mission()!.region }}</span>
                }
              </div>
            </div>
          </div>
        </header>

        <!-- Mission Progress & Actions -->
        <div class="mission-actions">
          @if (userMissionData()) {
            <div class="progress-section">
              <div class="progress-stats">
                <div class="progress-stat">
                  <span class="stat-number">{{ userMissionData()!.completedCount }}</span>
                  <span class="stat-label">Completed</span>
                </div>
                <div class="progress-divider">/</div>
                <div class="progress-stat">
                  <span class="stat-number">{{ mission()!.pubIds.length }}</span>
                  <span class="stat-label">Total Pubs</span>
                </div>
              </div>
              
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
              </div>
              
              @if (userMissionData()!.isCompleted) {
                <div class="status-badge status-badge--completed">
                  ✅ Mission Completed!
                </div>
              } @else if (userMissionData()!.isActive) {
                <div class="status-badge status-badge--active">
                  🔥 Mission Active
                </div>
              } @else {
                <app-button 
                  variant="primary" 
                  [size]="ButtonSize.LARGE" 
                  (onClick)="joinMission()"
                >
                  🎯 Join Mission
                </app-button>
              }
            </div>
          } @else {
            <app-button 
              variant="primary" 
              [size]="ButtonSize.LARGE" 
              (onClick)="joinMission()"
            >
              🎯 Join Mission
            </app-button>
          }
        </div>

        <!-- Main Content Sections -->
        <div class="content-sections">
          <!-- Mission Details Section -->
          <section class="content-section">
            <h2>Mission Details</h2>
            <div class="mission-details">
              @if (mission()!.pointsReward) {
                <div class="detail-item">
                  <span class="detail-label">Points Reward</span>
                  <span class="detail-value">{{ mission()!.pointsReward }} pts</span>
                </div>
              }
              @if (mission()!.timeLimitHours) {
                <div class="detail-item">
                  <span class="detail-label">Time Limit</span>
                  <span class="detail-value">{{ mission()!.timeLimitHours }} hours</span>
                </div>
              }
              @if (mission()!.requiredPubs) {
                <div class="detail-item">
                  <span class="detail-label">Required Pubs</span>
                  <span class="detail-value">{{ mission()!.requiredPubs }} of {{ mission()!.totalPubs || mission()!.pubIds.length }}</span>
                </div>
              }
              @if (mission()!.subcategory) {
                <div class="detail-item">
                  <span class="detail-label">Theme</span>
                  <span class="detail-value">{{ mission()!.subcategory }}</span>
                </div>
              }
              @if (mission()!.country) {
                <div class="detail-item">
                  <span class="detail-label">Country</span>
                  <span class="detail-value">{{ mission()!.country }}</span>
                </div>
              }
            </div>
          </section>

          <!-- Pubs in Mission Section -->
          <section class="content-section">
            <h2>Pubs in This Mission ({{ mission()!.pubIds.length }})</h2>
            @if (missionPubs().length === 0) {
              <app-loading-state text="Loading pubs..." />
            } @else {
              <div class="pubs-grid">
                @for (pub of missionPubs(); track pub.id) {
                  <app-pub-chip 
                    [pub]="pub"
                    [hasVisited]="isUserCheckedIn(pub.id)"
                    (click)="onPubClicked(pub)"
                  />
                }
              </div>
            }
          </section>
        </div>
      }
    </section>
  `,
  styles: [`
    .mission-detail-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 0;
      background: var(--background);
      color: var(--text);
      min-height: 100vh;
    }

    /* Header */
    .mission-header {
      position: relative;
      margin-bottom: 1rem;
      padding: 1rem;
    }

    .mission-hero {
      display: flex;
      align-items: flex-start;
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .mission-icon {
      font-size: 4rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .mission-info {
      flex: 1;
    }

    .mission-info h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: var(--text);
    }

    .mission-description {
      font-size: 1.125rem;
      line-height: 1.6;
      color: var(--text-secondary);
      margin: 0 0 1rem;
    }

    .mission-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .meta-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .meta-badge.category {
      background: var(--primary);
      color: var(--primary-contrast);
    }

    .meta-badge.difficulty {
      border: 1px solid var(--border);
      background: var(--background-lighter);
      color: var(--text);
    }

    .meta-badge.difficulty--easy {
      background: var(--success);
      color: var(--background);
      border-color: var(--success);
    }

    .meta-badge.difficulty--medium {
      background: var(--warning);
      color: var(--background);
      border-color: var(--warning);
    }

    .meta-badge.difficulty--hard,
    .meta-badge.difficulty--extreme {
      background: var(--error);
      color: var(--background);
      border-color: var(--error);
    }

    .meta-badge.region {
      background: var(--background-darker);
      color: var(--text-secondary);
      border: 1px solid var(--border);
    }

    /* Mission Actions */
    .mission-actions {
      margin: 1.5rem 1rem;
    }

    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .progress-stats {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .progress-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .progress-divider {
      font-size: 1.5rem;
      color: var(--text-muted);
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--background-darker);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--primary);
      transition: width 0.3s ease;
    }

    .status-badge {
      padding: 0.75rem 1.25rem;
      border-radius: 25px;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: center;
      border: 1px solid var(--border);
    }

    .status-badge--completed {
      background: var(--success);
      color: var(--background);
      border-color: var(--success);
    }

    .status-badge--active {
      background: var(--warning);
      color: var(--background);
      border-color: var(--warning);
    }

    /* Content Sections */
    .content-sections {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0 1rem 2rem;
    }

    .content-section {
      background: var(--background-lighter);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
    }

    .content-section h2 {
      margin: 0 0 1rem;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text);
    }

    /* Mission Details */
    .mission-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .detail-value {
      font-weight: 600;
      color: var(--text);
    }

    /* Pubs Grid */
    .pubs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    /* Mobile Optimizations */
    @media (max-width: 768px) {
      .mission-hero {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .mission-icon {
        font-size: 3rem;
      }

      .mission-info h1 {
        font-size: 1.75rem;
      }

      .mission-meta {
        justify-content: center;
      }

      .progress-stats {
        flex-direction: column;
        gap: 0.5rem;
      }

      .progress-divider {
        display: none;
      }

      .pubs-grid {
        grid-template-columns: 1fr;
      }

      .content-sections {
        padding: 0 0.75rem 1.5rem;
      }

      .detail-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }
    }
  `]
})
export class MissionDetailComponent extends BaseComponent {
  private readonly missionStore = inject(MissionStore);
  private readonly userMissionsStore = inject(UserMissionsStore);
  private readonly pubStore = inject(PubStore);
  protected override readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly ButtonSize = ButtonSize;

  // Route parameter
  protected readonly missionId = computed(() => this.route.snapshot.paramMap.get('missionId') || '');

  // Mission data
  protected readonly mission = computed(() => {
    const id = this.missionId();
    if (!id) return null;
    return this.missionStore.getMissionById(id);
  });

  // User mission data
  protected readonly userMissionData = computed(() => {
    const missionId = this.missionId();
    if (!missionId) return null;
    
    // Check if mission is in active missions
    const activeMissions = this.userMissionsStore.activeMissions();
    const activeData = activeMissions.find(m => m.mission.id === missionId);
    if (activeData) {
      return {
        isActive: true,
        isCompleted: false,
        completedCount: activeData.completedCount,
        completedPubIds: activeData.progress?.completedPubIds || []
      };
    }
    
    // Check if mission is in completed missions
    const completedMissions = this.userMissionsStore.completedMissions();
    const completedData = completedMissions.find(m => m.mission.id === missionId);
    if (completedData) {
      return {
        isActive: false,
        isCompleted: true,
        completedCount: completedData.completedCount,
        completedPubIds: completedData.progress?.completedPubIds || []
      };
    }
    
    // Mission not joined yet
    return null;
  });

  // Progress calculation
  protected readonly progressPercentage = computed(() => {
    const data = this.userMissionData();
    const mission = this.mission();
    if (!data || !mission) return 0;
    return Math.round((data.completedCount / mission.pubIds.length) * 100);
  });

  // Pubs in mission
  protected readonly missionPubs = computed(() => {
    const mission = this.mission();
    if (!mission) return [];
    
    const allPubs = this.pubStore.pubs();
    return mission.pubIds
      .map(pubId => allPubs.find(pub => pub.id === pubId))
      .filter((pub): pub is NonNullable<typeof pub> => pub !== undefined);
  });

  // Loading and error states
  protected readonly isDataLoading = computed(() => 
    this.missionStore.loading() || this.userMissionsStore.loading() || this.pubStore.loading()
  );

  protected readonly dataError = computed(() => {
    const missionError = this.missionStore.error();
    const userError = this.userMissionsStore.error();
    const pubError = this.pubStore.error();
    
    if (missionError) return String(missionError);
    if (userError) return String(userError);
    if (pubError) return String(pubError);
    
    return null;
  });

  protected override onInit(): void {
    this.missionStore.loadOnce();
    this.pubStore.loadOnce();
    // UserMissionsStore loads automatically via auth effects
  }

  retryLoad(): void {
    this.missionStore.loadOnce();
    this.pubStore.loadOnce();
    // UserMissionsStore loads automatically via auth effects
  }

  goBack(): void {
    this.router.navigate(['/missions']);
  }

  async joinMission(): Promise<void> {
    const missionId = this.missionId();
    if (!missionId) return;
    
    try {
      console.log('[MissionDetail] Joining mission:', missionId);
      await this.userMissionsStore.enrollInMission(missionId);
      console.log('[MissionDetail] Successfully joined mission:', missionId);
    } catch (error) {
      console.error('[MissionDetail] Failed to join mission:', error);
      // Error handling is already done in the store
    }
  }

  isUserCheckedIn(pubId: string): boolean {
    const data = this.userMissionData();
    if (!data) return false;
    return data.completedPubIds.includes(pubId);
  }

  onPubClicked(pub: any): void {
    this.router.navigate(['/pubs', pub.id]);
  }
}