import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SsrPlatformService } from '../../utils/ssr/ssr-platform.service';
import { RouterModule, Router } from '@angular/router';
import { LocationService } from '../../data-access/location.service';
import { ChipStatusComponent } from '../../ui/chips/chip-status/chip-status.component';
import { AuthStore } from '../../../auth/data-access/auth.store';

@Component({
  selector: 'app-nav',
  imports: [CommonModule, RouterModule, ChipStatusComponent],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  private readonly ssr = inject(SsrPlatformService);
  private readonly router = inject(Router);
  private readonly locationService = inject(LocationService);
  private readonly authStore = inject(AuthStore);
  readonly isMobile$$ = signal(false);

  // Expose auth state for template
  readonly user = this.authStore.user;
  readonly isAuthenticated = this.authStore.isAuthenticated;
  readonly isAnonymous = this.authStore.isAnonymous;

  // Expose location service signals for template
  readonly isMoving = this.locationService.isMoving;
  readonly isTracking = this.locationService.isTracking;
  readonly loading = this.locationService.loading;
  readonly movementSpeed = this.locationService.movementSpeed;

  constructor() {
    if (this.ssr.isBrowser) {
      const check = () => this.isMobile$$.set(window.innerWidth < 600);
      window.addEventListener('resize', check);
      check(); // initial
    }
  }

  startMovementDetection() {
    this.locationService.startMovementDetection();
  }

  stopMovementDetection() {
    this.locationService.stopMovementDetection();
  }
}
