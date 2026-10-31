import { useEffect, useSyncExternalStore } from "react";

// Na telefonie niektóre ekrany mają własny dolny pasek akcji (zaznaczone koktajle, sprawa w moderacji) i on ZASTĘPUJE dolną
// nawigację (zasada M13). Ekran ogłasza to hookiem useReplaceDock(true), a dok pyta o to useDockReplaced(). Licznik zamiast
// flagi, żeby dwa paski naraz (albo szybkie przejście między ekranami) nie przywróciły doku za wcześnie.
let count = 0;
const listeners = new Set<() => void>();
const bump = (by: number) => {
  count += by;
  listeners.forEach((l) => l());
};

export function useReplaceDock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    bump(1);
    return () => bump(-1);
  }, [active]);
}

export function useDockReplaced(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => count > 0,
    () => false,
  );
}
