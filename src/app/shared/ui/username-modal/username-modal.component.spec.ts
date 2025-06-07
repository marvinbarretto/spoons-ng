import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsernameModalComponent } from './username-modal.component';

describe('UsernameModalComponent', () => {
  let component: UsernameModalComponent;
  let fixture: ComponentFixture<UsernameModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsernameModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsernameModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
