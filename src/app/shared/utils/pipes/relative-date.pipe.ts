import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'relativeDate',
})
export class RelativeDatePipe implements PipeTransform {
  transform(date: string | Date | null | undefined): string {
    if (!date) return '';

    const now = new Date();
    const target = new Date(date);
    const diff = target.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'In the past';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7)
      return target.toLocaleDateString(undefined, { weekday: 'long' });
    return target.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }
}
