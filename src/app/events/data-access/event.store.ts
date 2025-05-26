import {
  Injectable,
  signal,
  inject,
  makeStateKey,
  TransferState,
} from '@angular/core';
import { EventModel } from '../utils/event.model';
import { EventService } from './event.service';
import { SsrPlatformService } from '../../shared/utils/ssr/ssr-platform.service';
import { hydrateWithTransferState } from '../../shared/utils/ssr/hydrate-with-transfer-state';

const EVENT_STATE_KEY = makeStateKey<EventModel>('event');

@Injectable({ providedIn: 'root' })
export class EventStore {
  private readonly platform = inject(SsrPlatformService);
  private readonly eventService = inject(EventService);
  private readonly transferState = inject(TransferState);

  private readonly slug = signal<string | null>(null);
  private readonly event = signal<EventModel | null>(null);
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  readonly event$ = this.event.asReadonly();
  readonly loading$ = this.loading.asReadonly();
  readonly error$ = this.error.asReadonly();

  async load(slug: string): Promise<void> {
    if (this.slug() === slug && this.event()) return;

    this.slug.set(slug);
    this.event.set(null);
    this.error.set(null);
    this.loading.set(true);

    try {
      await hydrateWithTransferState(
        EVENT_STATE_KEY,
        this.platform,
        this.transferState,
        () => this.eventService.getEventBySlug(slug),
        this.event
      );
    } catch (e) {
      console.error('[EventStore] Error during hydration', e);
      this.error.set('Event failed to load');
    }

    console.log(
      '[EventStore] Platform:',
      this.platform.isServer ? 'server' : 'browser'
    );
    console.log(
      '[EventStore] TransferState has key?',
      this.transferState.hasKey(EVENT_STATE_KEY)
    );

    this.loading.set(false);
  }
}
