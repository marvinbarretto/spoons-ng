// src/app/admin/feature/admin-errors/admin-errors.component.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ErrorLoggingService, type SystemError, type ErrorCategory, type ErrorSeverity } from '../../../shared/data-access/error-logging.service';

@Component({
  selector: 'app-admin-errors',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="admin-errors">
      <header class="errors-header">
        <h1>System Error Logs</h1>
        <p class="errors-subtitle">Monitor and resolve system errors and failures</p>
        
        <div class="error-stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ errorStats().totalErrors }}</div>
            <div class="stat-label">Total Errors</div>
          </div>
          <div class="stat-card critical">
            <div class="stat-value">{{ errorStats().criticalErrors }}</div>
            <div class="stat-label">Critical Errors</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">{{ errorStats().unresolvedErrors }}</div>
            <div class="stat-label">Unresolved</div>
          </div>
          <div class="stat-card info">
            <div class="stat-value">{{ errorStats().recentErrors }}</div>
            <div class="stat-label">Last 24h</div>
          </div>
        </div>
      </header>

      <!-- Error Categories -->
      <section class="error-categories">
        <h2>Error Categories</h2>
        <div class="categories-grid">
          @for (category of topCategories(); track category.category) {
            <div class="category-card" [class]="'category-' + category.category">
              <div class="category-icon">{{ getCategoryIcon(category.category) }}</div>
              <div class="category-name">{{ category.category }}</div>
              <div class="category-count">{{ category.count }}</div>
            </div>
          }
        </div>
      </section>

      <!-- Filters -->
      <section class="error-filters">
        <h2>Filter Errors</h2>
        <div class="filter-controls">
          <select [(ngModel)]="selectedCategory" (change)="onFilterChange()">
            <option value="">All Categories</option>
            <option value="check-in">Check-in</option>
            <option value="points">Points</option>
            <option value="badges">Badges</option>
            <option value="landlord">Landlord</option>
            <option value="missions">Missions</option>
            <option value="auth">Authentication</option>
            <option value="database">Database</option>
            <option value="network">Network</option>
            <option value="validation">Validation</option>
            <option value="unknown">Unknown</option>
          </select>
          
          <select [(ngModel)]="selectedSeverity" (change)="onFilterChange()">
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          
          <label>
            <input type="checkbox" [(ngModel)]="showOnlyUnresolved" (change)="onFilterChange()">
            Show only unresolved
          </label>
          
          <button (click)="refreshErrors()" [disabled]="loading()">
            {{ loading() ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
      </section>

      <!-- Error List -->
      <section class="error-list">
        <h2>Recent Errors ({{ filteredErrors().length }})</h2>
        @if (loading()) {
          <div class="loading-state">Loading errors...</div>
        } @else if (filteredErrors().length === 0) {
          <div class="empty-state">
            <p>No errors found matching your filters.</p>
          </div>
        } @else {
          <div class="errors-table">
            @for (error of filteredErrors(); track error.id) {
              <div class="error-row" [class]="'severity-' + error.severity">
                <div class="error-main">
                  <div class="error-header">
                    <span class="error-category badge" [class]="'badge-' + error.category">
                      {{ error.category }}
                    </span>
                    <span class="error-severity badge" [class]="'badge-' + error.severity">
                      {{ error.severity }}
                    </span>
                    <span class="error-timestamp">
                      {{ formatTimestamp(error.timestamp) }}
                    </span>
                    @if (error.resolved) {
                      <span class="error-status badge badge-resolved">✅ Resolved</span>
                    } @else {
                      <span class="error-status badge badge-unresolved">🔴 Unresolved</span>
                    }
                  </div>
                  
                  <div class="error-operation">
                    <strong>{{ error.operation }}</strong>
                  </div>
                  
                  <div class="error-message">
                    {{ error.message }}
                  </div>
                  
                  @if (error.userId) {
                    <div class="error-user">
                      User: {{ error.userDisplayName || 'Unknown' }} ({{ error.userId.slice(0, 8) }})
                      @if (error.isAnonymous) {
                        <span class="badge badge-anonymous">Anonymous</span>
                      }
                    </div>
                  }
                </div>
                
                <div class="error-actions">
                  <button (click)="toggleErrorDetails(error.id)" 
                          class="btn-secondary btn-sm">
                    {{ expandedErrors.has(error.id) ? 'Hide' : 'Show' }} Details
                  </button>
                  
                  @if (!error.resolved) {
                    <button (click)="resolveError(error)" 
                            class="btn-primary btn-sm">
                      Mark Resolved
                    </button>
                  }
                </div>
                
                @if (expandedErrors.has(error.id)) {
                  <div class="error-details">
                    @if (error.stackTrace) {
                      <div class="error-section">
                        <h4>Stack Trace</h4>
                        <pre class="stack-trace">{{ error.stackTrace }}</pre>
                      </div>
                    }
                    
                    @if (error.operationContext) {
                      <div class="error-section">
                        <h4>Operation Context</h4>
                        <pre class="context-data">{{ formatJSON(error.operationContext) }}</pre>
                      </div>
                    }
                    
                    <div class="error-section">
                      <h4>System Context</h4>
                      <div class="context-grid">
                        <div><strong>URL:</strong> {{ error.url || 'N/A' }}</div>
                        <div><strong>User Agent:</strong> {{ error.userAgent || 'N/A' }}</div>
                        <div><strong>Error ID:</strong> {{ error.id }}</div>
                        <div><strong>Timestamp:</strong> {{ error.timestamp.toDate().toISOString() }}</div>
                      </div>
                    </div>
                    
                    @if (error.resolved && error.resolution) {
                      <div class="error-section">
                        <h4>Resolution</h4>
                        <p><strong>Resolved by:</strong> {{ error.resolvedBy }}</p>
                        <p><strong>Resolution:</strong> {{ error.resolution }}</p>
                        <p><strong>Resolved at:</strong> {{ error.resolvedAt?.toDate()?.toISOString() }}</p>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styleUrl: './admin-errors.component.scss'
})
export class AdminErrorsComponent implements OnInit {
  private readonly errorLoggingService = inject(ErrorLoggingService);
  
  // Filter state
  selectedCategory = '';
  selectedSeverity = '';
  showOnlyUnresolved = false;
  
  // UI state
  expandedErrors = new Set<string>();
  
  // Data from service
  readonly errors = this.errorLoggingService.recentErrors;
  readonly loading = this.errorLoggingService.loading;
  
  // Computed properties
  readonly errorStats = computed(() => this.errorLoggingService.getErrorStats());
  
  readonly topCategories = computed(() => {
    const stats = this.errorStats();
    return stats.topCategories;
  });
  
  readonly filteredErrors = computed(() => {
    let filtered = this.errors();
    
    if (this.selectedCategory) {
      filtered = filtered.filter(error => error.category === this.selectedCategory);
    }
    
    if (this.selectedSeverity) {
      filtered = filtered.filter(error => error.severity === this.selectedSeverity);
    }
    
    if (this.showOnlyUnresolved) {
      filtered = filtered.filter(error => !error.resolved);
    }
    
    return filtered;
  });

  async ngOnInit() {
    await this.refreshErrors();
  }

  async refreshErrors() {
    try {
      await this.errorLoggingService.loadRecentErrors();
    } catch (error) {
      console.error('[AdminErrorsComponent] Failed to load errors:', error);
    }
  }

  onFilterChange() {
    // Filters are reactive through computed properties
    console.log('[AdminErrorsComponent] Filters changed:', {
      category: this.selectedCategory,
      severity: this.selectedSeverity,
      unresolved: this.showOnlyUnresolved
    });
  }

  toggleErrorDetails(errorId: string) {
    if (this.expandedErrors.has(errorId)) {
      this.expandedErrors.delete(errorId);
    } else {
      this.expandedErrors.add(errorId);
    }
  }

  async resolveError(error: SystemError) {
    const resolution = prompt('Enter resolution notes:');
    if (!resolution) return;

    try {
      await this.errorLoggingService.resolveError(error.id, resolution);
      console.log(`[AdminErrorsComponent] Error ${error.id} marked as resolved`);
    } catch (err) {
      console.error('[AdminErrorsComponent] Failed to resolve error:', err);
      alert('Failed to mark error as resolved');
    }
  }

  getCategoryIcon(category: ErrorCategory): string {
    const icons: Record<ErrorCategory, string> = {
      'check-in': '🍺',
      'points': '🎯',
      'badges': '🏆',
      'landlord': '👑',
      'missions': '🎯',
      'auth': '🔐',
      'database': '💾',
      'network': '🌐',
      'validation': '✅',
      'unknown': '❓'
    };
    return icons[category] || '❓';
  }

  formatTimestamp(timestamp: any): string {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  }

  formatJSON(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return 'Invalid JSON';
    }
  }
}