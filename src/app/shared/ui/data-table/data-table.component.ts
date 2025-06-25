// src/app/shared/ui/data-table/data-table.component.ts
import { Component, input, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TableColumn } from './data-table.model';

export type SortDirection = 'asc' | 'desc' | null;
export type SortState = {
  column: string | null;
  direction: SortDirection;
};

@Component({
  selector: 'app-data-table',
  imports: [CommonModule],
  template: `
    <div class="data-table">
      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        <table>
          <thead>
            <tr>
              @for (column of columns(); track column.key) {
                <th 
                  [class]="getHeaderClass(column)" 
                  [style.width]="column.width"
                  (click)="handleHeaderClick(column)"
                >
                  <div class="header-content">
                    <span>{{ column.label }}</span>
                    @if (column.sortable && sortState().column === column.key) {
                      <span class="sort-indicator">
                        {{ sortState().direction === 'asc' ? '↑' : '↓' }}
                      </span>
                    }
                  </div>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of displayData(); track getTrackByValue(row); let i = $index) {
              <tr 
                [class.highlight]="shouldHighlightRow(row)"
                [class]="getRowClassName(row)"
                (click)="handleRowClick(row)"
              >
                @for (column of columns(); track column.key) {
                  <td [class]="column.className" [innerHTML]="getCellValue(column, row, i)">
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
      background: var(--color-background);
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--color-subtleLighter);
    }

    th {
      font-weight: 600;
      background: var(--color-subtleLighter);
      color: var(--color-text);
      position: relative;
    }

    th.sortable {
      cursor: pointer;
      user-select: none;
    }

    th.sortable:hover {
      background: var(--color-subtle);
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .sort-indicator {
      font-size: 0.8rem;
      opacity: 0.7;
    }

    td {
      color: var(--color-text);
    }

    .number {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .rank {
      font-weight: 600;
      color: var(--color-buttonPrimaryBase);
      text-align: center;
    }

    .points-primary {
      font-weight: 700;
      color: var(--color-buttonPrimaryBase);
    }

    .user-cell .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-cell .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid var(--color-subtleLighter);
    }

    .user-cell .user-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .highlight {
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
    }

    .loading {
      padding: 2rem;
      text-align: center;
      opacity: 0.7;
      color: var(--color-text);
    }

    .date {
      font-size: 0.9rem;
      opacity: 0.8;
    }

    .name {
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid var(--color-subtleLighter);
    }

    .user-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Mobile responsiveness */
    @media (max-width: 600px) {
      th, td {
        padding: 0.5rem 0.25rem;
        font-size: 0.9rem;
      }

      .name {
        max-width: 150px;
      }

      .user-info {
        gap: 0.5rem;
      }

      .avatar {
        width: 28px;
        height: 28px;
      }
    }
  `
})
export class DataTableComponent {
  readonly data = input.required<any[]>();
  readonly columns = input.required<TableColumn[]>();
  readonly loading = input(false);
  readonly trackBy = input<string>('id');
  readonly highlightRow = input<(row: any) => boolean>();
  readonly getRowClass = input<(row: any) => string>();
  readonly onRowClick = input<(row: any) => void>();
  readonly searchTerm = input<string>('');

  // Sort state
  readonly sortState = signal<SortState>({ column: null, direction: null });

  // Filtered data based on search
  readonly filteredData = computed(() => {
    const search = this.searchTerm().toLowerCase();
    if (!search) return this.data();
    
    return this.data().filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(search)
      )
    );
  });

  // Sorted and filtered data
  readonly displayData = computed(() => {
    const filtered = this.filteredData();
    const sort = this.sortState();
    
    if (!sort.column || !sort.direction) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      const aValue = a[sort.column!];
      const bValue = b[sort.column!];
      
      // Handle different data types
      let comparison = 0;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        const aStr = String(aValue || '').toLowerCase();
        const bStr = String(bValue || '').toLowerCase();
        comparison = aStr.localeCompare(bStr);
      }
      
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  });

  getCellValue(column: TableColumn, row: any, index: number): string {
    const value = row[column.key];
    
    if (column.formatter) {
      return column.formatter(value, row, index);
    }
    
    return String(value ?? '');
  }

  getTrackByValue(row: any): any {
    const trackByKey = this.trackBy();
    return row[trackByKey] ?? row;
  }

  shouldHighlightRow(row: any): boolean {
    const highlightFn = this.highlightRow();
    return highlightFn ? highlightFn(row) : false;
  }

  getRowClassName(row: any): string {
    const classFn = this.getRowClass();
    return classFn ? classFn(row) : '';
  }

  handleRowClick(row: any): void {
    const clickHandler = this.onRowClick();
    if (clickHandler) {
      clickHandler(row);
    }
  }

  handleHeaderClick(column: TableColumn): void {
    if (!column.sortable) return;

    const currentSort = this.sortState();
    
    if (currentSort.column === column.key) {
      // Cycle through: asc -> desc -> null
      const newDirection: SortDirection = 
        currentSort.direction === 'asc' ? 'desc' :
        currentSort.direction === 'desc' ? null : 'asc';
      
      this.sortState.set({
        column: newDirection ? column.key : null,
        direction: newDirection
      });
    } else {
      // New column, start with descending
      this.sortState.set({
        column: column.key,
        direction: 'desc'
      });
    }
  }

  getHeaderClass(column: TableColumn): string {
    const classes = [column.className || ''];
    if (column.sortable) {
      classes.push('sortable');
    }
    return classes.filter(Boolean).join(' ');
  }
}
