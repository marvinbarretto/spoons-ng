import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { createBasicTestProviders } from '../../shared/testing/test-providers';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: createBasicTestProviders()
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
