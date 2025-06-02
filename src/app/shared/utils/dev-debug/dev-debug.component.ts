import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { environment } from '../../../../environments/environment';
import { PanelStore } from '../../ui/panel/panel.store';
import { ViewportService } from '../../data-access/viewport.service';
import { DeviceCapabilityService } from '../device-capability-check.service';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';
import { BaseComponent } from '../../data-access/base.component';

@Component({
  selector: 'app-dev-debug',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './dev-debug.component.html',
  styleUrl: './dev-debug.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevDebugComponent extends BaseComponent {
  private readonly _authStore = inject(AuthStore);
  private readonly _checkinStore = inject(CheckinStore);
  private readonly _pubStore = inject(PubStore);
  private readonly _panelStore = inject(PanelStore);
  private readonly _viewport = inject(ViewportService);
  private readonly _device = inject(DeviceCapabilityService);
  private readonly _nearbyPubStore = inject(NearbyPubStore);

  readonly isDev = !environment.production;

  // Expose store signals to template
  readonly user = this._authStore.user;
  readonly token = this._authStore.token;
  readonly isMobile = this._viewport.isMobile;
  readonly isTouchDevice = this._device.isTouchDevice;
  readonly isLowPowerDevice = this._device.isLowPowerDevice;
  readonly deviceMemoryGB = this._device.deviceMemoryGB;
  readonly activePanel = this._panelStore.activePanel;
  readonly location = this._nearbyPubStore.location;
  readonly closestPub = this._nearbyPubStore.closestPub;
  readonly checkins = this._checkinStore.checkins;
  readonly latestCheckin = this._checkinStore.checkinSuccess;
  readonly pubs = this._pubStore.pubs;

  // Computed signals
  readonly canCheckIn = computed(() => {
    const pub = this.closestPub();
    return pub ? this._checkinStore.canCheckInToPub(pub.id) : false;
  });

  readonly landlordPubsList = computed(() => {
    const pubs = this.pubs();
    const user = this.user();
    if (!user) return [];
    return pubs.filter((pub) => pub.todayLandlord?.userId === user.uid);
  });

  readonly uniqueVisitedPubsList = computed(() => {
    const checkins = this.checkins();
    const pubs = this.pubs();
    const user = this.user();
    console.log('[DEBUG] Signals triggered:', {
      user,
      checkinsCount: checkins.length,
      pubsCount: pubs.length,
    });
    if (!user || !checkins.length || !pubs.length) return [];
    const pubIds = new Set(checkins.map((c) => c.pubId));
    return pubs.filter((pub) => pubIds.has(pub.id));
  });

  resetPubs(): void {
    this._pubStore.reset();
  }

  resetCheckins(): void {
    const user = this.user();
    if (user) {
      this._checkinStore.reset();
      this._checkinStore.loadOnce();
    } else {
      console.warn('[DevDebug] No user available to reload check-ins');
    }
  }
}
