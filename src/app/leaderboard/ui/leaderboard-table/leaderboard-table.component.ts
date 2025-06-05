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
      trackBy="userId"
    />
  `,
  imports: [DataTableComponent]
})
export class LeaderboardTableComponent {
  readonly entries = input.required<LeaderboardEntry[]>();
  readonly loading = input(false);
  readonly userPosition = input<number | null>(null);

  private readonly authStore = inject(AuthStore);

  readonly columns = computed((): TableColumn[] => [
    {
      key: 'position',
      label: 'Rank',
      className: 'number',
      formatter: (_, row, index) => `#${index + 1}`
    },
    {
      key: 'displayName',
      label: 'Pub Crawler'
    },
    {
      key: 'totalVisits',
      label: 'Total Visits',
      className: 'number'
    },
    {
      key: 'uniquePubs',
      label: 'Unique Pubs',
      className: 'number'
    },
    {
      key: 'joinedDate',
      label: 'Since',
      formatter: (date) => new Date(date).toLocaleDateString()
    }
  ]);

  readonly isCurrentUser = (entry: LeaderboardEntry): boolean => {
    return entry.userId === this.authStore.user()?.uid;
  };
}
