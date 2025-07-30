import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LlmTestComponent } from './llm-test.component';

describe('LlmTestComponent', () => {
  let component: LlmTestComponent;
  let fixture: ComponentFixture<LlmTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LlmTestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LlmTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
