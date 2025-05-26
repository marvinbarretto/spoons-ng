import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'daysUntil',
})
export class DaysUntilPipe implements PipeTransform {
  transform(dateString: string): string {
    const now = new Date();
    const eventDate = new Date(dateString);
    const diff = Math.ceil(
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff > 0) return `${diff} day(s) to go`;
    if (diff === 0) return 'Today';
    return `${Math.abs(diff)} day(s) ago`;
  }
}
