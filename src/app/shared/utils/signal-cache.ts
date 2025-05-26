// utils/signal-cache.ts
import { signal, computed, Signal } from '@angular/core';

export function signalCache<K, V>(label = 'SignalCache') {
  const cache = new Map<K, { writable: ReturnType<typeof signal>; readonly: Signal<V> }>();

  function get(key: K): Signal<V> | null {
    const entry = cache.get(key);
    console.debug(`[${label}] GET ${String(key)} ->`, entry?.readonly());
    return entry?.readonly ?? null;
  }

  function set(key: K, value: V): void {
    if (cache.has(key)) {
      console.debug(`[${label}] UPDATE ${String(key)} ->`, value);
      cache.get(key)!.writable.set(value);
    } else {
      console.debug(`[${label}] SET ${String(key)} ->`, value);
      const writable = signal(value);
      cache.set(key, { writable, readonly: computed(() => writable()) });
    }
  }

  function has(key: K): boolean {
    return cache.has(key);
  }

  function clear(): void {
    console.debug(`[${label}] CLEAR`);
    cache.clear();
  }

  return {
    get,
    set,
    has,
    clear,
  } as const; // freezes the return type to exactly the structure and types of the object
}
