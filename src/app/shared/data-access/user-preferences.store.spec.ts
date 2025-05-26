import { TestBed } from '@angular/core/testing';

import { UserPreferencesStore } from './user-preferences.store';

describe('AccessibilityService', () => {
  let service: UserPreferencesStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserPreferencesStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
