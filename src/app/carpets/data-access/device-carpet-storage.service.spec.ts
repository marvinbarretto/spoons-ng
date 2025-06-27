import { TestBed } from '@angular/core/testing';
import { DeviceCarpetStorageService } from './device-carpet-storage.service';
import { IndexedDbService } from '@shared/data-access/indexed-db.service';
import { AuthStore } from '@auth/data-access/auth.store';
import { CarpetPhotoData } from '@shared/utils/carpet-photo.models';
import { Pub } from '../../pubs/utils/pub.models';

describe('DeviceCarpetStorageService', () => {
  let service: DeviceCarpetStorageService;
  let mockIndexedDb: jest.Mocked<IndexedDbService>;
  let mockAuthStore: jest.Mocked<AuthStore>;

  const mockPub: Pub = {
    id: 'test-pub-123',
    name: 'The Test Tavern',
    address: '123 Test Street',
    location: { lat: 51.5074, lng: -0.1278 }
  };

  const mockPhotoData: CarpetPhotoData = {
    filename: 'test-carpet.webp',
    format: 'webp',
    sizeKB: 45,
    blob: new Blob(['fake-image-data'], { type: 'image/webp' }),
    metadata: {
      timestamp: new Date().toISOString(),
      deviceInfo: { userAgent: 'test' },
      imageInfo: { width: 400, height: 400, format: 'webp', sizeKB: 45 }
    }
  };

  beforeEach(() => {
    const indexedDbMock = {
      openDatabase: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllKeys: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStorageEstimate: jest.fn()
    } as jest.Mocked<IndexedDbService>;

    const authStoreMock = {
      uid: jest.fn().mockReturnValue('test-user-123')
    } as jest.Mocked<AuthStore>;

    TestBed.configureTestingModule({
      providers: [
        DeviceCarpetStorageService,
        { provide: IndexedDbService, useValue: indexedDbMock },
        { provide: AuthStore, useValue: authStoreMock }
      ]
    });

    service = TestBed.inject(DeviceCarpetStorageService);
    mockIndexedDb = TestBed.inject(IndexedDbService) as jest.Mocked<IndexedDbService>;
    mockAuthStore = TestBed.inject(AuthStore) as jest.Mocked<AuthStore>;

    // Setup default successful responses
    mockIndexedDb.openDatabase.mockResolvedValue(undefined);
    mockIndexedDb.put.mockResolvedValue(undefined);
    mockIndexedDb.getAll.mockResolvedValue([]);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('savePhotoFromCarpetData', () => {
    it('should save carpet photo with correct pub name', async () => {
      // Arrange
      jest.spyOn(service, 'initialize').mockResolvedValue();

      // Act
      await service.savePhotoFromCarpetData(mockPhotoData, mockPub);

      // Assert
      expect(mockIndexedDb.put).toHaveBeenCalledWith(
        expect.any(String), // database name
        expect.any(String), // store name
        expect.objectContaining({
          userId: 'test-user-123',
          pubId: 'test-pub-123',
          pubName: 'The Test Tavern',
          blob: mockPhotoData.blob,
          size: mockPhotoData.blob.size,
          type: 'image/webp'
        }),
        expect.any(String) // key
      );
    });

    it('should use correct key format for carpet storage', async () => {
      // Arrange
      jest.spyOn(service, 'initialize').mockResolvedValue();
      
      // Act
      await service.savePhotoFromCarpetData(mockPhotoData, mockPub);

      // Assert
      const expectedKeyPattern = /^test-user-123_test-pub-123_test-carpet$/;
      const putCall = mockIndexedDb.put.mock.calls[0];
      const actualKey = putCall[3];
      
      expect(actualKey).toMatch(expectedKeyPattern);
    });

    it('should throw error when user is not authenticated', async () => {
      // Arrange
      mockAuthStore.uid.mockReturnValue(null);
      jest.spyOn(service, 'initialize').mockResolvedValue();

      // Act & Assert
      await expect(
        service.savePhotoFromCarpetData(mockPhotoData, mockPub)
      ).rejects.toThrow('User must be authenticated to save photos');
    });

    it('should handle different pub names correctly', async () => {
      // Arrange
      const pubWithSpecialChars: Pub = {
        ...mockPub,
        id: 'special-pub',
        name: "O'Malley's Café & Pub"
      };
      jest.spyOn(service, 'initialize').mockResolvedValue();

      // Act
      await service.savePhotoFromCarpetData(mockPhotoData, pubWithSpecialChars);

      // Assert
      expect(mockIndexedDb.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          pubId: 'special-pub',
          pubName: "O'Malley's Café & Pub"
        }),
        expect.any(String)
      );
    });
  });
});