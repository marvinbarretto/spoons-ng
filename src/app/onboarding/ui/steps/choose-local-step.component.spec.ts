import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChooseLocalStepComponent } from './choose-local-step.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { HomePubSelectionWidgetComponent } from '../home-pub-selection-widget/home-pub-selection-widget.component';
import type { Pub } from '../../../pubs/utils/pub.models';

// Mock components
@Component({
  selector: 'app-button',
  template: '<button (click)="onClick.emit()" [disabled]="disabled()"><ng-content></ng-content></button>',
  standalone: true
})
class MockButtonComponent {
  onClick = output<void>();
  variant = input<string>();
  size = input<string>();
  disabled = input<boolean>(false);
}

@Component({
  selector: 'app-home-pub-selection-widget',
  template: '<div>Mock Pub Selection Widget</div>',
  standalone: true
})
class MockHomePubSelectionWidgetComponent {
  pubSelected = output<Pub | null>();
}

describe('ChooseLocalStepComponent', () => {
  let component: ChooseLocalStepComponent;
  let fixture: ComponentFixture<ChooseLocalStepComponent>;

  const mockPub: Pub = {
    id: 'pub-1',
    name: 'The Test Pub',
    city: 'Test City',
    region: 'Test Region',
    address: '123 Test St',
    lat: 51.5074,
    lng: -0.1278,
    managementCompany: null,
    checkinCount: 10,
    createdAt: new Date(),
    lastModified: new Date()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooseLocalStepComponent],
      providers: []
    })
    .overrideComponent(ChooseLocalStepComponent, {
      set: {
        imports: [MockButtonComponent, MockHomePubSelectionWidgetComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChooseLocalStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should show location notice when location not granted', () => {
      fixture.componentRef.setInput('locationGranted', false);
      fixture.componentRef.setInput('locationRequired', false);
      fixture.detectChanges();

      const notice = fixture.nativeElement.querySelector('.location-notice');
      expect(notice).toBeTruthy();
      expect(notice.textContent).toContain('We need location access to verify check-ins');
    });

    it('should show loading spinner when location is being requested', () => {
      fixture.componentRef.setInput('locationRequired', true);
      fixture.detectChanges();

      const loading = fixture.nativeElement.querySelector('.location-loading');
      expect(loading).toBeTruthy();
      expect(loading.textContent).toContain('Getting your location...');
    });

    it('should disable pub selection when location is being requested', () => {
      fixture.componentRef.setInput('locationRequired', true);
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.pub-selection-container');
      expect(container.classList.contains('disabled')).toBe(true);
    });
  });

  describe('Pub Selection', () => {
    it('should emit pubSelected when a pub is selected', () => {
      const pubSelectedSpy = jest.spyOn(component.pubSelected, 'emit');
      
      component.onPubSelected(mockPub);
      
      expect(pubSelectedSpy).toHaveBeenCalledWith(mockPub);
    });

    it('should show Continue button when pub is selected', () => {
      fixture.componentRef.setInput('selectedPub', mockPub);
      fixture.detectChanges();

      const continueBtn = fixture.nativeElement.querySelector('.step-actions app-button[variant="primary"]');
      expect(continueBtn.textContent).toContain('Continue');
    });

    it('should not show Continue button when no pub is selected', () => {
      fixture.componentRef.setInput('selectedPub', null);
      fixture.detectChanges();

      const continueBtn = fixture.nativeElement.querySelector('.step-actions app-button[variant="primary"]');
      expect(continueBtn).toBeFalsy();
    });
  });

  describe('Location Permission', () => {
    it('should emit locationRequested when Enable Location is clicked', () => {
      const locationRequestedSpy = jest.spyOn(component.locationRequested, 'emit');
      
      component.requestLocation();
      
      expect(locationRequestedSpy).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should emit back when Back button is clicked', () => {
      const backSpy = jest.spyOn(component.back, 'emit');
      
      const backBtn = fixture.nativeElement.querySelector('.step-actions app-button[variant="secondary"] button');
      backBtn.click();
      
      expect(backSpy).toHaveBeenCalled();
    });

    it('should emit complete when Continue is clicked with selected pub', () => {
      const completeSpy = jest.spyOn(component.complete, 'emit');
      fixture.componentRef.setInput('selectedPub', mockPub);
      
      component.onContinue();
      
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should disable navigation buttons when requesting location', () => {
      fixture.componentRef.setInput('locationRequired', true);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.step-actions app-button');
      buttons.forEach((btn: HTMLElement) => {
        expect(btn.getAttribute('ng-reflect-disabled')).toBe('true');
      });
    });
  });

  describe('Console Logging', () => {
    it('should log when pub is selected', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      component.onPubSelected(mockPub);
      
      expect(consoleSpy).toHaveBeenCalledWith('[ChooseLocalStep] Pub selected:', 'The Test Pub');
    });

    it('should log when location permission is requested', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      component.requestLocation();
      
      expect(consoleSpy).toHaveBeenCalledWith('[ChooseLocalStep] Location permission requested');
    });

    it('should log when continuing with selected pub', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      fixture.componentRef.setInput('selectedPub', mockPub);
      
      component.onContinue();
      
      expect(consoleSpy).toHaveBeenCalledWith('[ChooseLocalStep] Continuing with selected pub:', 'The Test Pub');
    });

    it('should log when continuing without pub selection', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      fixture.componentRef.setInput('selectedPub', null);
      
      component.onContinue();
      
      expect(consoleSpy).toHaveBeenCalledWith('[ChooseLocalStep] Cannot continue without pub selection');
    });
  });
});

// Add missing import
import { Component, input, output } from '@angular/core';