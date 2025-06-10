import { TestBed } from '@angular/core/testing';
import { FirestoreService } from 'src/app/shared/data-access/firestore.service';
import { PubService } from './pub.service';
import { of } from 'rxjs';
import { collection, getDocs } from 'firebase/firestore';

// Mock FirestoreService
class MockFirestoreService {
  collection$ = jasmine.createSpy('collection$').and.returnValue(of([]));
  doc$ = jasmine.createSpy('doc$').and.returnValue(of({}));
  // Add other methods if needed, or use a partial mock
}

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'), // import and retain default behavior
  collection: jest.fn(),
  getDocs: jest.fn(),
}));


describe('PubService', () => {
  let service: PubService;
  let firestoreServiceMock: MockFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PubService,
        { provide: FirestoreService, useClass: MockFirestoreService },
      ],
    });
    service = TestBed.inject(PubService);
    firestoreServiceMock = TestBed.inject(FirestoreService) as unknown as MockFirestoreService;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadPubs', () => {
    it('should call collection$ with the correct path', () => {
      service.loadPubs();
      expect(firestoreServiceMock.collection$).toHaveBeenCalledWith('pubs');
    });

    it('should return the expected observable', () => {
      const expectedObservable = of([{ id: '1', name: 'Test Pub' }]);
      firestoreServiceMock.collection$.and.returnValue(expectedObservable);
      const result = service.loadPubs();
      expect(result).toBe(expectedObservable);
    });
  });

  describe('getPubById', () => {
    it('should call doc$ with the correct path', () => {
      const testId = '123';
      service.getPubById(testId);
      expect(firestoreServiceMock.doc$).toHaveBeenCalledWith(`pubs/${testId}`);
    });

    it('should return the expected observable', () => {
      const expectedObservable = of({ id: '123', name: 'Test Pub' });
      firestoreServiceMock.doc$.and.returnValue(expectedObservable);
      const result = service.getPubById('123');
      expect(result).toBe(expectedObservable);
    });
  });

  describe('getAllPubs', () => {
    const mockPubConverter = {
      toFirestore: jasmine.any(Function),
      fromFirestore: jasmine.any(Function),
    };

    beforeEach(() => {
      // Reset mocks before each test in this describe block if needed
      (collection as jest.Mock).mockClear();
      (getDocs as jest.Mock).mockClear();
    });

    it('should call collection with the correct path and converter', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ docs: [] }); // Mock getDocs to prevent errors during this test
      await service.getAllPubs();
      expect(collection).toHaveBeenCalledWith(jasmine.any(Object), 'pubs', mockPubConverter);
    });

    it('should process the snapshot and return the expected pub data', async () => {
      const mockSnapshot = {
        docs: [
          { id: '1', data: () => ({ name: 'Pub 1' }) },
          { id: '2', data: () => ({ name: 'Pub 2' }) },
        ],
      };
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const pubs = await service.getAllPubs();

      expect(getDocs).toHaveBeenCalled();
      expect(pubs).toEqual([
        { id: '1', name: 'Pub 1' },
        { id: '2', name: 'Pub 2' },
      ]);
    });

    it('should return an empty array for empty results', async () => {
      const mockSnapshot = {
        docs: [],
      };
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const pubs = await service.getAllPubs();

      expect(pubs).toEqual([]);
    });
  });
});
