import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Mission } from '../../utils/mission.model';

@Component({
  selector: 'app-mission-list',
  imports: [],
  template: `
    <ul>
      @for (mission of missions; track mission.id) {
        <li>
          <div (click)="select.emit(mission.id)">
            <h3>{{ mission.name }}</h3>
            <p>{{ mission.description }}</p>
          </div>
          <button (click)="edit.emit(mission.id)">Edit</button>
          <button (click)="delete.emit(mission.id)">Delete</button>
        </li>
      }
    </ul>
  `,
  styleUrl: './mission-list.component.scss'
})
export class MissionListComponent {
  @Input() missions: Mission[] = [];
  @Output() select = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
}
