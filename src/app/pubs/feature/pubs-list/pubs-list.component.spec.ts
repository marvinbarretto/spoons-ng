import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PubsListComponent } from './pubs-list.component';

describe('PubsListComponent', () => {
  let component: PubsListComponent;
  let fixture: ComponentFixture<PubsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PubsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
