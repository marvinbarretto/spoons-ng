import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PubDetailComponent } from './pub-detail.component';

describe('PubDetailComponent', () => {
  let component: PubDetailComponent;
  let fixture: ComponentFixture<PubDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PubDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
