import { TestBed } from '@angular/core/testing';

import { BadgeAwardService } from './badge-award.service';

describe('BadgeAwardService', () => {
  let service: BadgeAwardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BadgeAwardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
