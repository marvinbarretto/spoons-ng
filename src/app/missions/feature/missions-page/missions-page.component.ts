import { Component, inject } from '@angular/core';
import { MissionStore } from '../../data-access/mission.store';
import { Router } from '@angular/router';
import { MissionListComponent } from '../../ui/mission-list/mission-list.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-missions-page',
  imports: [MissionListComponent, ButtonComponent],
  template: `
    <div class="missions-page">
      <h1>Missions</h1>
      <app-button (onClick)="create()">Create Mission</app-button>
      <app-mission-list [missions]="missionStore.missions()" (select)="edit($event)"></app-mission-list>
    </div>
  `,
  styleUrl: './missions-page.component.scss'
})
export class MissionsPageComponent {
  protected readonly missionStore = inject(MissionStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.missionStore.loadOnce();
  }

  create() {
    this.router.navigate(['/missions/new']);
  }

  edit(id: string) {
    this.router.navigate(['/missions', id]);
  }
}
