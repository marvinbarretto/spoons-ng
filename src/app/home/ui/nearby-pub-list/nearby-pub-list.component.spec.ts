import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NearbyPubListComponent } from './nearby-pub-list.component';

describe('NearbyPubListComponent', () => {
  let component: NearbyPubListComponent;
  let fixture: ComponentFixture<NearbyPubListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NearbyPubListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NearbyPubListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
