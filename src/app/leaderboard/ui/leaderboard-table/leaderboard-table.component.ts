import { Component, input, inject, computed } from "@angular/core";
import { AuthStore } from "../../../auth/data-access/auth.store";
import { DataTableComponent } from "../../../shared/ui/data-table/data-table.component";
import { TableColumn } from "../../../shared/ui/data-table/data-table.model";
import { LeaderboardEntry } from "../../utils/leaderboard.models";

// /leaderboard/ui/leaderboard-table.component.ts
@Component({
  selector: 'app-leaderboard-table',
  template: `
    <app-data-table
      [data]="entries()"
      [columns]="columns()"
      [loading]="loading()"
      [highlightRow]="isCurrentUser"
      [trackBy]="'userId'"
      [onRowClick]="onRowClick()"
    />
  `,
  imports: [DataTableComponent]
})
export class LeaderboardTableComponent {
  readonly entries = input.required<LeaderboardEntry[]>();
  readonly loading = input(false);
  readonly userPosition = input<number | null>(null);
  readonly onRowClick = input<(entry: LeaderboardEntry) => void>();

  private readonly authStore = inject(AuthStore);

  readonly columns = computed((): TableColumn[] => [
    {
      key: 'rank',
      label: 'Rank',
      className: 'rank',
      width: '80px',
      formatter: (_, row, index) => {
        const rank = (index ?? 0) + 1;
        return `#${rank}`;
      }
    },
    {
      key: 'displayName',
      label: 'Pub Crawler',
      className: 'user-cell',
      formatter: (_, entry: LeaderboardEntry) => {
        const avatar = this.getUserAvatar(entry);
        
        return `<div class="user-info">
          <img src="${avatar}" alt="${entry.displayName}" class="avatar" onerror="this.src='assets/avatars/npc.webp'" />
          <span class="user-name">${entry.displayName}</span>
        </div>`;
      }
    },
    {
      key: 'totalPoints',
      label: 'Points',
      className: 'number points-primary',
      width: '120px',
      formatter: (points) => points?.toLocaleString() || '0'
    },
    {
      key: 'uniquePubs',
      label: 'Pubs',
      className: 'number',
      width: '100px'
    },
    {
      key: 'totalCheckins',
      label: 'Check-ins',
      className: 'number',
      width: '120px'
    }
  ]);

  readonly isCurrentUser = (entry: LeaderboardEntry): boolean => {
    return entry.userId === this.authStore.user()?.uid;
  };

  private getUserAvatar(entry: LeaderboardEntry): string {
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

}
