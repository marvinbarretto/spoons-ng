import { Component, inject } from '@angular/core';
import { MissionFormComponent } from '../../ui/mission-form/mission-form.component';
import { MissionStore } from '../../data-access/mission.store';
import { ActivatedRoute, Router } from '@angular/router';
import { Mission } from '../../utils/mission.model';

@Component({
  selector: 'app-edit-mission-page',
  imports: [MissionFormComponent],
  template: `
    <h2>Edit Mission</h2>
    @if (mission) {
      <app-mission-form [mission]="mission" (submit)="save($event)"></app-mission-form>
    }
  `,
  styleUrl: './edit-mission-page.component.scss'
})
export class EditMissionPageComponent {
  private readonly missionStore = inject(MissionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  missionId = '';
  mission: Mission | null = null;

  ngOnInit() {
    this.missionId = this.route.snapshot.paramMap.get('id') || '';
    this.missionStore.loadOnce().then(() => {
      this.mission = this.missionStore.getMissionById(this.missionId) ?? null;
    });
  }

  async save(mission: Mission) {
    await this.missionStore.update(mission);
    this.router.navigate(['/missions']);
  }
}

