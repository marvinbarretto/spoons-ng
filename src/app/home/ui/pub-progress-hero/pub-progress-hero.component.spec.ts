import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PubProgressHeroComponent } from './pub-progress-hero.component';

describe('PubProgressHeroComponent', () => {
  let component: PubProgressHeroComponent;
  let fixture: ComponentFixture<PubProgressHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubProgressHeroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PubProgressHeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
