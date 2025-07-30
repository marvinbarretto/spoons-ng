import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthStore } from '../../../../../auth/data-access/auth.store';
import { CacheCoherenceService } from '../../../../../shared/data-access/cache-coherence.service';
import {
  MockAuthStore,
  MockCacheCoherenceService,
  MockUserService,
  MockUserStore,
} from '../../../../../testing/store-mocks';
import { UserService } from '../../../../../users/data-access/user.service';
import { UserStore } from '../../../../../users/data-access/user.store';
import { AvatarSelectionWidgetComponent } from './avatar-selection-widget.component';

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
        { provide: CacheCoherenceService, useClass: MockCacheCoherenceService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarSelectionWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
