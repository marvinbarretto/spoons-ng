import { TestBed } from '@angular/core/testing';

import { NewCheckinStoreService } from './new-checkin.store';

describe('NewCheckinStoreService', () => {
  let service: NewCheckinStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewCheckinStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
