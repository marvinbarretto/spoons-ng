import { TestBed } from '@angular/core/testing';
import { EarnedBadgeService } from './earned-badge.service';
import { MockEarnedBadgeService } from '../../testing/store-mocks/mock-earned-badge.service';

describe('EarnedBadgeService', () => {
  let service: EarnedBadgeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: EarnedBadgeService, useClass: MockEarnedBadgeService }
      ]
    });
    service = TestBed.inject(EarnedBadgeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
