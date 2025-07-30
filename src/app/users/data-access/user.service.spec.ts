import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import {
  createFirebaseMetricsMock,
  createFirestoreMock,
} from '../../shared/testing/firebase.mocks';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: createFirestoreMock() },
        { provide: 'FirebaseMetricsService', useValue: createFirebaseMetricsMock() },
      ],
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
