import { TestBed } from '@angular/core/testing';

import { FirestoreCrudService } from './firestore-crud.service';

describe('FirestoreCrudService', () => {
  let service: FirestoreCrudService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirestoreCrudService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
