import { TestBed } from '@angular/core/testing';

import { CarpetService } from './carpet.service';

describe('CarpetService', () => {
  let service: CarpetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CarpetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
