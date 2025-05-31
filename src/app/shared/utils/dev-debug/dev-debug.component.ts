import { Component, computed, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { AuthStore } from '../../../auth/data-access/auth.store';
import { environment } from '../../../../environments/environment';
import { PanelStore } from '../../ui/panel/panel.store';
import { ViewportService } from '../../data-access/viewport.service';
import { DeviceCapabilityService } from '../device-capability-check.service';
import { NearbyPubStore } from '../../../pubs/data-access/nearby-pub.store';
import { CheckinStore } from '../../../check-in/data-access/check-in.store';
import { PubStore } from '../../../pubs/data-access/pub.store';

@Component({
  selector: 'app-dev-debug',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './dev-debug.component.html',
  styleUrl: './dev-debug.component.scss'
})
export class DevDebugComponent {
  private readonly authStore = inject(AuthStore);
  private readonly checkinStore = inject(CheckinStore);
  private readonly pubStore = inject(PubStore);
  private readonly panelStore = inject(PanelStore);
  private readonly viewport = inject(ViewportService);
  private readonly device = inject(DeviceCapabilityService);
  private readonly nearbyPubStore = inject(NearbyPubStore);

  readonly isDev = !environment.production;

  // Signals
  readonly user$$ = this.authStore.user$$;
  readonly token$$ = this.authStore.token$$;
  readonly isMobile$$ = this.viewport.isMobile$$;
  readonly isTouchDevice$$ = this.device!.isTouchDevice$$();
  readonly isLowPowerDevice$$ = this.device!.isLowPowerDevice$$();
  readonly deviceMemoryGB$$ = this.device!.deviceMemoryGB$$();
  readonly activePanel$$ = this.panelStore.activePanel;
  readonly location$$ = this.nearbyPubStore.location$$;
  readonly closestPub$$ = this.nearbyPubStore.closestPub$$;
  readonly canCheckIn$$ = this.nearbyPubStore.canCheckIn$$;
  readonly checkins$$ = this.checkinStore.checkins$$;
  readonly latestCheckin$$ = this.checkinStore.checkinSuccess$$;
  readonly pubs$$ = this.pubStore.pubs$$;

  readonly landlordPubsList$$ = computed(() => {
    const pubs = this.pubStore.pubs$$();
    const user = this.user$$();
    if (!user) return [];
    return pubs.filter((pub) => pub.landlordId === user.uid);
  });

  readonly uniqueVisitedPubsList$$ = computed(() => {
    const checkins = this.checkinStore.checkins$$();
    const pubs = this.pubStore.pubs$$();
    const user = this.user$$();
    console.log('[DEBUG] Signals triggered:', {
      user,
      checkinsCount: checkins.length,
      pubsCount: pubs.length,
    });
    if (!user || !checkins.length || !pubs.length) return [];
    const pubIds = new Set(checkins.map((c) => c.pubId));
    return pubs.filter((pub) => pubIds.has(pub.id));
  });

  resetPubs() {
    this.pubStore.reset(); // assumes a .reset() method that clears hasLoaded and re-fetches
  }

  resetCheckins() {
    const user = this.user$$();
    if (user) {
      this.checkinStore.reset(); // same idea here: clear signal, force reload
      this.checkinStore.load(user.uid);
    } else {
      console.warn('[DevDebug] No user available to reload check-ins');
    }
  }
}
