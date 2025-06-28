import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CarpetScannerComponent } from '../carpet-scanner/carpet-scanner.component';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { NewCheckinStore } from '../../../new-checkin/data-access/new-checkin.store';
import { DeviceCarpetStorageService } from '../../../carpets/data-access/device-carpet-storage.service';
import { CarpetPhotoData } from '@shared/utils/carpet-photo.models';

@Component({
  selector: 'app-check-in-page',
  imports: [CarpetScannerComponent],
  template: `
    <div class="check-in-page">
      <app-carpet-scanner
        (carpetConfirmed)="onCarpetConfirmed($event)"
        (exitScanner)="onExitScanner()"
      />
    </div>
  `,
  styles: `
    .check-in-page {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1000;
      background: #000;
    }
  `
})
export class CheckInPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly pubStore = inject(PubStore);
  private readonly newCheckinStore = inject(NewCheckinStore);
  private readonly carpetStorageService = inject(DeviceCarpetStorageService);

  private readonly pubId = signal<string | null>(null);

  constructor() {
    // Modal system handles navigation when user dismisses modal
    // No need for complex timeout logic here
  }

  ngOnInit(): void {
    // Get pub ID from route params
    const pubIdParam = this.route.snapshot.paramMap.get('pubId');
    
    if (!pubIdParam) {
      console.error('[CheckInPage] No pub ID provided, navigating to homepage');
      this.router.navigate(['/']);
      return;
    }

    this.pubId.set(pubIdParam);
    console.log('[CheckInPage] Starting check-in flow for pub:', pubIdParam);

    // Start the check-in process
    this.newCheckinStore.checkinToPub(pubIdParam);
  }

  async onCarpetConfirmed(photoData: CarpetPhotoData): Promise<void> {
    console.log('[CheckInPage] Carpet confirmed:', photoData);

    try {
      const pubId = this.pubId();
      const pub = pubId ? this.pubStore.get(pubId) : null;

      if (!pub) {
        throw new Error(`Pub not found for check-in: ${pubId}`);
      }

      // Save the carpet photo
      await this.carpetStorageService.savePhotoFromCarpetData(photoData, pub);
      console.log('[CheckInPage] Photo saved successfully');

      // Process the carpet scan result
      this.newCheckinStore.processCarpetScanResult(photoData.filename);

      console.log('[CheckInPage] Carpet processing complete');

    } catch (error) {
      console.error('[CheckInPage] Error processing carpet:', error);
      // Could show error message here
    }
  }

  onExitScanner(): void {
    console.log('[CheckInPage] Exiting check-in flow');
    
    // Clear any processing state
    if (this.newCheckinStore.needsCarpetScan()) {
      this.newCheckinStore.processCarpetScanResult(undefined);
    }

    // Navigate back to homepage
    this.router.navigate(['/']);
  }
}