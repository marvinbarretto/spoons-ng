import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NearestPubComponent } from './nearest-pubs.component';

describe('NearestPubComponent', () => {
  let component: NearestPubComponent;
  let fixture: ComponentFixture<NearestPubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NearestPubComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NearestPubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
