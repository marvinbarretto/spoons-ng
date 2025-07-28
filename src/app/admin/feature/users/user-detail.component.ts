import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import {
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '@fourfold/angular-foundation';
import { CheckInService } from '../../../check-in/data-access/check-in.service';
import type { CheckIn } from '../../../check-in/utils/check-in.models';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { BaseComponent } from '../../../shared/base/base.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { DataTableComponent } from '../../../shared/ui/data-table/data-table.component';
import type { TableColumn } from '../../../shared/ui/data-table/data-table.model';
import { PubSelectorComponent } from '../../../shared/ui/pub-selector/pub-selector.component';
import { UserService } from '../../../users/data-access/user.service';
import { UserStore } from '../../../users/data-access/user.store';
import {
  CollectionBrowserService,
  type UserDataAcrossCollections,
} from '../../data-access/collection-browser.service';
import { AdminCheckinService } from '../admin-checkins/admin-checkin.service';

type CheckInWithDetails = CheckIn & {
  pubName?: string;
  formattedDate?: string;
  pointsDisplay?: string;
};

@Component({
  selector: 'app-admin-user-detail',
  imports: [
    CommonModule,
    FormsModule,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ButtonComponent,
    DataTableComponent,
    PubSelectorComponent,
  ],
  template: `
    <div class="user-detail">
      <!-- Header with back navigation -->
      <header class="detail-header">
        <app-button variant="secondary" size="sm" (onClick)="navigateBack()">
          ← Back to Users
        </app-button>

        @if (selectedUser(); as user) {
          <div class="user-title">
            <h1>👤 {{ user.displayName }}</h1>
            <p class="user-subtitle">{{ user.email || 'No email' }}</p>
          </div>
        }
      </header>

      <!-- Loading/Error States -->
      @if (loading()) {
        <ff-loading-state text="Loading user details..." />
      } @else if (error()) {
        <ff-error-state
          [message]="error()!"
          [showRetry]="true"
          retryText="Try Again"
          (retry)="handleRetry()"
        />
      } @else if (!selectedUser()) {
        <ff-empty-state
          icon="❓"
          title="User not found"
          subtitle="The requested user could not be found"
          [showAction]="true"
          actionText="Back to Users"
          (action)="navigateBack()"
        />
      } @else {
        <!-- User Details -->
        @if (selectedUser(); as user) {
          <div class="user-content">
            <!-- Basic Info Section -->
            <section class="info-section">
              <div class="section-header-with-avatar">
                <div class="avatar-section">
                  @if (user.photoURL && !imageError()) {
                    <img
                      [src]="user.photoURL"
                      [alt]="user.displayName + ' profile photo'"
                      class="user-avatar"
                      (error)="onImageError($event)"
                    />
                  } @else {
                    <div class="avatar-placeholder">
                      {{ getInitials(user.displayName) }}
                    </div>
                  }
                </div>
                <div class="section-title">
                  <h2>👤 Basic Information</h2>
                </div>
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <label>User ID</label>
                  <span class="monospace">{{ user.uid }}</span>
                </div>
                <div class="info-item">
                  <label>Display Name</label>
                  <span>{{ user.displayName }}</span>
                </div>
                <div class="info-item">
                  <label>Email</label>
                  <span>{{ user.email || 'Not provided' }}</span>
                </div>
                <div class="info-item">
                  <label>Email Verified</label>
                  <span class="status" [class]="user.emailVerified ? 'verified' : 'unverified'">
                    {{ user.emailVerified ? '✅ Verified' : '❌ Unverified' }}
                  </span>
                </div>
                <div class="info-item">
                  <label>Account Type</label>
                  <span class="status" [class]="user.isAnonymous ? 'anonymous' : 'registered'">
                    {{ user.isAnonymous ? '👻 Anonymous' : '✅ Registered' }}
                  </span>
                </div>
                <div class="info-item">
                  <label>Join Date</label>
                  <span>{{ formatDate(user.joinedAt) }}</span>
                </div>
                @if (user.isAdmin) {
                  <div class="info-item">
                    <label>Admin Status</label>
                    <span class="status admin">👑 Administrator</span>
                  </div>
                }

                <!-- Home Pub Information -->
                <div class="info-item home-pub-info">
                  <label>Home Pub</label>
                  @if (!editingHomePub()) {
                    <div class="home-pub-display-inline">
                      @if (user.homePubId && homePubInfo(); as pubInfo) {
                        <div class="home-pub-current">
                          <span class="pub-name-inline">{{ pubInfo.name }}</span>
                          <span class="pub-id-inline monospace">{{ user.homePubId }}</span>
                        </div>
                      } @else {
                        <span class="no-home-pub">No home pub set</span>
                      }
                      <app-button
                        variant="secondary"
                        size="xs"
                        (onClick)="startEditingHomePub()"
                        class="edit-button"
                      >
                        {{ user.homePubId ? 'Change' : 'Set Home Pub' }}
                      </app-button>
                    </div>
                  } @else {
                    <div class="home-pub-edit">
                      <app-pub-selector
                        label=""
                        searchPlaceholder="Search for home pub..."
                        [selectedPubIds]="editHomePubId() ? [editHomePubId()!] : []"
                        (selectionChange)="onHomePubSelection($event)"
                        [maxDisplayResults]="5"
                        class="home-pub-selector"
                      />
                      <div class="edit-actions">
                        <app-button
                          variant="primary"
                          size="xs"
                          [loading]="updatingHomePub()"
                          [disabled]="!editHomePubId()"
                          (onClick)="saveHomePub()"
                        >
                          Save
                        </app-button>
                        <app-button
                          variant="secondary"
                          size="xs"
                          (onClick)="cancelEditingHomePub()"
                          [disabled]="updatingHomePub()"
                        >
                          Cancel
                        </app-button>
                        @if (user.homePubId) {
                          <app-button
                            variant="warning"
                            size="xs"
                            (onClick)="clearHomePub()"
                            [disabled]="updatingHomePub()"
                          >
                            Clear
                          </app-button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </section>

            <!-- Stats Section -->
            <section class="info-section">
              <h2>📊 Statistics</h2>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">{{ user.totalPoints || 0 }}</div>
                  <div class="stat-label">Total Points</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ user.badgeCount || 0 }}</div>
                  <div class="stat-label">Badges Earned</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ user.landlordCount || 0 }}</div>
                  <div class="stat-label">Landlord Positions</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ user.totalPubCount || 0 }}</div>
                  <div class="stat-label">Pubs Visited</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ user.verifiedPubCount || 0 }}</div>
                  <div class="stat-label">Verified Check-ins</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ user.unverifiedPubCount || 0 }}</div>
                  <div class="stat-label">Manual Additions</div>
                </div>
              </div>
            </section>

            <!-- Experience Level Section -->
            @if (user.UserExperienceLevel) {
              <section class="info-section">
                <h2>🎯 Experience Level</h2>
                <div class="experience-card">
                  <div class="level-info">
                    <div class="level-title">{{ user.UserExperienceLevel }}</div>
                    <div class="level-subtitle">Experience Stage</div>
                    <div class="level-description">
                      {{ getExperienceLevelDescription(user.UserExperienceLevel) }}
                    </div>
                  </div>
                </div>
              </section>
            }

            <!-- Activity Section -->
            <section class="info-section">
              <h2>🎯 Activity & Engagement</h2>
              <div class="info-grid">
                <div class="info-item">
                  <label>Missions Joined</label>
                  <span>{{ (user.joinedMissionIds || []).length }}</span>
                </div>
                <div class="info-item">
                  <label>Onboarding Complete</label>
                  <span
                    class="status"
                    [class]="user.onboardingCompleted ? 'complete' : 'incomplete'"
                  >
                    {{ user.onboardingCompleted ? '✅ Complete' : '⏳ Incomplete' }}
                  </span>
                </div>
                <div class="info-item">
                  <label>Real User</label>
                  <span class="status" [class]="user.realUser ? 'real' : 'test'">
                    {{ user.realUser ? '✅ Real User' : '🧪 Test User' }}
                  </span>
                </div>
              </div>
            </section>

            <!-- Badge IDs Section -->
            @if (user.badgeIds && user.badgeIds.length > 0) {
              <section class="info-section">
                <h2>🏆 Badge IDs</h2>
                <div class="badge-list">
                  @for (badgeId of user.badgeIds; track badgeId) {
                    <span class="badge-id">{{ badgeId }}</span>
                  }
                </div>
              </section>
            }

            <!-- Landlord Positions -->
            @if (user.landlordPubIds && user.landlordPubIds.length > 0) {
              <section class="info-section">
                <h2>🏠 Landlord Positions</h2>
                <div class="pub-list">
                  @for (pubId of user.landlordPubIds; track pubId) {
                    <span class="pub-id">{{ pubId }}</span>
                  }
                </div>
              </section>
            }

            <!-- Check-ins Section -->
            <section class="info-section">
              <div class="section-header">
                <h2>🍺 User Check-ins</h2>
                <app-button variant="primary" size="sm" (onClick)="openCreateCheckinModal()">
                  Create Check-in
                </app-button>
              </div>

              <!-- Check-ins Stats -->
              @if (checkInStats(); as stats) {
                <div class="checkin-stats">
                  <div class="stat-row">
                    <div class="stat-item">
                      <span class="stat-value">{{ stats.totalCheckIns }}</span>
                      <span class="stat-label">Total Check-ins</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ stats.totalPoints }}</span>
                      <span class="stat-label">Total Points</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ stats.uniquePubs }}</span>
                      <span class="stat-label">Unique Pubs</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ stats.recentCheckIns }}</span>
                      <span class="stat-label">Last 30 Days</span>
                    </div>
                  </div>
                </div>
              }

              <!-- Check-ins Table -->
              <div class="checkins-table">
                @if (checkInsLoading()) {
                  <ff-loading-state text="Loading check-ins..." />
                } @else if (userCheckIns().length === 0) {
                  <ff-empty-state
                    icon="🍺"
                    title="No check-ins yet"
                    subtitle="This user hasn't checked into any pubs"
                    [showAction]="true"
                    actionText="Create First Check-in"
                    (action)="openCreateCheckinModal()"
                  />
                } @else {
                  <app-data-table
                    [data]="enrichedCheckIns()"
                    [columns]="checkInTableColumns"
                    [loading]="checkInsLoading()"
                    trackBy="id"
                  />
                }
              </div>
            </section>

            <!-- Cross-Collection Data Analysis -->
            <section class="info-section">
              <div class="section-header">
                <h2>🔍 Cross-Collection Data Analysis</h2>
                <app-button
                  variant="primary"
                  size="sm"
                  [loading]="crossCollectionLoading()"
                  (onClick)="loadCrossCollectionData()"
                >
                  {{ crossCollectionData() ? 'Refresh' : 'Load' }} Data Analysis
                </app-button>
              </div>

              @if (crossCollectionLoading()) {
                <ff-loading-state text="Analyzing user data across collections..." />
              } @else {
                @if (crossCollectionData(); as data) {
                  <!-- Summary Overview -->
                  <div class="cross-collection-summary">
                    <div class="summary-stats">
                      <div class="summary-stat">
                        <span class="stat-value">{{ data.totalRecords }}</span>
                        <span class="stat-label">Total Records</span>
                      </div>
                      <div class="summary-stat">
                        <span class="stat-value">{{ collectionsWithDataCount() }}</span>
                        <span class="stat-label">Collections with Data</span>
                      </div>
                    </div>
                  </div>

                  <!-- Collection Breakdown -->
                  <div class="collections-breakdown">
                    <h3>📊 Data by Collection</h3>
                    <div class="collection-cards">
                      <!-- Points Transactions -->
                      @if (
                        data.collections['pointsTransactions'] &&
                        data.collections['pointsTransactions'].length > 0
                      ) {
                        <div class="collection-card">
                          <div class="collection-header">
                            <h4>💰 Points Transactions</h4>
                            <span class="collection-count">{{
                              data.summary.pointsTransactions.count
                            }}</span>
                          </div>
                          <div class="collection-details">
                            <p>
                              <strong>Total Points:</strong>
                              {{ data.summary.pointsTransactions.totalPoints }}
                            </p>
                            <p>
                              <strong>Latest:</strong>
                              {{
                                formatCollectionDate(
                                  data.collections['pointsTransactions'][0]?.data?.createdAt
                                )
                              }}
                            </p>
                          </div>
                          <div class="collection-actions">
                            <app-button
                              variant="secondary"
                              size="xs"
                              (onClick)="
                                viewCollectionDetails(
                                  'pointsTransactions',
                                  data.collections['pointsTransactions']
                                )
                              "
                            >
                              View Details
                            </app-button>
                          </div>
                        </div>
                      }

                      <!-- Check-ins -->
                      @if (
                        data.collections['checkins'] && data.collections['checkins'].length > 0
                      ) {
                        <div class="collection-card">
                          <div class="collection-header">
                            <h4>🍺 Check-ins</h4>
                            <span class="collection-count">{{ data.summary.checkins.count }}</span>
                          </div>
                          <div class="collection-details">
                            <p>
                              <strong>Unique Pubs:</strong> {{ data.summary.checkins.uniquePubs }}
                            </p>
                            <p>
                              <strong>Latest:</strong>
                              {{
                                formatCollectionDate(
                                  data.collections['checkins'][0].data?.timestamp
                                )
                              }}
                            </p>
                          </div>
                          <div class="collection-actions">
                            <app-button
                              variant="secondary"
                              size="xs"
                              (onClick)="
                                viewCollectionDetails('checkins', data.collections['checkins'])
                              "
                            >
                              View Details
                            </app-button>
                          </div>
                        </div>
                      }

                      <!-- Earned Badges -->
                      @if (
                        data.collections['earnedBadges'] &&
                        data.collections['earnedBadges'].length > 0
                      ) {
                        <div class="collection-card">
                          <div class="collection-header">
                            <h4>🏆 Earned Badges</h4>
                            <span class="collection-count">{{
                              data.summary.earnedBadges.count
                            }}</span>
                          </div>
                          <div class="collection-details">
                            <p><strong>Achievements unlocked</strong></p>
                            <p>
                              <strong>Latest:</strong>
                              {{
                                formatCollectionDate(
                                  data.collections['earnedBadges'][0]?.data?.earnedAt
                                )
                              }}
                            </p>
                          </div>
                          <div class="collection-actions">
                            <app-button
                              variant="secondary"
                              size="xs"
                              (onClick)="
                                viewCollectionDetails(
                                  'earnedBadges',
                                  data.collections['earnedBadges']
                                )
                              "
                            >
                              View Details
                            </app-button>
                          </div>
                        </div>
                      }

                      <!-- Mission Progress -->
                      @if (
                        data.collections['userMissionProgress'] &&
                        data.collections['userMissionProgress'].length > 0
                      ) {
                        <div class="collection-card">
                          <div class="collection-header">
                            <h4>🎯 Mission Progress</h4>
                            <span class="collection-count">{{
                              data.summary.userMissionProgress.count
                            }}</span>
                          </div>
                          <div class="collection-details">
                            <p><strong>Active missions</strong></p>
                          </div>
                          <div class="collection-actions">
                            <app-button
                              variant="secondary"
                              size="xs"
                              (onClick)="
                                viewCollectionDetails(
                                  'userMissionProgress',
                                  data.collections['userMissionProgress']
                                )
                              "
                            >
                              View Details
                            </app-button>
                          </div>
                        </div>
                      }

                      <!-- Landlord Positions -->
                      @if (
                        data.collections['landlords'] && data.collections['landlords'].length > 0
                      ) {
                        <div class="collection-card">
                          <div class="collection-header">
                            <h4>🏠 Landlord Positions</h4>
                            <span class="collection-count">{{ data.summary.landlords.count }}</span>
                          </div>
                          <div class="collection-details">
                            <p><strong>Pub ownership records</strong></p>
                          </div>
                          <div class="collection-actions">
                            <app-button
                              variant="secondary"
                              size="xs"
                              (onClick)="
                                viewCollectionDetails('landlords', data.collections['landlords'])
                              "
                            >
                              View Details
                            </app-button>
                          </div>
                        </div>
                      }

                      <!-- User Events -->
                      @if (
                        data.collections['user-events'] &&
                        data.collections['user-events'].length > 0
                      ) {
                        <div class="collection-card">
                          <div class="collection-header">
                            <h4>📝 User Events</h4>
                            <span class="collection-count">{{
                              data.summary.userEvents.count
                            }}</span>
                          </div>
                          <div class="collection-details">
                            <p><strong>Activity logs</strong></p>
                          </div>
                          <div class="collection-actions">
                            <app-button
                              variant="secondary"
                              size="xs"
                              (onClick)="
                                viewCollectionDetails(
                                  'user-events',
                                  data.collections['user-events']
                                )
                              "
                            >
                              View Details
                            </app-button>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Data Consistency Check -->
                  <div class="data-consistency">
                    <h3>🔧 Data Consistency</h3>
                    <div class="consistency-grid">
                      <div
                        class="consistency-item"
                        [class.inconsistent]="
                          user.totalPoints !== data.summary.pointsTransactions.totalPoints
                        "
                      >
                        <span class="consistency-label">Points Summary vs Transactions:</span>
                        <span class="consistency-values">
                          {{ user.totalPoints || 0 }} vs
                          {{ data.summary.pointsTransactions.totalPoints }}
                          @if (user.totalPoints !== data.summary.pointsTransactions.totalPoints) {
                            <span class="inconsistent-icon">⚠️</span>
                          } @else {
                            <span class="consistent-icon">✅</span>
                          }
                        </span>
                      </div>

                      <div
                        class="consistency-item"
                        [class.inconsistent]="user.verifiedPubCount !== data.summary.checkins.count"
                      >
                        <span class="consistency-label">Pub Count vs Check-ins:</span>
                        <span class="consistency-values">
                          {{ user.verifiedPubCount || 0 }} vs {{ data.summary.checkins.count }}
                          @if (user.verifiedPubCount !== data.summary.checkins.count) {
                            <span class="inconsistent-icon">⚠️</span>
                          } @else {
                            <span class="consistent-icon">✅</span>
                          }
                        </span>
                      </div>

                      <div
                        class="consistency-item"
                        [class.inconsistent]="user.badgeCount !== data.summary.earnedBadges.count"
                      >
                        <span class="consistency-label">Badge Count vs Earned:</span>
                        <span class="consistency-values">
                          {{ user.badgeCount || 0 }} vs {{ data.summary.earnedBadges.count }}
                          @if (user.badgeCount !== data.summary.earnedBadges.count) {
                            <span class="inconsistent-icon">⚠️</span>
                          } @else {
                            <span class="consistent-icon">✅</span>
                          }
                        </span>
                      </div>
                    </div>

                    @if (hasDataInconsistencies(user, data)) {
                      <div class="consistency-actions">
                        <app-button
                          variant="warning"
                          size="sm"
                          (onClick)="fixUserDataInconsistencies()"
                        >
                          🔧 Fix Data Inconsistencies
                        </app-button>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="no-analysis">
                    <p>
                      Click "Load Data Analysis" to analyze this user's data across all collections.
                    </p>
                    <p><strong>This will help identify:</strong></p>
                    <ul>
                      <li>Orphaned data in other collections</li>
                      <li>Inconsistencies between summary fields and actual data</li>
                      <li>Complete activity history across the system</li>
                    </ul>
                  </div>
                }
              }
            </section>

            <!-- Raw Data Section (Developer Debug) -->
            <details class="raw-data">
              <summary>🔍 Raw User Data (Debug)</summary>
              <pre class="json-dump">{{ formatJSON(user) }}</pre>
            </details>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .user-detail {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .detail-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }

    .user-title h1 {
      margin: 0;
      color: var(--text);
      font-size: clamp(1.5rem, 4vw, 2rem);
    }

    .user-subtitle {
      margin: 0.25rem 0 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .user-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .info-section {
      background: var(--background-lighter);
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid var(--border);
    }

    .info-section h2 {
      margin: 0 0 1.5rem;
      color: var(--text);
      font-size: 1.25rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
    }

    .section-header-with-avatar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .avatar-section {
      flex-shrink: 0;
    }

    .user-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--border);
      background: var(--background-lighter);
    }

    .avatar-placeholder {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--primary);
      color: var(--background);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1.25rem;
      border: 2px solid var(--border);
    }

    .section-title {
      flex: 1;
    }

    .section-title h2 {
      margin: 0;
      border: none;
      padding: 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-item label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .info-item span {
      color: var(--text);
      font-size: 0.95rem;
    }

    .monospace {
      font-family: 'Courier New', monospace;
      font-size: 0.85rem !important;
      background: var(--background-darker);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--border);
    }

    .status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem !important;
      font-weight: 600;
    }

    .status.verified {
      background: var(--success);
      color: var(--background);
    }
    .status.unverified {
      background: var(--error);
      color: var(--background);
    }
    .status.registered {
      background: var(--primary);
      color: var(--background);
    }
    .status.anonymous {
      background: var(--warning);
      color: var(--background);
    }
    .status.admin {
      background: var(--accent);
      color: var(--background);
    }
    .status.complete {
      background: var(--success);
      color: var(--background);
    }
    .status.incomplete {
      background: var(--warning);
      color: var(--background);
    }
    .status.real {
      background: var(--success);
      color: var(--background);
    }
    .status.test {
      background: var(--info);
      color: var(--background);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: var(--background);
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
      border: 1px solid var(--border);
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .experience-card {
      background: var(--background);
      border-radius: 6px;
      padding: 1.5rem;
      border: 1px solid var(--border);
    }

    .level-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .level-subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .level-description {
      color: var(--text);
      margin-bottom: 1rem;
    }

    .progress-bar {
      background: var(--background-darker);
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      background: var(--primary);
      height: 100%;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 0.85rem;
      color: var(--text-secondary);
      text-align: center;
    }

    .badge-list,
    .pub-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .badge-id,
    .pub-id {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      font-size: 0.8rem;
      font-family: 'Courier New', monospace;
      color: var(--text-secondary);
    }

    .raw-data {
      margin-top: 1rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-header h2 {
      margin: 0;
      color: var(--text);
      font-size: 1.25rem;
    }

    .checkin-stats {
      margin-bottom: 1.5rem;
      background: var(--background);
      border-radius: 6px;
      padding: 1rem;
      border: 1px solid var(--border);
    }

    .stat-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .checkins-table {
      background: var(--background);
      border-radius: 6px;
      padding: 1rem;
      border: 1px solid var(--border);
    }

    .home-pub-display {
      margin-top: 0;
    }

    .home-pub-card {
      background: var(--background);
      border-radius: 8px;
      padding: 1.5rem;
      border: 2px solid var(--primary);
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .home-pub-card.loading {
      border-color: var(--border);
      opacity: 0.7;
    }

    .pub-info {
      flex: 1;
    }

    .pub-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 0.5rem;
    }

    .pub-location {
      color: var(--text-secondary);
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
    }

    .pub-id {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .pub-id .label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .home-pub-badge {
      flex-shrink: 0;
      background: var(--primary);
      color: var(--background);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .badge-text {
      white-space: nowrap;
    }

    .home-pub-info {
      grid-column: 1 / -1; /* Full width */
    }

    .home-pub-display-inline {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .home-pub-current {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .pub-name-inline {
      font-weight: 600;
      color: var(--text);
    }

    .pub-id-inline {
      font-size: 0.8rem !important;
    }

    .no-home-pub {
      color: var(--text-secondary);
      font-style: italic;
      flex: 1;
    }

    .edit-button {
      flex-shrink: 0;
    }

    .home-pub-edit {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .home-pub-selector {
      width: 100%;
    }

    .edit-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .raw-data {
      margin-top: 1rem;
    }

    .raw-data summary {
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 0.9rem;
      padding: 0.5rem;
      background: var(--background-darker);
      border-radius: 4px;
      border: 1px solid var(--border);
    }

    .json-dump {
      background: var(--background-darkest);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 1rem;
      font-size: 0.8rem;
      overflow-x: auto;
      color: var(--text-secondary);
      margin-top: 0.5rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .user-detail {
        padding: 0.5rem;
      }

      .detail-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .stat-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .section-header-with-avatar {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.75rem;
      }

      .user-avatar,
      .avatar-placeholder {
        width: 50px;
        height: 50px;
        font-size: 1rem;
      }

      .home-pub-card {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
      }

      .home-pub-badge {
        align-self: center;
        margin-top: 1rem;
      }

      .pub-id {
        justify-content: center;
      }
    }

    /* Cross-Collection Data Styles */
    .cross-collection-summary {
      margin-bottom: 1.5rem;
    }

    .summary-stats {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .summary-stat {
      text-align: center;
      padding: 1rem;
      background: var(--background);
      border-radius: 6px;
      border: 1px solid var(--border);
      min-width: 120px;
    }

    .summary-stat .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .summary-stat .stat-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .collections-breakdown {
      margin-bottom: 2rem;
    }

    .collections-breakdown h3 {
      margin: 0 0 1rem;
      color: var(--text);
      font-size: 1.1rem;
    }

    .collection-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .collection-card {
      background: var(--background);
      border-radius: 6px;
      padding: 1rem;
      border: 1px solid var(--border);
    }

    .collection-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .collection-header h4 {
      margin: 0;
      color: var(--text);
      font-size: 1rem;
    }

    .collection-count {
      background: var(--primary);
      color: var(--background);
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .collection-details {
      margin-bottom: 1rem;
    }

    .collection-details p {
      margin: 0.25rem 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .collection-actions {
      display: flex;
      justify-content: flex-end;
    }

    .data-consistency {
      background: var(--background);
      border-radius: 6px;
      padding: 1rem;
      border: 1px solid var(--border);
    }

    .data-consistency h3 {
      margin: 0 0 1rem;
      color: var(--text);
      font-size: 1.1rem;
    }

    .consistency-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .consistency-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-radius: 4px;
      background: var(--background-lighter);
      border: 1px solid var(--border);
    }

    .consistency-item.inconsistent {
      background: color-mix(in srgb, var(--warning) 10%, var(--background-lighter));
      border-color: var(--warning);
    }

    .consistency-label {
      font-weight: 500;
      color: var(--text);
    }

    .consistency-values {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .inconsistent-icon {
      color: var(--warning);
    }

    .consistent-icon {
      color: var(--success);
    }

    .consistency-actions {
      display: flex;
      justify-content: center;
    }

    .no-analysis {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    .no-analysis p {
      margin: 0.5rem 0;
    }

    .no-analysis ul {
      text-align: left;
      max-width: 400px;
      margin: 1rem auto;
    }

    /* Mobile responsive for cross-collection */
    @media (max-width: 768px) {
      .summary-stats {
        flex-direction: column;
      }

      .collection-cards {
        grid-template-columns: 1fr;
      }

      .consistency-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .consistency-values {
        align-self: flex-end;
      }
    }
  `,
})
export class AdminUserDetailComponent extends BaseComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  // User data management - UserStore for reactive data, UserService for admin updates
  private readonly userStore = inject(UserStore); // Reactive user data and general operations
  private readonly userService = inject(UserService); // Direct admin operations (can update any user)

  private readonly pubStore = inject(PubStore); // Pub data for enriching home pub info
  private readonly checkInService = inject(CheckInService); // User-specific check-in data
  private readonly adminCheckinService = inject(AdminCheckinService); // Admin check-in operations
  private readonly collectionBrowserService = inject(CollectionBrowserService); // Cross-collection data inspection

  readonly username = signal<string | null>(null);
  readonly userCheckIns = signal<CheckIn[]>([]);
  readonly checkInsLoading = signal(false);
  readonly imageError = signal(false);

  // Cross-collection data
  readonly crossCollectionData = signal<UserDataAcrossCollections | null>(null);
  readonly crossCollectionLoading = signal(false);

  // Home pub editing state
  readonly editingHomePub = signal(false);
  readonly editHomePubId = signal<string | null>(null);
  readonly updatingHomePub = signal(false);

  readonly selectedUser = computed(() => {
    const targetUsername = this.username();
    if (!targetUsername) return null;

    const users = this.userStore.data();
    return users.find(user => user.displayName === targetUsername) || null;
  });

  // Computed property for home pub information
  readonly homePubInfo = computed(() => {
    const user = this.selectedUser();
    if (!user?.homePubId) return null;

    const pubs = this.pubStore.data();
    return pubs.find(pub => pub.id === user.homePubId) || null;
  });

  // Table configuration for check-ins
  readonly checkInTableColumns: TableColumn[] = [
    {
      key: 'pubName',
      label: 'Pub',
      sortable: true,
      className: 'name',
    },
    {
      key: 'formattedDate',
      label: 'Date & Time',
      sortable: true,
      className: 'date',
    },
    {
      key: 'pointsDisplay',
      label: 'Points',
      sortable: true,
      className: 'number points-primary',
    },
  ];

  // Computed enriched check-ins with pub data
  readonly enrichedCheckIns = computed((): CheckInWithDetails[] => {
    const checkIns = this.userCheckIns();
    const pubs = this.pubStore.data();

    return checkIns.map((checkIn: CheckIn) => {
      const pub = pubs.find(p => p.id === checkIn.pubId);

      // Calculate points display with fallback hierarchy
      const pointsEarned = checkIn.pointsEarned;
      const pointsFromBreakdown = checkIn.pointsBreakdown?.total;
      const finalPoints = pointsEarned ?? pointsFromBreakdown ?? 0;

      return {
        ...checkIn,
        pubName: pub?.name || 'Unknown Pub',
        formattedDate: this.formatDateObject(checkIn.timestamp.toDate()),
        pointsDisplay: finalPoints.toString(),
      };
    });
  });

  // Check-in stats
  readonly checkInStats = computed(() => {
    const checkIns = this.userCheckIns();
    if (checkIns.length === 0) return null;

    const totalPoints = checkIns.reduce((sum, checkIn) => {
      const points = checkIn.pointsEarned ?? checkIn.pointsBreakdown?.total ?? 0;
      return sum + points;
    }, 0);

    const uniquePubs = new Set(checkIns.map(c => c.pubId)).size;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentCheckIns = checkIns.filter(c => c.timestamp.toDate() >= thirtyDaysAgo);

    return {
      totalCheckIns: checkIns.length,
      totalPoints,
      uniquePubs,
      recentCheckIns: recentCheckIns.length,
    };
  });

  // Cross-collection data computed properties
  readonly collectionsWithDataCount = computed(() => {
    const data = this.crossCollectionData();
    if (!data) return 0;
    return Object.keys(data.collections).filter(
      key => data.collections[key] && data.collections[key].length > 0
    ).length;
  });

  override async ngOnInit(): Promise<void> {
    // Get username from route params
    this.route.params.subscribe(params => {
      this.username.set(params['username'] || null);
      this.imageError.set(false); // Reset image error when user changes
    });

    // Ensure user and pub data is loaded
    await this.loadUserData();
    await this.loadUserCheckIns();
  }

  private async loadUserData(): Promise<void> {
    await this.handleAsync(
      async () => {
        await Promise.all([
          this.userStore.refresh(),
          this.pubStore.loadOnce(), // Load pub data for enriching check-ins
        ]);
      },
      {
        errorMessage: 'Failed to load user data',
      }
    );
  }

  private async loadUserCheckIns(): Promise<void> {
    const user = this.selectedUser();
    if (!user) return;

    this.checkInsLoading.set(true);

    try {
      const checkIns = await this.checkInService.loadUserCheckins(user.uid);
      this.userCheckIns.set(checkIns);
    } catch (error) {
      console.error('[UserDetail] Failed to load user check-ins:', error);
      this.showError('Failed to load user check-ins');
    } finally {
      this.checkInsLoading.set(false);
    }
  }

  async handleRetry(): Promise<void> {
    await this.loadUserData();
    await this.loadUserCheckIns();
  }

  navigateBack(): void {
    this.router.navigate(['/admin/users']);
  }

  openCreateCheckinModal(): void {
    const user = this.selectedUser();
    if (!user) {
      this.showError('No user selected');
      return;
    }

    // For now, navigate to the main admin check-ins page
    // TODO: Implement a modal with pre-selected user
    this.router.navigate(['/admin/checkins'], {
      queryParams: {
        preselectedUserId: user.uid,
        preselectedUserName: user.displayName,
      },
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatDateObject(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatJSON(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  getExperienceLevelDescription(level: string): string {
    switch (level) {
      case 'guest':
        return 'Not logged in';
      case 'brandNew':
        return 'New user, ready to start their pub journey';
      case 'firstTime':
        return 'Learning the app with first few check-ins';
      case 'earlyUser':
        return 'Getting familiar with features';
      case 'regularUser':
        return 'Comfortable with core functionality';
      case 'explorer':
        return 'Engaged user exploring many pubs';
      case 'powerUser':
        return 'Expert level user with extensive activity';
      default:
        return 'Unknown experience level';
    }
  }

  getInitials(displayName: string): string {
    if (!displayName) return '?';

    const names = displayName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }

    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  onImageError(event: Event): void {
    console.log('[UserDetail] Profile image failed to load');
    this.imageError.set(true);
  }

  // Home pub editing methods
  startEditingHomePub(): void {
    const user = this.selectedUser();
    this.editHomePubId.set(user?.homePubId || null);
    this.editingHomePub.set(true);
  }

  cancelEditingHomePub(): void {
    this.editingHomePub.set(false);
    this.editHomePubId.set(null);
  }

  onHomePubSelection(selectedPubIds: string[]): void {
    this.editHomePubId.set(selectedPubIds[0] || null);
  }

  async saveHomePub(): Promise<void> {
    const user = this.selectedUser();
    const newHomePubId = this.editHomePubId();

    if (!user || !newHomePubId) {
      this.showError('Please select a pub');
      return;
    }

    this.updatingHomePub.set(true);

    try {
      // Admin pattern: Use UserService directly to update any user's data
      // UserStore.updateProfile() only works for current user, but we need to update a different user
      await this.userService.updateUser(user.uid, { homePubId: newHomePubId });

      // Refresh UserStore to ensure reactive UI updates reflect the change
      await this.userStore.refresh();

      this.showSuccess('Home pub updated successfully');
      this.editingHomePub.set(false);
      this.editHomePubId.set(null);
    } catch (error) {
      console.error('[UserDetail] Failed to update home pub:', error);
      this.showError('Failed to update home pub');
    } finally {
      this.updatingHomePub.set(false);
    }
  }

  async clearHomePub(): Promise<void> {
    const user = this.selectedUser();

    if (!user) {
      this.showError('No user selected');
      return;
    }

    this.updatingHomePub.set(true);

    try {
      // Admin pattern: Use UserService directly to clear any user's home pub
      // UserStore.updateProfile() only works for current user, but we need to update a different user
      await this.userService.updateUser(user.uid, { homePubId: undefined });

      // Refresh UserStore to ensure reactive UI updates reflect the change
      await this.userStore.refresh();

      this.showSuccess('Home pub cleared successfully');
      this.editingHomePub.set(false);
      this.editHomePubId.set(null);
    } catch (error) {
      console.error('[UserDetail] Failed to clear home pub:', error);
      this.showError('Failed to clear home pub');
    } finally {
      this.updatingHomePub.set(false);
    }
  }

  // Cross-collection data methods
  async loadCrossCollectionData(): Promise<void> {
    const user = this.selectedUser();
    if (!user) {
      this.showError('No user selected');
      return;
    }

    this.crossCollectionLoading.set(true);

    try {
      console.log(`[UserDetail] Loading cross-collection data for user: ${user.uid}`);
      const data = await this.collectionBrowserService.getUserDataAcrossCollections(user.uid);
      this.crossCollectionData.set(data);
      console.log(`[UserDetail] Cross-collection data loaded:`, data);
    } catch (error: any) {
      console.error('[UserDetail] Failed to load cross-collection data:', error);
      this.showError(`Failed to load cross-collection data: ${error?.message || 'Unknown error'}`);
    } finally {
      this.crossCollectionLoading.set(false);
    }
  }

  viewCollectionDetails(collectionName: string, records: any[]): void {
    // For now, just log the details. In the future, this could open a modal or navigate to a detail view
    console.log(`[UserDetail] Collection ${collectionName} details:`, records);
    this.showSuccess(`Collection details logged to console (${records.length} records)`);

    // Future enhancement: Open a modal with detailed table view
    // this.openCollectionDetailModal(collectionName, records);
  }

  hasDataInconsistencies(user: any, data: UserDataAcrossCollections): boolean {
    return (
      (user.totalPoints || 0) !== data.summary.pointsTransactions.totalPoints ||
      (user.verifiedPubCount || 0) !== data.summary.checkins.count ||
      (user.badgeCount || 0) !== data.summary.earnedBadges.count
    );
  }

  async fixUserDataInconsistencies(): Promise<void> {
    const user = this.selectedUser();
    const data = this.crossCollectionData();

    if (!user || !data) {
      this.showError('No user or cross-collection data available');
      return;
    }

    if (
      !confirm(
        '🔧 Fix data inconsistencies?\n\nThis will update the user summary fields to match the calculated values from actual transactions and records.\n\nContinue?'
      )
    ) {
      return;
    }

    try {
      const updates: Partial<any> = {
        totalPoints: data.summary.pointsTransactions.totalPoints,
        verifiedPubCount: data.summary.checkins.count,
        badgeCount: data.summary.earnedBadges.count,
        totalPubCount: data.summary.checkins.count + (user.unverifiedPubCount || 0),
      };

      await this.userService.updateUser(user.uid, updates);
      await this.userStore.refresh();

      // Refresh cross-collection data to show updated consistency
      await this.loadCrossCollectionData();

      this.showSuccess('✅ Data inconsistencies fixed successfully');
    } catch (error: any) {
      console.error('[UserDetail] Failed to fix data inconsistencies:', error);
      this.showError(`Failed to fix data inconsistencies: ${error?.message || 'Unknown error'}`);
    }
  }

  formatCollectionDate(timestamp: any): string {
    if (!timestamp) return 'Unknown';

    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  getObjectKeys(obj: Record<string, any>): string[] {
    return Object.keys(obj);
  }
}
