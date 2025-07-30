import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PubSelectorComponent } from './pub-selector.component';

describe('PubSelectorComponent', () => {
  let component: PubSelectorComponent;
  let fixture: ComponentFixture<PubSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PubSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
