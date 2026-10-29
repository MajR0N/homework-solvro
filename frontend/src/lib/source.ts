import { useSyncExternalStore } from "react";

// Skąd bierzemy koktajle: z publicznego API Solvro (domyślnie) albo z własnego backendu w Django.
export type Source = "solvro" | "own";

// Adres własnego backendu, np. http://127.0.0.1:8000/api/v1. Bez niego (np. na Vercelu, gdzie backendu nie ma)
// przełącznik się nie pokazuje i zawsze działa Solvro. Zmienna jest wstawiana w czasie budowania aplikacji.
export const OWN_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;
export const ownAvailable = Boolean(OWN_BASE);

const KEY = "source";
const listeners = new Set<() => void>();

function read(): Source {
  return ownAvailable && localStorage.getItem(KEY) === "own" ? "own" : "solvro";
}

export function setSource(source: Source) {
  localStorage.setItem(KEY, source);
  listeners.forEach((l) => l());
}

// Ten sam wzorzec co przy ulubionych: dane spoza Reacta (localStorage) + useSyncExternalStore
export function useSource(): Source {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb); // inne karty
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => "solvro", // po stronie serwera zawsze Solvro, więc nie ma różnicy przy hydracji
  );
}
