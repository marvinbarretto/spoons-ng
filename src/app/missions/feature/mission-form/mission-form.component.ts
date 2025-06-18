// src/app/missions/feature/mission-form/mission-form.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { PubSelectorComponent } from '@shared/ui/pub-selector/pub-selector.component';
import { MissionStore } from '../../data-access/mission.store';
import { BaseComponent } from '../../../shared/data-access/base.component';
import type { Mission } from '../../utils/mission.model';

@Component({
  selector: 'app-mission-form',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, PubSelectorComponent],
  templateUrl: './mission-form.component.html',
  styleUrl: './mission-form.component.scss'
})
export class MissionFormComponent extends BaseComponent {
  // ✅ Dependencies
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly missionStore = inject(MissionStore);

  // ✅ Local state
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isSaving = signal<boolean>(false);
  private readonly _loadError = signal<string | null>(null);
  private readonly _missionId = signal<string | null>(null);
  private readonly _currentMission = signal<Mission | null>(null);
  private readonly _selectedPubIds = signal<string[]>([]);

  // ✅ Expose state for template
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly loadError = this._loadError.asReadonly();
  readonly selectedPubIds = this._selectedPubIds.asReadonly();

  // ✅ Form setup
  readonly missionForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    pointsReward: [25, [Validators.required, Validators.min(1), Validators.max(1000)]],
    timeLimitHours: [null as number | null],
    badgeRewardId: ['']
  });

  // ✅ Computed properties
  readonly isEditMode = computed(() => !!this._missionId());

  readonly hasFormErrors = computed(() =>
    this.missionForm.invalid && (this.missionForm.dirty || this.missionForm.touched)
  );

  readonly pubSelectionError = computed(() => {
    if (this.selectedPubIds().length === 0 && this.missionForm.dirty) {
      return 'At least one pub must be selected';
    }
    return '';
  });

  // ✅ Development helper
  readonly isDevelopment = computed(() => true);

  // ✅ Debug information
  readonly debugFormState = computed(() => ({
    valid: this.missionForm.valid,
    dirty: this.missionForm.dirty,
    touched: this.missionForm.touched,
    isEditMode: this.isEditMode(),
    isLoading: this.isLoading(),
    isSaving: this.isSaving(),
    selectedPubCount: this.selectedPubIds().length,
    formErrors: Object.keys(this.missionForm.controls).reduce((acc, key) => {
      const control = this.missionForm.get(key);
      if (control?.errors) {
        acc[key] = control.errors;
      }
      return acc;
    }, {} as Record<string, any>)
  }));

  readonly debugMissionData = computed(() => ({
    missionId: this._missionId(),
    currentMission: this._currentMission(),
    formValue: this.missionForm.getRawValue(),
    selectedPubIds: this.selectedPubIds()
  }));

  // ✅ Initialize component
  protected override onInit(): void {
    this.missionStore.loadOnce();
    this.setupRouteHandling();
  }

  // ✅ Route handling - no effect needed since route params are set on component load
  private setupRouteHandling(): void {
    const missionId = this.route.snapshot.paramMap.get('id');

    if (missionId && missionId !== 'new') {
      this._missionId.set(missionId);
      this.loadMissionForEdit(missionId);
    } else {
      this._missionId.set(null);
      this.setupNewMission();
    }
  }

  // ✅ Load existing mission for editing
  private async loadMissionForEdit(missionId: string): Promise<void> {
    this._isLoading.set(true);
    this._loadError.set(null);

    try {
      // Wait for missions to load if not already loaded
      await this.missionStore.loadOnce();

      const mission = this.missionStore.getMissionById(missionId);
      if (!mission) {
        throw new Error(`Mission with ID "${missionId}" not found`);
      }

      this._currentMission.set(mission);
      this.populateForm(mission);

      console.log('[MissionForm] ✅ Mission loaded for editing:', mission.name);
    } catch (error: any) {
      console.error('[MissionForm] ❌ Failed to load mission:', error);
      this._loadError.set(error?.message || 'Failed to load mission');
    } finally {
      this._isLoading.set(false);
    }
  }

  // ✅ Setup for new mission
  private setupNewMission(): void {
    this._currentMission.set(null);
    this.missionForm.reset();
    this._selectedPubIds.set([]);
    console.log('[MissionForm] Setup for new mission');
  }

  // ✅ Populate form with mission data
  private populateForm(mission: Mission): void {
    this.missionForm.patchValue({
      name: mission.name,
      description: mission.description,
      pointsReward: mission.pointsReward ?? 25, // Use default if missing
      timeLimitHours: mission.timeLimitHours ?? null,
      badgeRewardId: mission.badgeRewardId ?? ''
    });

    this._selectedPubIds.set([...mission.pubIds]);
  }

  // ✅ Form field validation helpers
  hasFieldError(fieldName: string): boolean {
    const field = this.missionForm.get(fieldName);
    return !!(field?.invalid && (field.dirty || field.touched));
  }

  // ✅ Event handlers
  handlePubSelectionChange(pubIds: string[]): void {
    this._selectedPubIds.set(pubIds);
    console.log('[MissionForm] Pub selection updated:', pubIds.length, 'pubs selected');
  }

  handleRetry(): void {
    const missionId = this._missionId();
    if (missionId) {
      this.loadMissionForEdit(missionId);
    }
  }

  handleCancel(): void {
    console.log('[MissionForm] Form cancelled, navigating back');
    this.router.navigate(['/admin/missions']);
  }

  // ✅ Form submission
  async handleSubmit(): Promise<void> {
    if (this.missionForm.invalid) {
      console.warn('[MissionForm] Form invalid, marking all fields as touched');
      this.missionForm.markAllAsTouched();
      return;
    }

    if (this.selectedPubIds().length === 0) {
      console.warn('[MissionForm] No pubs selected');
      this.showError('Please select at least one pub for this mission');
      return;
    }

    if (this.isSaving()) {
      console.log('[MissionForm] Already saving, skipping');
      return;
    }

    this._isSaving.set(true);

    try {
      const formValue = this.missionForm.getRawValue();

      // ✅ Build mission data with only defined fields
      const missionData: Mission = {
        id: this._missionId() || this.generateMissionId(formValue.name),
        name: formValue.name,
        description: formValue.description,
        pubIds: [...this.selectedPubIds()],
        pointsReward: formValue.pointsReward
      };

      // ✅ Only include optional fields if they have actual values
      if (formValue.timeLimitHours && formValue.timeLimitHours > 0) {
        missionData.timeLimitHours = formValue.timeLimitHours;
      }

      if (formValue.badgeRewardId && formValue.badgeRewardId.trim().length > 0) {
        missionData.badgeRewardId = formValue.badgeRewardId.trim();
      }

      console.log('[MissionForm] Mission data to save:', missionData);

      if (this.isEditMode()) {
        console.log('[MissionForm] Updating mission:', missionData.name);
        await this.missionStore.update(missionData);
        this.showSuccess(`Mission "${missionData.name}" updated successfully`);
      } else {
        console.log('[MissionForm] Creating mission:', missionData.name);
        await this.missionStore.create(missionData);
        this.showSuccess(`Mission "${missionData.name}" created successfully`);
      }

      console.log('[MissionForm] ✅ Form submission successful');
      this.router.navigate(['/admin/missions']);

    } catch (error: any) {
      console.error('[MissionForm] ❌ Form submission failed:', error);
      this.showError(error?.message || 'Failed to save mission');
    } finally {
      this._isSaving.set(false);
    }
  }

  // ✅ Generate mission ID from name
  private generateMissionId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) + '-' + Date.now().toString(36);
  }
}
