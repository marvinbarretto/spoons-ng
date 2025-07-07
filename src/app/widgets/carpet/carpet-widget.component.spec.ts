import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CarpetWidgetComponent } from './carpet-widget.component';
import { CarpetStorageService } from '@carpets/data-access/carpet-storage.service';
import { AuthStore } from '@auth/data-access/auth.store';

describe('CarpetWidgetComponent', () => {
  let component: CarpetWidgetComponent;
  let fixture: ComponentFixture<CarpetWidgetComponent>;
  let mockCarpetStorageService: jasmine.SpyObj<CarpetStorageService>;
  let mockAuthStore: jasmine.SpyObj<AuthStore>;

  beforeEach(async () => {
    const carpetStorageSpy = jasmine.createSpyObj('CarpetStorageService', [
      'initialize',
      'getUserCarpets'
    ]);

    const authStoreSpy = jasmine.createSpyObj('AuthStore', [], {
      user: signal(null)
    });

    await TestBed.configureTestingModule({
      imports: [CarpetWidgetComponent],
      providers: [
        { provide: CarpetStorageService, useValue: carpetStorageSpy },
        { provide: AuthStore, useValue: authStoreSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CarpetWidgetComponent);
    component = fixture.componentInstance;
    mockCarpetStorageService = TestBed.inject(CarpetStorageService) as jasmine.SpyObj<CarpetStorageService>;
    mockAuthStore = TestBed.inject(AuthStore) as jasmine.SpyObj<AuthStore>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state when no carpets', () => {
    mockCarpetStorageService.getUserCarpets.and.returnValue(Promise.resolve([]));
    fixture.detectChanges();
    
    const emptyElement = fixture.nativeElement.querySelector('.widget-empty');
    expect(emptyElement).toBeTruthy();
    expect(emptyElement.textContent).toContain('No carpets collected yet');
  });

  it('should display carpet count when carpets exist', async () => {
    const mockCarpets = [
      {
        userId: 'user1',
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

    mockCarpetStorageService.initialize.and.returnValue(Promise.resolve());
    mockCarpetStorageService.getUserCarpets.and.returnValue(Promise.resolve(mockCarpets));
    
    // Simulate user login
    const userSignal = signal({ uid: 'user1', isAnonymous: false });
    Object.defineProperty(mockAuthStore, 'user', { value: userSignal });
    
    fixture.detectChanges();
    await fixture.whenStable();
    
    const countElement = fixture.nativeElement.querySelector('.count');
    expect(countElement?.textContent).toContain('1 carpets collected');
  });

  it('should handle image load errors gracefully', () => {
    const imgElement = document.createElement('img');
    component.onImageError({ target: imgElement } as any);
    
    expect(imgElement.style.display).toBe('none');
  });

  it('should format dates correctly', () => {
    const formattedDate = component.formatDate('2024-01-15T10:30:00Z');
    expect(formattedDate).toMatch(/15 Jan/);
  });
});