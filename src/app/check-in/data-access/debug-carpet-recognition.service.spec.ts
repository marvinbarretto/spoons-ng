import { TestBed } from '@angular/core/testing';

import { DebugCarpetRecognitionService } from './debug-carpet-recognition.service';

describe('DebugCarpetRecognitionService', () => {
  let service: DebugCarpetRecognitionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DebugCarpetRecognitionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
