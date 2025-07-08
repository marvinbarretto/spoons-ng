import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { UserService } from './user.service';
import { createFirestoreMock, createFirebaseMetricsMock } from '../../shared/testing/firebase.mocks';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: createFirestoreMock() },
        { provide: 'FirebaseMetricsService', useValue: createFirebaseMetricsMock() }
      ]
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
