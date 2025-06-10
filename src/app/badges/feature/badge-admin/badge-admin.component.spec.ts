import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BadgeAdminComponent } from './badge-admin.component';

describe('BadgeAdminComponent', () => {
  let component: BadgeAdminComponent;
  let fixture: ComponentFixture<BadgeAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BadgeAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
