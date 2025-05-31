import { Component, inject } from '@angular/core';
import { MissionStore } from '../../data-access/mission.store';
import { Router } from '@angular/router';
import { Mission } from '../../utils/mission.model';

@Component({
  selector: 'app-create-mission-page',
  imports: [],
  templateUrl: './create-mission-page.component.html',
  styleUrl: './create-mission-page.component.scss'
})
export class CreateMissionPageComponent {
  protected readonly missionStore = inject(MissionStore);
  protected readonly router = inject(Router);

  async save(mission: Mission) {
    await this.missionStore.create(mission);
    this.router.navigate(['/missions']);
  }
}
