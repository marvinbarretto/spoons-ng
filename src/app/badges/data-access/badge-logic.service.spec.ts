import { TestBed } from '@angular/core/testing';

import { BadgeLogicService } from './badge-logic.service';

describe('BadgeLogicService', () => {
  let service: BadgeLogicService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BadgeLogicService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
