import { Component, input } from "@angular/core";
import { TableColumn } from "./data-table.model";

// /shared/ui/data-table/data-table.component.ts
@Component({
  selector: 'app-data-table',
  template: `
    <div class="data-table">
      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        <table>
          <thead>
            <tr>
              @for (column of columns(); track column.key) {
                <th [class]="column.className">{{ column.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of data(); track row[trackBy()]) {
              <tr [class.highlight]="shouldHighlight(row)">
                @for (column of columns(); track column.key) {
                  <td [class]="column.className">
                    {{ getValue(row, column) }}
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: `
    .data-table {
      width: 100%;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--color-subtleLighter);
    }

    th {
      font-weight: 600;
      background: var(--color-subtleLighter);
    }

    .highlight {
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
    }

    .number {
      text-align: right;
    }

    .loading {
      padding: 2rem;
      text-align: center;
      opacity: 0.7;
    }
  `
})
export class DataTableComponent<T = any> {
  readonly data = input.required<T[]>();
  readonly columns = input.required<TableColumn[]>();
  readonly loading = input(false);
  readonly trackBy = input('id');
  readonly highlightRow = input<(row: T) => boolean>(() => false);

  shouldHighlight(row: T): boolean {
    return this.highlightRow()(row);
  }

  getValue(row: T, column: TableColumn): string {
    const value = (row as any)[column.key];

    if (column.formatter) {
      return column.formatter(value, row);
    }

    return value?.toString() || '';
  }
}
