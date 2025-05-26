import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PaginationService {
  constructor() {}

  /**
   * Paginate an array of items
   * @param items Array of items to paginate
   * @param currentPage Current page number
   * @param pageSize Number of items per page
   * @param sortFn Optional sorting function
   * @returns Array of paginated items for the current page
   */
  paginate<T>(
    items: T[],
    currentPage: number,
    pageSize: number,
    sortFn?: (a: T, b: T) => number
  ): T[] {
    // Optional sorting
    if (sortFn) {
      items = items.slice().sort(sortFn);
    }

    // Calculate start and end index for current page
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // Return the paginated slice of items
    return items.slice(startIndex, endIndex);
  }

  /**
   * Calculate the total number of pages
   * @param totalItems Total number of items in the array
   * @param pageSize Number of items per page
   * @returns Total number of pages
   */
  getTotalPages(totalItems: number, pageSize: number): number {
    return Math.ceil(totalItems / pageSize);
  }
}
