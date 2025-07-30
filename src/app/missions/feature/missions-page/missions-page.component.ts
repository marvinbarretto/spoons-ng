import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { MissionStore } from '../../data-access/mission.store';
import { MissionListComponent } from '../../ui/mission-list/mission-list.component';

@Component({
  selector: 'app-missions-page',
  imports: [MissionListComponent, ButtonComponent],
  template: `
    <div class="missions-page">
      <h1>Missions</h1>
      <app-button (onClick)="create()">Create Mission</app-button>
      <app-mission-list [missions]="missions()" (select)="edit($event)"></app-mission-list>
      @for (mission of missions(); track mission.id) {
        <div>
          <span>{{ mission.name }}</span>
          <app-button (onClick)="edit(mission.id)">Edit</app-button>
          <app-button (onClick)="delete(mission.id)">Delete</app-button>
        </div>
      }
    </div>
  `,
  styleUrl: './missions-page.component.scss',
})
export class MissionsPageComponent {
  protected readonly missionStore = inject(MissionStore);
  private readonly router = inject(Router);

  missions = this.missionStore.missions;

  ngOnInit(): void {
    this.missionStore.loadOnce();
  }

  create() {
    this.router.navigate(['/missions/new']);
  }

  edit(id: string) {
    this.router.navigate(['/missions', id]);
  }

  delete(id: string) {
    // Q: Is this the best way to do this? Or should it aim to be more reactive?
    this.missionStore.delete(id).then(() => this.missionStore.loadOnce());
  }
}
