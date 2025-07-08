// src/app/check-in/feature/simplified-checkin/simplified-checkin.component.ts

import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '@shared/base/base.component';
import { SimplifiedCheckinOrchestrator } from '../../data-access/simplified-checkin-orchestrator.service';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { CheckInStore } from '../../data-access/check-in.store';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-simplified-checkin',
  imports: [CommonModule],
  templateUrl: './simplified-checkin.component.html',
  styleUrl: './simplified-checkin.component.scss'
})
export class SimplifiedCheckinComponent extends BaseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  // ===================================
  // 🏗️ DEPENDENCIES
  // ===================================
  
  private readonly route = inject(ActivatedRoute);
  private readonly pubStore = inject(PubStore);
  private readonly checkinStore = inject(CheckInStore);
  
  // Main orchestrator
  protected readonly orchestrator = inject(SimplifiedCheckinOrchestrator);

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
    console.log('[SimplifiedCheckin] 🎬 Component initialized');
  }

  override ngOnInit(): void {
    super.ngOnInit();
    
    // Get pub ID from route
    const pubId = this.route.snapshot.paramMap.get('pubId');
    
    if (!pubId) {
      console.error('[SimplifiedCheckin] ❌ No pub ID provided');
      this.orchestrator.stopCheckin();
      return;
    }

    console.log('[SimplifiedCheckin] 🚀 Starting check-in for pub:', pubId);
    
    // Start the check-in process
    this.orchestrator.startCheckin(pubId);
  }

  ngAfterViewInit(): void {
    console.log('[SimplifiedCheckin] 📹 View initialized');
    
    // Connect video element to orchestrator when available
    if (this.videoElement?.nativeElement) {
      this.orchestrator.setVideoElement(this.videoElement.nativeElement);
    }
  }

  ngOnDestroy(): void {
    console.log('[SimplifiedCheckin] 🚪 Component destroyed');
    this.orchestrator.cleanup();
  }

  // ===================================
  // 🎯 TEMPLATE METHODS
  // ===================================

  protected onExitClick(): void {
    console.log('[SimplifiedCheckin] 🚪 Exit clicked');
    this.orchestrator.stopCheckin();
  }

  protected onRetryClick(): void {
    console.log('[SimplifiedCheckin] 🔄 Retry clicked');
    this.orchestrator.retryCheckin();
  }

  protected onContinueClick(): void {
    console.log('[SimplifiedCheckin] ➡️ Continue clicked');
    this.orchestrator.stopCheckin();
  }
}