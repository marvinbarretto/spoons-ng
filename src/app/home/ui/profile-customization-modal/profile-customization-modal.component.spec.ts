import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileCustomizationModalComponent } from './profile-customization-modal.component';

describe('ProfileCustomizationModalComponent', () => {
  let component: ProfileCustomizationModalComponent;
  let fixture: ComponentFixture<ProfileCustomizationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileCustomizationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileCustomizationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
