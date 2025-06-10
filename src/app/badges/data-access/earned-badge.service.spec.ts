import { TestBed } from '@angular/core/testing';

import { EarnedBadgeService } from './earned-badge.service';

describe('EarnedBadgeService', () => {
  let service: EarnedBadgeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EarnedBadgeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
