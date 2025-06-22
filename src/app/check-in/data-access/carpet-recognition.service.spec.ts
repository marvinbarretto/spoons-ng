import { TestBed } from '@angular/core/testing';

import { CarpetRecognitionService } from './carpet-recognition.service';

describe('CarpetRecognitionService', () => {
  let service: CarpetRecognitionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CarpetRecognitionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
