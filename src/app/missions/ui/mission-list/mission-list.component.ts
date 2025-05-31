import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Mission } from '../../utils/mission.model';

@Component({
  selector: 'app-mission-list',
  imports: [],
  template: `
    <ul>
      @for (mission of missions; track mission.id) {
        <li (click)="select.emit(mission.id)">
          <h3>{{ mission.title }}</h3>
          <p>{{ mission.description }}</p>
        </li>
      }
    </ul>
  `,
  styleUrl: './mission-list.component.scss'
})
export class MissionListComponent {
  @Input() missions: Mission[] = [];
  @Output() select = new EventEmitter<string>();
}
