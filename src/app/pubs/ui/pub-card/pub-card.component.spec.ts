import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PubCardComponent } from './pub-card.component';

describe('PubCardComponent', () => {
  let component: PubCardComponent;
  let fixture: ComponentFixture<PubCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PubCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
