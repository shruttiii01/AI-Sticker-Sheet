import { createHash } from 'crypto';

/**
 * Tiny in-memory cache: TTL + LRU eviction + in-flight de-duplication, so identical
 * requests (retries, double-clicks, re-renders of the same pack) never pay for a second
 * model call. On Vercel it lives per warm function instance (best effort); on the local
 * booth server it lasts for the whole event.
 */
export class TtlCache<T> {
  private store = new Map<string, { v: T; exp: number }>();
  private inflight = new Map<string, Promise<T>>();
  constructor(private max: number, private ttlMs: number) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.exp < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key); // refresh LRU position
    this.store.set(key, hit);
    return hit.v;
  }

  set(key: string, v: T) {
    this.store.set(key, { v, exp: Date.now() + this.ttlMs });
    while (this.store.size > this.max) this.store.delete(this.store.keys().next().value as string);
  }

  /** Return the cached value, join an identical in-flight call, or run `fn` once and cache it. */
  async wrap(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const running = this.inflight.get(key);
    if (running) return running;
    const p = fn()
      .then((v) => {
        this.set(key, v);
        return v;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }
}

export const hashKey = (...parts: unknown[]) =>
  createHash('sha256').update(parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join('\u0000')).digest('hex');
