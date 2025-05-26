import { TestBed } from '@angular/core/testing';

import { PageTitleService } from './page-title.service';
import { Title } from '@angular/platform-browser';

describe('PageTitleService', () => {
  let service: PageTitleService;
  let titleService: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PageTitleService, Title],
    });
    service = TestBed.inject(PageTitleService);
    titleService = TestBed.inject(Title);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set the title with "BPCN" suffix', () => {
    const setTitleSpy = jest.spyOn(titleService, 'setTitle');

    // Call the service to set the title
    service.setTitle('You Orns');

    // Ensure the title is set correctly
    expect(setTitleSpy).toHaveBeenCalledWith('You Orns - BPCN');
  });
});
