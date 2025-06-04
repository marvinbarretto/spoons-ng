import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BadgeIconComponent } from '../../ui/badge-icon/badge-icon.component';
import { BadgeDefinitionService } from '../../data-access/badge-definition.service';
import type { Badge } from '../../utils/badge.model';
import { BadgeFormComponent } from '../../ui/badge-form/badge-form.component';
import { OverlayService } from '../../../shared/data-access/overlay.service';

@Component({
  selector: 'app-badge-admin-page',
  imports: [BadgeIconComponent],
  template: `
    <section>
      <h1>Badge Admin</h1>

      @if (loading()) {
        <p>Loading...</p>
      } @else if (badges().length === 0) {
        <p>No badges defined yet.</p>
      } @else {
        <table>
          <thead>
            <tr><th>Icon</th><th>Name</th><th>Description</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (badge of badges(); track badge.id) {
              <tr>
                <td><app-badge-icon [badge]="badge" /></td>
                <td>{{ badge.name }}</td>
                <td>{{ badge.description }}</td>
                <td>
                  <button (click)="edit(badge)">Edit</button>
                  <button (click)="delete(badge)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      <button (click)="create()">＋ Create New Badge</button>
    </section>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeAdminPageComponent {
  private readonly badgeDefinitionService = inject(BadgeDefinitionService);
  private readonly overlayService = inject(OverlayService);

  protected readonly badges = signal<Badge[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.badgeDefinitionService.getAll();
      this.badges.set(result);
    } catch (error: any) {
      console.error('[BadgeAdminPage] Failed to load badges:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async delete(badge: Badge): Promise<void> {
    if (!confirm(`Delete badge "${badge.name}"?`)) return;

    try {
      await this.badgeDefinitionService.delete(badge.id);
      this.badges.update(b => b.filter(item => item.id !== badge.id));
    } catch (error: any) {
      console.error(`[BadgeAdminPage] Failed to delete badge:`, error);
    }
  }

  create(): void {
    this.overlayService.open(BadgeFormComponent, {}, {
      onSave: (badge: Badge) => this.saveNewBadge(badge),
    });
  }

  edit(badge: Badge): void {
    this.overlayService.open(BadgeFormComponent, {}, {
      badge,
      onSave: (updated: Badge) => this.updateBadge(updated),
    });
  }

  private async saveNewBadge(badge: Badge): Promise<void> {
    await this.badgeDefinitionService.create(badge);
    this.badges.update(list => [...list, badge]);
    this.overlayService.close();
  }

  private async updateBadge(badge: Badge): Promise<void> {
    await this.badgeDefinitionService.update(badge.id, badge);
    this.badges.update(list => list.map(b => b.id === badge.id ? badge : b));
    this.overlayService.close();
  }
}
