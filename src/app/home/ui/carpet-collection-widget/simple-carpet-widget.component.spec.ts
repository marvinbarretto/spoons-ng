import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SimpleCarpetWidgetComponent } from './simple-carpet-widget.component';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { CarpetStorageService } from '../../../carpets/data-access/carpet-storage.service';

describe('SimpleCarpetWidgetComponent', () => {
  let component: SimpleCarpetWidgetComponent;
  let fixture: ComponentFixture<SimpleCarpetWidgetComponent>;
  let mockAuthStore: Partial<AuthStore>;
  let mockCarpetStorage: Partial<CarpetStorageService>;

  beforeEach(async () => {
    // Create mock objects with signals
    mockAuthStore = {
      user: signal(null)
    };

    mockCarpetStorage = {
      getUserCarpets: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SimpleCarpetWidgetComponent],
      providers: [
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: CarpetStorageService, useValue: mockCarpetStorage }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleCarpetWidgetComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadCarpets', () => {
    it('should load carpets when user exists (even if anonymous)', async () => {
      // Arrange: Set up a user (anonymous or authenticated doesn't matter)
      const mockUser = {
        uid: 'test-user-123',
        isAnonymous: true,
        displayName: null
      };
      mockAuthStore.user.set(mockUser);

      const mockCarpetData = [
        {
          userId: 'test-user-123',
          pubId: 'pub1',
          pubName: 'Test Pub',
          date: '2024-01-01',
          dateKey: '2024-01-01',
          blob: new Blob(['test'], { type: 'image/jpeg' }),
          size: 1000,
          type: 'image/jpeg',
          width: 100,
          height: 100
        }
      ];
      (mockCarpetStorage.getUserCarpets as jest.Mock).mockReturnValue(Promise.resolve(mockCarpetData));

      // Act: Load carpets
      await component.loadCarpets();

      // Assert: Should have called getUserCarpets and loaded the carpets
      expect(mockCarpetStorage.getUserCarpets).toHaveBeenCalled();
      expect(component.carpets().length).toBe(1);
      expect(component.carpets()[0].pubName).toBe('Test Pub');
    });

    it('should NOT load carpets when no user exists', async () => {
      // Arrange: No user
      mockAuthStore.user!.set(null);

      // Act: Load carpets
      await component.loadCarpets();

      // Assert: Should not call getUserCarpets
      expect(mockCarpetStorage.getUserCarpets).not.toHaveBeenCalled();
      expect(component.carpets().length).toBe(0);
    });

    it('should load carpets for authenticated users', async () => {
      // Arrange: Authenticated user
      const mockUser = {
        uid: 'authenticated-user-456',
        isAnonymous: false,
        displayName: 'John Doe'
      };
      mockAuthStore.user!.set(mockUser);

      (mockCarpetStorage.getUserCarpets as jest.Mock).mockReturnValue(Promise.resolve([]));

      // Act: Load carpets
      await component.loadCarpets();

      // Assert: Should call getUserCarpets for authenticated users
      expect(mockCarpetStorage.getUserCarpets).toHaveBeenCalled();
    });
  });
});
