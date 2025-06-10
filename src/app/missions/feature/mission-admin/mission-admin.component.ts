import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { Mission } from '../../utils/mission.model';
import { MissionFormComponent } from '../../ui/mission-form/mission-form.component';
import { OverlayService } from '../../../shared/data-access/overlay.service';
import { MissionStore } from '../../data-access/mission.store';

@Component({
  selector: 'app-mission-admin',
  imports: [],
  template: `
    <div class="admin-container">
      <header class="admin-header">
        <h1>Mission Administration</h1>
        <button (click)="create()" class="btn-primary">
          + Create New Mission
        </button>
      </header>

      @if (loading()) {
        <p>Loading...</p>
      } @else if (error()) {
        <p>Error: {{ error() }}</p>
      } @else if (missions().length === 0) {
        <p>No missions defined yet.</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Pub Count</th>
              <th>Badge Reward</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (mission of missions(); track mission.id) {
              <tr>
                <td>{{ mission.name }}</td>
                <td>{{ mission.description }}</td>
                <td>{{ mission.pubIds.length }}</td>
                <td>{{ mission.badgeRewardId || 'None' }}</td>
                <td>
                  <button (click)="edit(mission)">Edit</button>
                  <button (click)="delete(mission)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
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

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }

    th {
      background-color: #f5f5f5;
      font-weight: 600;
    }

    button {
      margin-right: 0.5rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
    }

    button:hover {
      background: #f5f5f5;
    }

    button:last-child {
      margin-right: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MissionAdminComponent {
  private readonly missionStore = inject(MissionStore);
  private readonly overlayService = inject(OverlayService);

  protected readonly missions = this.missionStore.missions;
  protected readonly loading = this.missionStore.loading;
  protected readonly error = this.missionStore.error;

  async ngOnInit(): Promise<void> {
    await this.missionStore.loadOnce();
  }

  async delete(mission: Mission): Promise<void> {
    if (!confirm(`Delete mission "${mission.name}"?`)) return;

    try {
      await this.missionStore.delete(mission.id);
    } catch (error: any) {
      console.error(`[MissionAdminPage] Failed to delete mission:`, error);
    }
  }

  create(): void {
    this.overlayService.open(MissionFormComponent, {}, {
      onSave: (mission: Mission) => this.saveNewMission(mission),
    });
  }

  edit(mission: Mission): void {
    this.overlayService.open(MissionFormComponent, {}, {
      mission,
      onSave: (updated: Mission) => this.updateMission(updated),
    });
  }

  private async saveNewMission(mission: Mission): Promise<void> {
    try {
      await this.missionStore.create(mission);
      this.overlayService.close();
    } catch (error: any) {
      console.error('[MissionAdminPage] Failed to create mission:', error);
    }
  }

  private async updateMission(mission: Mission): Promise<void> {
    try {
      await this.missionStore.update(mission);
      this.overlayService.close();
    } catch (error: any) {
      console.error('[MissionAdminPage] Failed to update mission:', error);
    }
  }
}
