import { TestBed } from '@angular/core/testing';
import { createBasicTestProviders } from '../../shared/testing/test-providers';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: createBasicTestProviders(),
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
