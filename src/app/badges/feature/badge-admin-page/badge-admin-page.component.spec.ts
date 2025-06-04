import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BadgeAdminPageComponent } from './badge-admin-page.component';

describe('BadgeAdminPageComponent', () => {
  let component: BadgeAdminPageComponent;
  let fixture: ComponentFixture<BadgeAdminPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeAdminPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BadgeAdminPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
