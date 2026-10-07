// Real ECG strips are static JSON in public/strips/. They are fetched on demand
// (and precached by the service worker, so they also work offline).
import { Strip } from "../content/schema";

export type LoadedStrip = {
  strip: Strip;
  /** Samples in mV per lead name. */
  leads: Record<string, Float32Array>;
  twelveLead: boolean;
};

const cache = new Map<string, Promise<LoadedStrip>>();

export function loadStrip(id: string): Promise<LoadedStrip> {
  let promise = cache.get(id);
  if (!promise) {
    promise = fetch(`${import.meta.env.BASE_URL}strips/${id}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const strip = Strip.parse(json);
        const leads = Object.fromEntries(
          Object.entries(strip.leads).map(([k, v]) => [k, Float32Array.from(v)]),
        );
        return { strip, leads, twelveLead: Object.keys(leads).length === 12 };
      });
    cache.set(id, promise);
    promise.catch(() => cache.delete(id)); // allow a retry after a failed fetch
  }
  return promise;
}
