import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PubCountHeroComponent } from './pub-count-hero.component';

describe('PubCountHeroComponent', () => {
  let component: PubCountHeroComponent;
  let fixture: ComponentFixture<PubCountHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubCountHeroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PubCountHeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
