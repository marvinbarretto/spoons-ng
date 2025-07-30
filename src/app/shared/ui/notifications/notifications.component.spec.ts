import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationService } from '../../data-access/notification.service';
import { NotificationsComponent } from './notifications.component';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotificationsComponent, CommonModule],
      providers: [NotificationService],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dismiss notification', () => {
    const id = '1';
    component.dismiss(id);
    expect(component.messages).not.toContain(id);
  });

  it('should track by id', () => {
    const id = '1';
    expect(
      component.trackById(0, { id, type: 'info', message: 'test', sticky: true, timeout: 1000 })
    ).toBe(id);
  });
});
