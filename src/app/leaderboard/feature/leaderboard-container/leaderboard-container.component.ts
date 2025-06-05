import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { BaseComponent } from "../../../shared/data-access/base.component";
import { LeaderboardStore } from "../../data-access/leaderboard.store";

@Component({
  selector: 'app-leaderboard-container',
  template: `
    <div class="leaderboard-page">
      <h1>Leaderboard</h1>

      @if (loading() || store.loading()) {
        <p>Loading...</p>
      } @else if (error() || store.error()) {
        <p>Error: {{ error() || store.error() }}</p>
      } @else {
        <pre>{{ store.data() | json }}</pre>
      }
    </div>
  `,
  imports: [CommonModule]
})
export class LeaderboardContainerComponent extends BaseComponent {
  protected readonly store = inject(LeaderboardStore);

  protected override onInit(): void {
    this.store.loadOnce();
  }

  // Future: component-specific operations
  // async refreshLeaderboard(): Promise<void> {
  //   await this.handleAsync(
  //     () => this.store.refresh(),
  //     { successMessage: 'Leaderboard refreshed!' }
  //   );
  // }

  // async filterByTimeRange(range: string): Promise<void> {
  //   await this.handleAsync(
  //     () => this.store.loadTimeRange(range),
  //     { errorMessage: 'Failed to load time range data' }
  //   );
  // }
}
