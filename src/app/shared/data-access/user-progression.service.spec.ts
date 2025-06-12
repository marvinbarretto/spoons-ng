import { TestBed } from '@angular/core/testing';

import { UserProgressionService } from './user-progression.service';

describe('UserProgressionService', () => {
  let service: UserProgressionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserProgressionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
