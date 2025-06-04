import { TestBed } from '@angular/core/testing';

import { BadgeDefinitionService } from './badge-definition.service';

describe('BadgeDefinitionService', () => {
  let service: BadgeDefinitionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BadgeDefinitionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
