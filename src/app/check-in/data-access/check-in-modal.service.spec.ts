import { TestBed } from '@angular/core/testing';

import { CheckInModalService } from './check-in-modal.service';

describe('CheckInModalService', () => {
  let service: CheckInModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CheckInModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
