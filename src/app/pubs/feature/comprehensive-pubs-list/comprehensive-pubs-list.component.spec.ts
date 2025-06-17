import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComprehensivePubsListComponent } from './comprehensive-pubs-list.component';

describe('ComprehensivePubsListComponent', () => {
  let component: ComprehensivePubsListComponent;
  let fixture: ComponentFixture<ComprehensivePubsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComprehensivePubsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComprehensivePubsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
