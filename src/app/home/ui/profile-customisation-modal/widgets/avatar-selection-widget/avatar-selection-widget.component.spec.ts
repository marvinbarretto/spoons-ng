import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarSelectionWidgetComponent } from './avatar-selection-widget.component';
import { 
  MockAuthStore, 
  MockUserStore,
  MockUserService,
  MockCacheCoherenceService
} from '../../../../../testing/store-mocks';
import { AuthStore } from '../../../../../auth/data-access/auth.store';
import { UserStore } from '../../../../../users/data-access/user.store';
import { UserService } from '../../../../../users/data-access/user.service';
import { CacheCoherenceService } from '../../../../../shared/data-access/cache-coherence.service';

describe('AvatarSelectionWidgetComponent', () => {
  let component: AvatarSelectionWidgetComponent;
  let fixture: ComponentFixture<AvatarSelectionWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarSelectionWidgetComponent],
      providers: [
        { provide: AuthStore, useClass: MockAuthStore },
        { provide: UserStore, useClass: MockUserStore },
        { provide: UserService, useClass: MockUserService },
        { provide: CacheCoherenceService, useClass: MockCacheCoherenceService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvatarSelectionWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
