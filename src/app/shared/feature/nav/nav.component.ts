import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SsrPlatformService } from '../../utils/ssr/ssr-platform.service';
import { RouterModule, Router } from '@angular/router';
import { LocationService } from '../../data-access/location.service';

@Component({
  selector: 'app-nav',
  imports: [CommonModule, RouterModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  private readonly ssr = inject(SsrPlatformService);
  private readonly router = inject(Router);
  private readonly locationService = inject(LocationService);
  readonly isMobile$$ = signal(false);

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
