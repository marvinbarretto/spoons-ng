import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NearestPubItemComponent } from './nearest-pubs-item.component';

describe('NearestPubItemComponent', () => {
  let component: NearestPubItemComponent;
  let fixture: ComponentFixture<NearestPubItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NearestPubItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NearestPubItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
