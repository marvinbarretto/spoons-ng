import { TransferState, StateKey } from '@angular/core';
import { WritableSignal } from '@angular/core';
import { SsrPlatformService } from './ssr-platform.service';

/**
 * Reusable helper to fetch and hydrate data via Angular TransferState.
 *
 * - On the browser: checks TransferState and loads from it if available
 * - On the server: fetches and stores the data in TransferState
 * - Otherwise: calls fallback fetch and populates the signal
 *
 * @param key Unique TransferState key
 * @param platform SSR platform service
 * @param transferState Angular TransferState
 * @param fetchFn Function that returns a Promise<T> (e.g., from API)
 * @param signal Writable signal to store the result
 */
export async function hydrateWithTransferState<T>(
  key: StateKey<T>,
  platform: SsrPlatformService,
  transferState: TransferState,
  fetchFn: () => Promise<T>,
  signal: WritableSignal<T | null>
): Promise<void> {
  if (platform.isBrowser && transferState.hasKey(key)) {
    const cached = transferState.get(key, null as T);
    signal.set(cached);
    return;
  }

  const result = await fetchFn();
  signal.set(result ?? null);

  if (platform.isServer && result) {
    transferState.set(key, result);
  }

  console.log(`[hydrateWithTransferState]`, {
    key,
    platform: platform.isServer ? 'server' : 'browser',
    usedCache: platform.isBrowser && transferState.hasKey(key),
  });
}
