import { useSyncExternalStore } from "react";

const KEY = "favorites";
const listeners = new Set<() => void>();
let cache: { raw: string | null; ids: number[] } = { raw: null, ids: [] };
const EMPTY: number[] = [];

function read(): number[] {
  const raw = localStorage.getItem(KEY);
  if (raw !== cache.raw) {
    let ids: number[] = [];
    try {
      const parsed = JSON.parse(raw ?? "[]");
      if (Array.isArray(parsed)) ids = parsed.filter(Number.isInteger);
    } catch {} // corrupt storage -> start empty
    cache = { raw, ids };
  }
  return cache.ids;
}

export function toggleFavorite(id: number) {
  const ids = read();
  const next = ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useFavorites(): number[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb); // other tabs
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => EMPTY,
  );
}
