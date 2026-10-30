import { useSyncExternalStore } from "react";

// Mały magazyn danych w localStorage z wartością początkową ("seed"). Używa go tryb demo: dane przykładowe żyją tylko
// w tej przeglądarce, a "przywróć dane" to po prostu reset do seed. Magazyn nie zna Reacta ani przeglądarki (storage jest
// podawany z zewnątrz), więc da się go sprawdzić testem.
type Backend = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Po stronie serwera nie ma localStorage; tam i tak zawsze zwracany jest seed, więc zapis jest tylko zaślepką.
const noStorage: Backend = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const browserStorage = (): Backend => (typeof localStorage === "undefined" ? noStorage : localStorage);

export type Store<T> = {
  get(): T;
  set(next: T): void;
  /** `fn` ma zwracać NOWĄ wartość (bez mutowania starej), bo React porównuje wartości po referencji. */
  update(fn: (current: T) => T): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
  /** Wartość dla serwera (bez localStorage): zawsze seed, więc hydracja się zgadza. */
  server: T;
};

export function createStore<T>(storage: () => Backend, key: string, seed: () => T, isValid: (x: unknown) => x is T): Store<T> {
  const listeners = new Set<() => void>();
  // get() musi zwracać TĘ SAMĄ referencję, dopóki zapis się nie zmienił (wymaga tego useSyncExternalStore), więc pamiętamy
  // ostatni odczytany tekst i jego wynik.
  let cache: { raw: string | null; value: T } | null = null;
  const notify = () => listeners.forEach((l) => l());

  const store: Store<T> = {
    server: seed(),
    get() {
      const raw = storage().getItem(key);
      if (cache && cache.raw === raw) return cache.value;
      let value: T | undefined;
      try {
        const parsed = JSON.parse(raw ?? "null");
        if (isValid(parsed)) value = parsed;
      } catch {} // uszkodzony zapis = wartość początkowa
      cache = { raw, value: value ?? seed() };
      return cache.value;
    },
    set(next) {
      storage().setItem(key, JSON.stringify(next));
      notify();
    },
    update(fn) {
      store.set(fn(store.get()));
    },
    reset() {
      storage().removeItem(key);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return store;
}

/** Hook: odczyt magazynu z odświeżaniem komponentu po zmianie (także z innej karty). */
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(
    (cb) => {
      const off = store.subscribe(cb);
      window.addEventListener("storage", cb); // inne karty
      return () => {
        off();
        window.removeEventListener("storage", cb);
      };
    },
    store.get,
    () => store.server,
  );
}
