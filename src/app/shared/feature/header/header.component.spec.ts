import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { MockAuthStore } from '../../../testing/store-mocks/mock-auth.store';
import { MockDataAggregatorService } from '../../../testing/store-mocks/mock-data-aggregator.service';
import { MockPanelStore } from '../../../testing/store-mocks/mock-panel.store';
import { MockViewportService } from '../../../testing/store-mocks/mock-viewport.service';
import { DataAggregatorService } from '../../data-access/data-aggregator.service';
import { ViewportService } from '../../data-access/viewport.service';
import { PanelStore } from '../../ui/panel/panel.store';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, RouterTestingModule],
      providers: [
        { provide: AuthStore, useClass: MockAuthStore },
        { provide: ViewportService, useClass: MockViewportService },
        { provide: PanelStore, useClass: MockPanelStore },
        { provide: DataAggregatorService, useClass: MockDataAggregatorService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
