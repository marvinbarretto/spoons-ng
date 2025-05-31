import { PubStore } from './pub.store';
import { PubService } from '../../pubs/data-access/pub.service';
import { CacheService } from '../../shared/data-access/cache.service';
import { LocationService } from '../../shared/data-access/location.service';
import { CheckinStore } from '../../check-in/data-access/check-in.store';
import { signal } from '@angular/core';
import { Pub } from '../../pubs/utils/pub.models';
import { TestBed } from '@angular/core/testing';
import { EnvironmentInjector } from '@angular/core';
import { runInInjectionContext } from '@angular/core';


// TODO: set up helpers, store helpers etc

describe('PubStore', () => {
  let store: PubStore;

  const mockPubs: Pub[] = [
    {
      id: '1',
      name: 'Pub A',
      address: '',
      location: { lat: 51.5, lng: -0.1 }, // closer
    },
    {
      id: '2',
      name: 'Pub B',
      address: '',
      location: { lat: 52.5, lng: -0.1 }, // farther
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CacheService,
          useValue: {
            load: jest.fn().mockResolvedValue(mockPubs),
            clear: jest.fn()
          }
        },
        {
          provide: LocationService,
          useValue: {
            location$$: signal({ lat: 51.51, lng: -0.1 }) // London
          }
        },
        {
          provide: CheckinStore,
          useValue: {
            checkins$$: signal([])
          }
        },
        {
          provide: PubService,
          useValue: {}
        }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);

    runInInjectionContext(injector, () => {
      store = new PubStore();
      store.pubs$$.set(mockPubs);
    });
  });

  it('should sort pubs by distance from current location', () => {
    const sorted = store.sortedPubsByDistance$$();
    expect(sorted[0].name).toBe('Pub A');
    expect(sorted[1].name).toBe('Pub B');
  });
});
