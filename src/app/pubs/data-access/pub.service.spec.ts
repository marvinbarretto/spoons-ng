import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import {
  createFirebaseMetricsMock,
  createFirestoreMock,
} from '../../shared/testing/firebase.mocks';
import { PubService } from './pub.service';

describe('PubsService', () => {
  let service: PubService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: createFirestoreMock() },
        { provide: 'FirebaseMetricsService', useValue: createFirebaseMetricsMock() },
      ],
    });
    service = TestBed.inject(PubService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
