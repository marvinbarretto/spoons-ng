// app/components/missions/mission-form.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Mission } from '../../utils/mission.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mission-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form (ngSubmit)="emitSubmit()">
      <label>Title <input [(ngModel)]="form.title" name="title" /></label>
      <label>Description <textarea [(ngModel)]="form.description" name="description"></textarea></label>
      <label>Pub IDs (comma-separated) <input [(ngModel)]="form.pubIdsRaw" name="pubIds" /></label>
      <button type="submit">{{ submitLabel }}</button>
    </form>
  `,
  styleUrl: './mission-form.component.scss'

})
export class MissionFormComponent {
  @Input() submitLabel = 'Save';
  @Input() set mission(value: Mission | null) {
    if (value) {
      this.form = {
        id: value.id,
        title: value.title,
        description: value.description,
        pubIdsRaw: value.pubIds.join(','),
      };
    }
  }

  @Output() submit = new EventEmitter<Mission>();

  form = {
    id: '',
    title: '',
    description: '',
    pubIdsRaw: '',
  };

  emitSubmit() {
    this.submit.emit({
      id: this.form.id.trim(),
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      pubIds: this.form.pubIdsRaw.split(',').map(s => s.trim()).filter(Boolean),
    });
  }
}
