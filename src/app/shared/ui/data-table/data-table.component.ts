// src/app/shared/ui/data-table/data-table.component.ts
import { Component, input, computed, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TableColumn } from './data-table.model';
import { ChipUserComponent, UserChipData } from '../chips/chip-user/chip-user.component';
import { ViewportService } from '../../data-access/viewport.service';
import { IconComponent } from '../icon/icon.component';

export type SortDirection = 'asc' | 'desc' | null;
export type SortState = {
  column: string | null;
  direction: SortDirection;
};

@Component({
  selector: 'app-data-table',
  imports: [CommonModule, ChipUserComponent, IconComponent],
  template: `
    <div class="data-table">
      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        <table>
          <thead>
            <tr>
              @for (column of displayColumns(); track column.key) {
                <th
                  [class]="getHeaderClass(column)"
                  [style.width]="column.width"
                  (click)="handleHeaderClick(column)"
                >
                  <div class="header-content">
                    <span>{{ column.label }}</span>
                    @if (column.sortable && sortState().column === column.key) {
                      <app-icon
                        [name]="sortState().direction === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                        size="sm"
                        class="sort-indicator"
                      />
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
                @for (column of displayColumns(); track column.key) {
                  <td [class]="column.className">
                    @if (column.renderer) {
                      <!-- Custom renderer content -->
                      @if (column.key === 'displayName') {
                        <app-chip-user
                          [user]="getUserChipData(row)"
                          size="sm"
                          [clickable]="false"
                        />
                      } @else {
                        <span [innerHTML]="getCellValue(column, row, i)"></span>
                      }
                    } @else {
                      <span [innerHTML]="getCellValue(column, row, i)"></span>
                    }
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
      text-align: center;
      border-bottom: 1px solid var(--background-lighter);
    }

    th {
      font-weight: 600;
      background: var(--background-lighter);
      color: var(--text);
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
      justify-content: space-around;
      gap: 0.5rem;
    }

    .sort-indicator {
      opacity: 0.7;
    }

    td {
      color: var(--text);
    }

    .number {
      text-align: center;
      font-variant-numeric: tabular-nums;
      font-size: 0.95rem;
    }

    .rank {
      font-weight: 600;
      color: var(--color-buttonPrimaryBase);
      text-align: center;
    }

    .points-primary {
      font-size: 1.1rem;
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
      border: 2px solid var(--background-lighter);
    }

    .user-cell .user-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    tbody tr:nth-child(even) {
      background: color-mix(in srgb, var(--background-lighter) 15%, transparent);
    }

    tbody tr:hover {
      background: var(--background-lighter);
      cursor: pointer;
    }

    .highlight {
      background: color-mix(in srgb, var(--accent) 15%, transparent) !important;
      font-weight: 600;
    }

    .loading {
      padding: 2rem;
      text-align: center;
      opacity: 0.7;
      color: var(--text);
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
      border: 2px solid var(--background-lighter);
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

  // Viewport service for responsive behavior
  private readonly viewportService = inject(ViewportService);

  // Sort state
  readonly sortState = signal<SortState>({ column: null, direction: null });

  // Responsive columns - filter out columns that should be hidden on mobile
  readonly displayColumns = computed(() => {
    const allColumns = this.columns();
    const isMobile = this.viewportService.isMobile();

    if (!isMobile) {
      return allColumns;
    }

    // On mobile, filter out columns that have hideOnMobile property
    return allColumns.filter(column => !column.hideOnMobile);
  });

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

  getUserChipData(row: any): UserChipData {
    return {
      displayName: row.displayName || 'Unknown User',
      photoURL: row.photoURL,
      email: row.email,
      realDisplayName: row.realDisplayName
    };
  }
}
