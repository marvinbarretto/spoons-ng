import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewLeaderboardContainerComponent } from './new-leaderboard-container.component';

describe('NewLeaderboardContainerComponent', () => {
  let component: NewLeaderboardContainerComponent;
  let fixture: ComponentFixture<NewLeaderboardContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewLeaderboardContainerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NewLeaderboardContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});