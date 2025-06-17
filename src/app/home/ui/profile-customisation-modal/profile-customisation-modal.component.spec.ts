import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileCustomisationModalComponent as ProfileCustomisationModalComponent } from './profile-customisation-modal.component';

describe('ProfileCustomisationModalComponent', () => {
  let component: ProfileCustomisationModalComponent;
  let fixture: ComponentFixture<ProfileCustomisationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileCustomisationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileCustomisationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
