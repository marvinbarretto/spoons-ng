import { TestBed } from '@angular/core/testing';

import { EnhancedCarpetRecognitionService } from './enhanced-carpet-recognition.service';

describe('EnhancedCarpetRecognitionService', () => {
  let service: EnhancedCarpetRecognitionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnhancedCarpetRecognitionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
