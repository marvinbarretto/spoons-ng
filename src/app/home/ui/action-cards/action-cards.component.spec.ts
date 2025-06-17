import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionCardsComponent } from './action-cards.component';

describe('ActionCardsComponent', () => {
  let component: ActionCardsComponent;
  let fixture: ComponentFixture<ActionCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionCardsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
