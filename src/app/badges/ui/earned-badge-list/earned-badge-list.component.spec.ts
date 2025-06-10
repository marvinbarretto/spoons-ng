import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EarnedBadgeListComponent } from './earned-badge-list.component';

describe('EarnedBadgeListComponent', () => {
  let component: EarnedBadgeListComponent;
  let fixture: ComponentFixture<EarnedBadgeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarnedBadgeListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EarnedBadgeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
