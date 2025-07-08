import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { PubService } from './pub.service';
import { createFirestoreMock, createFirebaseMetricsMock } from '../../shared/testing/firebase.mocks';

describe('PubsService', () => {
  let service: PubService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: createFirestoreMock() },
        { provide: 'FirebaseMetricsService', useValue: createFirebaseMetricsMock() }
      ]
    });
    service = TestBed.inject(PubService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
