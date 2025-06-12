
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BaseComponent } from '@shared/data-access/base.component';
import { UserProgressionService } from '@shared/data-access/user-progression.service';
import { CheckinStore } from '@check-in/data-access/check-in.store';
import { CheckInStatusModalComponent } from '@check-in/ui/check-in-status-modal/check-in-status-modal.component';
import { LandlordStatusModalComponent } from '@landlord/ui/landlord-status-modal/landlord-status-modal.component';
import type { CheckInResultData } from '@check-in/utils/check-in.models';

@Component({
  selector: 'app-check-in-result-container',
  imports: [CheckInStatusModalComponent, LandlordStatusModalComponent],
  template: `
    @switch (currentModalType()) {
      @case ('checkin-status') {
        <app-check-in-status-modal
          [data]="checkinModalData()"
          [userStage]="userStage()"
          [autoNavigateProgress]="autoNavigateProgress()"
          (navigate)="handleNavigate()"
          (dismiss)="handleDismiss()"
          (cancelAutoNav)="cancelAutoNavigation()"
          (nextModal)="showLandlordModal()"
        />
      }
      @case ('landlord-status') {
        <app-landlord-status-modal
          [data]="landlordModalData()"
          [userStage]="userStage()"
          (navigate)="handleNavigate()"
          (dismiss)="handleDismiss()"
          (previousModal)="showCheckinModal()"
        />
      }
    }
  `
})
export class CheckInResultContainerComponent extends BaseComponent {
  readonly data = input.required<CheckInResultData>();

  private readonly router = inject(Router);
  private readonly userProgression = inject(UserProgressionService);
  private readonly checkinStore = inject(CheckinStore);

  // 📊 User progression context
  readonly userStage = this.userProgression.userStage;

  // 🎭 Modal flow management
  private readonly _currentModalType = signal<'checkin-status' | 'landlord-status'>('checkin-status');
  readonly currentModalType = this._currentModalType.asReadonly();

  // ⏱️ Auto-navigation state (10 seconds, subtle progress bar)
  private readonly _autoNavigateProgress = signal<number | null>(null);
  readonly autoNavigateProgress = this._autoNavigateProgress.asReadonly();
  private autoNavTimer?: number;

  // 🎬 Modal close callback (set by parent)
  closeModal: () => void = () => {};

  protected override onInit(): void {
    // Start auto-navigation if successful check-in
    if (this.data().success && this.data().pub?.id) {
      this.startAutoNavigation();
    }
  }

  // 📊 Computed modal data
  readonly checkinModalData = computed(() => ({
    success: this.data().success,
    pub: this.data().pub,
    error: this.data().error,
    badges: this.data().badges || [],
    checkinTime: this.data().checkin?.timestamp
  }));

  readonly landlordModalData = computed(() => ({
    isNewLandlord: this.data().isNewLandlord || false,
    landlordMessage: this.data().landlordMessage,
    pub: this.data().pub
  }));


  private startAutoNavigation(): void {
    this.platform.onlyOnBrowser(() => {
      let progress = 0;
      const interval = 100;
      const totalTime = 10000;
      const step = (interval / totalTime) * 100;

      this.autoNavTimer = setInterval(() => {
        progress += step;
        this._autoNavigateProgress.set(Math.min(progress, 100));

        if (progress >= 100) {
          this.handleNavigate();
        }
      }, interval) as unknown as number;
    });
  }

  cancelAutoNavigation(): void {
    this.platform.onlyOnBrowser(() => {
      if (this.autoNavTimer) {
        clearInterval(this.autoNavTimer);
        this.autoNavTimer = undefined;
        this._autoNavigateProgress.set(null);
      }
    });
  }

  // 🎭 Modal flow methods
  showCheckinModal(): void {
    this._currentModalType.set('checkin-status');
  }

  showLandlordModal(): void {
    this._currentModalType.set('landlord-status');
  }

  // 🎬 User actions
  handleNavigate(): void {
    this.cancelAutoNavigation();
    const pubId = this.data().pub?.id;
    if (pubId) {
      this.router.navigate(['/pubs', pubId]);
      this.closeModal();
    }
  }

  handleDismiss(): void {
    this.cancelAutoNavigation();
    this.closeModal();
  }
}
