import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareContainerComponent } from './share-container.component';

describe('ShareContainerComponent', () => {
  let component: ShareContainerComponent;
  let fixture: ComponentFixture<ShareContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareContainerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShareContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
