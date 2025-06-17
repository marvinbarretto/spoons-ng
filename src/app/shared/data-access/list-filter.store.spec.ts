import { TestBed } from '@angular/core/testing';

import { ListFilterStore } from './list-filter.store';

describe('ListFilterStore', () => {
  let service: ListFilterStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ListFilterStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
