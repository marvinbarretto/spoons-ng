import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChipUserComponent, UserChipData } from './chip-user.component';

describe('ChipUserComponent', () => {
  let component: ChipUserComponent;
  let fixture: ComponentFixture<ChipUserComponent>;

  const mockUser: UserChipData = {
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: 'https://example.com/avatar.jpg',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipUserComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipUserComponent);
    component = fixture.componentInstance;

    // Set required input
    fixture.componentRef.setInput('user', mockUser);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user name when showName is true', () => {
    fixture.componentRef.setInput('showName', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Test User');
  });

  it('should hide user name when showName is false', () => {
    fixture.componentRef.setInput('showName', false);
    fixture.detectChanges();

    const nameElement = fixture.nativeElement.querySelector('.chip-text');
    expect(nameElement).toBeFalsy();
  });

  it('should apply correct size classes', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();

    const chipElement = fixture.nativeElement.querySelector('.chip-user');
    expect(chipElement.classList).toContain('size--lg');
  });

  it('should apply clickable class when clickable is true', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();

    const chipElement = fixture.nativeElement.querySelector('.chip-user');
    expect(chipElement.classList).toContain('clickable');
  });

  it('should emit clicked event when clicked and clickable', () => {
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();

    const clickedSpy = jest.fn();
    component.clicked.subscribe(clickedSpy);

    const chipElement = fixture.nativeElement.querySelector('.chip-user');
    chipElement.click();

    expect(clickedSpy).toHaveBeenCalledWith(mockUser);
  });

  it('should not emit clicked event when not clickable', () => {
    fixture.componentRef.setInput('clickable', false);
    fixture.detectChanges();

    const clickedSpy = jest.fn();
    component.clicked.subscribe(clickedSpy);

    const chipElement = fixture.nativeElement.querySelector('.chip-user');
    chipElement.click();

    expect(clickedSpy).not.toHaveBeenCalled();
  });

  it('should use fallback avatar for anonymous users', () => {
    const anonymousUser: UserChipData = {
      displayName: 'Anonymous-123',
      email: null,
    };

    fixture.componentRef.setInput('user', anonymousUser);
    fixture.detectChanges();

    const avatarUrl = component.avatarUrl();
    expect(avatarUrl).toBe('assets/avatars/npc.webp');
  });
});
