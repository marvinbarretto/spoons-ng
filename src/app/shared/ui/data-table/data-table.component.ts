// src/app/shared/ui/data-table/data-table.component.ts
import { Component, input, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-data-table',
  imports: [],
  template: `
    <div class="data-table">
      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Pub Crawler</th>
              <th>Total Visits</th>
              <th>Unique Pubs</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of sortedData(); track entry.userId; let i = $index) {
              <tr [class.highlight]="entry.displayName.includes('(You)')">
                <td class="rank">#{{ i + 1 }}</td>
                <td class="name">
                  <div class="user-info">
                    <img
                      [src]="getUserAvatar(entry)"
                      [alt]="entry.displayName"
                      class="avatar"
                      (error)="onImageError($event)"
                    />
                    <span class="user-name">{{ entry.displayName }}</span>
                  </div>
                </td>
                <td class="number">{{ entry.totalVisits }}</td>
                <td class="number">{{ entry.uniquePubs }}</td>
                <td class="date">{{ formatDate(entry.joinedDate) }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: `
    .data-table {
      width: 100%;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-background);
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--color-subtleLighter);
    }

    th {
      font-weight: 600;
      background: var(--color-subtleLighter);
      color: var(--color-text);
    }

    td {
      color: var(--color-text);
    }

    .number {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .rank {
      font-weight: 600;
      color: var(--color-buttonPrimaryBase);
    }

    .highlight {
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
    }

    .loading {
      padding: 2rem;
      text-align: center;
      opacity: 0.7;
      color: var(--color-text);
    }

    .date {
      font-size: 0.9rem;
      opacity: 0.8;
    }

    .name {
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid var(--color-subtleLighter);
    }

    .user-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Mobile responsiveness */
    @media (max-width: 600px) {
      th, td {
        padding: 0.5rem 0.25rem;
        font-size: 0.9rem;
      }

      .name {
        max-width: 150px;
      }

      .user-info {
        gap: 0.5rem;
      }

      .avatar {
        width: 28px;
        height: 28px;
      }
    }
  `
})
export class DataTableComponent {
  readonly data = input.required<any[]>();
  readonly loading = input(false);

  // Sort by total visits (descending), then by unique pubs
  readonly sortedData = computed(() => {
    return [...this.data()].sort((a, b) => {
      if (b.totalVisits !== a.totalVisits) {
        return b.totalVisits - a.totalVisits;
      }
      return b.uniquePubs - a.uniquePubs;
    });
  });

  formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return 'Unknown';
    }
  }

  getUserAvatar(entry: any): string {
    // Check if this user has a profile photo (Google users)
    if (entry.photoURL) {
      return entry.photoURL;
    }

    // Check if it's a real user (has email/displayName) vs anonymous
    const isAnonymousUser = !entry.email && !entry.realDisplayName &&
                           (entry.displayName?.includes('-') || entry.displayName?.includes('(You)'));

    if (isAnonymousUser) {
      // Use NPC image for anonymous users
      return 'assets/avatars/npc.webp';
    } else {
      // Fallback avatar for Google users without profile photos
      return 'assets/images/default-user-avatar.png';
    }
  }

  onImageError(event: Event): void {
    // Fallback to NPC image if any avatar fails to load
    const img = event.target as HTMLImageElement;
    img.src = 'assets/avatars/npc.webp';
  }
}
