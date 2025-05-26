import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-date',
  imports: [CommonModule],
  templateUrl: './date.component.html',
  styleUrl: './date.component.scss',
})
export class DateComponent {
  @Input() date!: Date;

  isNextYear(): boolean {
    return this.date.getFullYear() !== new Date().getFullYear();
  }
}
