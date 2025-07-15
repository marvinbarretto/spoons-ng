import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@shared/base/base.component';
import { CheckinOrchestrator } from '../../data-access/checkin-orchestrator.service';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { CheckInStore } from '../../data-access/check-in.store';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-checkin',
  imports: [CommonModule],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.scss'
})
export class CheckinComponent extends BaseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cameraVideo', { static: false }) cameraVideo!: ElementRef<HTMLVideoElement>;

  // ===================================
  // 🏗️ DEPENDENCIES
  // ===================================
  
  private readonly pubStore = inject(PubStore);
  private readonly checkinStore = inject(CheckInStore);
  private readonly nearbyPubStore = inject(NearbyPubStore);
  
  // Main orchestrator
  protected readonly orchestrator = inject(CheckinOrchestrator);

  // ===================================
  // 🔍 COMPUTED SIGNALS FOR TEMPLATE
  // ===================================

  protected readonly pubName = computed(() => {
    const pubId = this.orchestrator.pubId();
    if (!pubId) return 'Unknown Pub';
    
    const pub = this.pubStore.get(pubId);
    return pub?.name || 'Unknown Pub';
  });

  protected readonly pointsEarned = computed(() => {
    const result = this.checkinStore.checkinResults();
    return result?.success ? (result.points?.total || 0) : 0;
  });

  protected readonly badgesEarned = computed(() => {
    const result = this.checkinStore.checkinResults();
    return result?.success ? (result.badges || []) : [];
  });

  protected readonly isDevelopment = computed(() => environment.ACTIVE_DEVELOPMENT_MODE);

  // ===================================
  // 🚀 LIFECYCLE
  // ===================================

  constructor() {
    super();
    console.log('[CheckinComponent] 🎬 Component initialized');
  }

  override ngOnInit(): void {
    super.ngOnInit();
    
    // Get pub from location services
    const pub = this.nearbyPubStore.closestPub();
    
    if (!pub) {
      console.error('[CheckinComponent] ❌ No nearby pub available');
      this.orchestrator.stopCheckin();
      return;
    }

    console.log('[CheckinComponent] 🚀 Check-in will start for pub:', pub.name);
    
    // Store pub ID for later use
    this.orchestrator.setPubId(pub.id);
  }

  ngAfterViewInit(): void {
    console.log('[CheckinComponent] 📹 View initialized');
    
    // Connect video element to orchestrator when available
    if (this.cameraVideo?.nativeElement) {
      this.orchestrator.setVideoElement(this.cameraVideo.nativeElement);
      
      // Now start the check-in process since video element is ready
      const pubId = this.orchestrator.pubId();
      if (pubId) {
        console.log('[CheckinComponent] 🚀 Starting check-in with video element ready');
        this.orchestrator.startCheckin(pubId);
      }
    }
  }

  ngOnDestroy(): void {
    console.log('[CheckinComponent] 🚪 Component destroyed');
    this.orchestrator.cleanup();
  }

  // ===================================
  // 🎯 TEMPLATE METHODS
  // ===================================

  protected onExitClick(): void {
    console.log('[CheckinComponent] 🚪 Exit clicked');
    this.orchestrator.stopCheckin();
  }

  protected onRetryClick(): void {
    console.log('[CheckinComponent] 🔄 Retry clicked');
    this.orchestrator.retryCheckin();
  }


  protected async onCaptureClick(): Promise<void> {
    console.log('[CheckinComponent] 📸 Capture photo clicked');
    await this.orchestrator.capturePhoto();
  }

  protected onRetakePhotoClick(): void {
    console.log('[CheckinComponent] 🔄 Retake photo clicked');
    this.orchestrator.retakePhoto();
  }
}