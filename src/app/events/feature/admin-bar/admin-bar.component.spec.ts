import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBarComponent } from './admin-bar.component';

describe('AdminBarComponent', () => {
  let component: AdminBarComponent;
  let fixture: ComponentFixture<AdminBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
