import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BadgesShowcaseComponent } from './badges-showcase.component';

describe('BadgesShowcaseComponent', () => {
  let component: BadgesShowcaseComponent;
  let fixture: ComponentFixture<BadgesShowcaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgesShowcaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BadgesShowcaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
