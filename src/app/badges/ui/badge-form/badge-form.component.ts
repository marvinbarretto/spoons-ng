import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  Signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../utils/badge.model';
import { getInputValue } from '../../../shared/utils/dom.helpers';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-badge-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './badge-form.component.html',
  styleUrl: './badge-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeFormComponent {
  @Input({ required: true }) badge: Badge | null = null;
  @Output() onSave = new EventEmitter<Badge>();

  private readonly _model = signal<Badge>({
    id: '',
    name: '',
    description: '',
    emoji: '',
    criteria: '',
    createdAt: Timestamp.now(),
    ...this.badge,
  });

  readonly model: Signal<Badge> = this._model.asReadonly();

  onInputChange(field: keyof Badge, event: Event): void {
    const value = getInputValue(event);
    const current = this._model();
    this._model.set({ ...current, [field]: value });
  }

  submit(): void {
    const badge = this._model();
    if (!badge.id || !badge.name) return;
    this.onSave.emit(badge);
  }
}
