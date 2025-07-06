import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { BadgeIconComponent } from '../../ui/badge-icon/badge-icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ButtonSize } from '../../../shared/ui/button/button.params';
import type { Badge } from '../../utils/badge.model';
import { BadgeFormComponent } from '../../ui/badge-form/badge-form.component';
import { OverlayService } from '../../../shared/data-access/overlay.service';
import { BadgeStore } from '../../data-access/badge.store';

@Component({
  selector: 'app-badge-admin-page',
  imports: [BadgeIconComponent, ButtonComponent],
  template: `
    <div class="admin-container">
      <header class="admin-header">
        <h1>Badge Administration</h1>
        <app-button variant="primary" (onClick)="createBadge()">
          + Create New Badge
        </app-button>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <p>Loading badges...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p>Error: {{ error() }}</p>
          <app-button variant="secondary" (onClick)="retry()">Retry</app-button>
        </div>
      } @else if (badges().length === 0) {
        <div class="empty-state">
          <p>No badges created yet.</p>
          <app-button variant="primary" (onClick)="createBadge()">
            Create your first badge
          </app-button>
        </div>
      } @else {
        <div class="table-container">
          <table class="badges-table">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Name</th>
                <th>Description</th>
                <th>Criteria</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (badge of badges(); track badge.id) {
                <tr>
                  <td class="icon-cell">
                    <app-badge-icon [badge]="badge" />
                  </td>
                  <td class="name-cell">{{ badge.name }}</td>
                  <td class="description-cell">{{ badge.description }}</td>
                  <td class="criteria-cell">
                    <code>{{ badge.criteria }}</code>
                  </td>
                  <td class="actions-cell">
                    <app-button
                      variant="secondary"
                      [size]="ButtonSize.SMALL"
                      (onClick)="editBadge(badge)"
                    >
                      Edit
                    </app-button>
                    <app-button
                      variant="danger"
                      [size]="ButtonSize.SMALL"
                      (onClick)="deleteBadge(badge)"
                    >
                      Delete
                    </app-button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .admin-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
    }

    .admin-header h1 {
      margin: 0;
      color: #111827;
      font-size: 2rem;
      font-weight: 600;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #2563eb;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-danger:hover {
      background: #b91c1c;
    }

    .btn-small {
      padding: 8px 16px;
      font-size: 14px;
    }

    .loading-state,
    .error-state,
    .empty-state {
      text-align: center;
      padding: 64px 24px;
      color: #6b7280;
    }

    .error-state {
      color: #dc2626;
    }

    .table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .badges-table {
      width: 100%;
      border-collapse: collapse;
    }

    .badges-table th {
      background: #f9fafb;
      padding: 16px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }

    .badges-table td {
      padding: 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }

    .badges-table tr:last-child td {
      border-bottom: none;
    }

    .badges-table tr:hover {
      background: #f8fafc;
    }

    .icon-cell {
      width: 80px;
      text-align: center;
    }

    .name-cell {
      font-weight: 500;
      color: #111827;
    }

    .description-cell {
      color: #6b7280;
      max-width: 300px;
    }

    .criteria-cell code {
      background: #f3f4f6;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #374151;
    }

    .actions-cell {
      display: flex;
      gap: 8px;
      width: 160px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeAdminComponent implements OnInit {
  private readonly overlayService = inject(OverlayService);
  private readonly badgeStore = inject(BadgeStore);

  // ✅ Use BadgeStore definition signals (not earned badge signals)
  protected readonly badges = this.badgeStore.definitions;
  protected readonly loading = this.badgeStore.definitionsLoading;
  protected readonly error = this.badgeStore.definitionsError;

  // ✅ Expose ButtonSize for template
  readonly ButtonSize = ButtonSize;

  ngOnInit(): void {
    console.log('[BadgeAdminPageComponent] ngOnInit');
    this.badgeStore.loadOnce();
  }

  createBadge(): void {
    const { componentRef, close } = this.overlayService.open(BadgeFormComponent);

    componentRef.instance.closeCallback = (badge: Badge | null) => {
      if (badge) {
        console.log('[BadgeAdminPageComponent] Creating badge:', badge);
        this.badgeStore.saveBadge(badge);
      }
    };
  }

  editBadge(badge: Badge): void {
    console.log('[BadgeAdmin] Edit badge clicked:', badge);

    const { componentRef, close } = this.overlayService.open(
      BadgeFormComponent,
      {},
      { badge }
    );

    componentRef.instance.closeCallback = (updated: Badge | null) => {
      if (updated) {
        console.log('[BadgeAdmin] Saving updated badge:', updated);
        this.badgeStore.saveBadge(updated);
      }
    };
  }

  deleteBadge(badge: Badge): void {
    if (!confirm(`Are you sure you want to delete "${badge.name}"?`)) {
      return;
    }

    console.log('[BadgeAdmin] Delete badge clicked:', badge);
    this.badgeStore.deleteBadge(badge.id);
  }

  retry(): void {
    this.badgeStore.loadOnce(); // Force reload
  }
}
