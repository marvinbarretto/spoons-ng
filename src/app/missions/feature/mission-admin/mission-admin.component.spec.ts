import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissionAdminComponent } from './mission-admin.component';

describe('MissionAdminComponent', () => {
  let component: MissionAdminComponent;
  let fixture: ComponentFixture<MissionAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissionAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
