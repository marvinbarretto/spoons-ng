import { Component, input, inject } from "@angular/core";
import { AuthStore } from "../../../auth/data-access/auth.store";
import { LeaderboardEntry } from "../../utils/leaderboard.models";
import { UserChipComponent, UserChipData } from "../../../shared/ui/chips/user-chip/user-chip.component";

// /leaderboard/ui/leaderboard-table.component.ts
@Component({
  selector: 'app-leaderboard-table',
  template: `
    <div class="data-table">
      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        <table>
          <thead>
            <tr>
              <th class="rank" style="width: 80px;">#</th>
              <th class="user-cell">Pub Crawler</th>
              <th class="number points-primary" style="width: 120px;">Points</th>
              <th class="number" style="width: 100px;">Pubs</th>
              <th class="number" style="width: 120px;">Check-ins</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of entries(); track entry.userId; let i = $index) {
              <tr 
                [class.highlight]="isCurrentUser(entry)"
                (click)="handleRowClick(entry)"
              >
                <td class="rank">#{{ i + 1 }}</td>
                <td class="user-cell">
                  <app-user-chip 
                    [user]="getUserChipData(entry)"
                    size="sm"
                    [clickable]="false"
                  />
                </td>
                <td class="number points-primary">{{ entry.totalPoints?.toLocaleString() || '0' }}</td>
                <td class="number">{{ entry.uniquePubs }}</td>
                <td class="number">{{ entry.totalCheckins }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  imports: [UserChipComponent],
  styleUrl: './leaderboard-table.component.scss'
})
export class LeaderboardTableComponent {
  readonly entries = input.required<LeaderboardEntry[]>();
  readonly loading = input(false);
  readonly userPosition = input<number | null>(null);
  readonly onRowClick = input<(entry: LeaderboardEntry) => void>();

  private readonly authStore = inject(AuthStore);

  getUserChipData(entry: LeaderboardEntry): UserChipData {
    return {
      displayName: entry.displayName,
      photoURL: entry.photoURL,
      email: entry.email,
      realDisplayName: entry.realDisplayName
    };
  }

  handleRowClick(entry: LeaderboardEntry): void {
    const clickHandler = this.onRowClick();
    if (clickHandler) {
      clickHandler(entry);
    }
  }

  readonly isCurrentUser = (entry: LeaderboardEntry): boolean => {
    return entry.userId === this.authStore.user()?.uid;
  };


}
