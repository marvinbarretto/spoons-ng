import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ordinal',
  standalone: true,
})
export class OrdinalPipe implements PipeTransform {
  transform(value: number): string {
    if (value == null || isNaN(value)) return '';

    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = value % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];

    return value + suffix;
  }
}
