import { TestBed } from '@angular/core/testing';
import { LandlordService } from './landlord.service';
import { MockLandlordService } from '../../testing/store-mocks/mock-landlord.service';

describe('LandlordService', () => {
  let service: LandlordService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LandlordService, useClass: MockLandlordService }
      ]
    });
    service = TestBed.inject(LandlordService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
