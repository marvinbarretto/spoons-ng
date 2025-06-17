import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountUpgradeWidgetComponent } from './account-upgrade-widget.component';

describe('AccountUpgradeWidgetComponent', () => {
  let component: AccountUpgradeWidgetComponent;
  let fixture: ComponentFixture<AccountUpgradeWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountUpgradeWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountUpgradeWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
