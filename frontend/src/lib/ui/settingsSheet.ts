import { useSyncExternalStore } from "react";

// Stan arkusza ustawień na telefonie (otwierają go ikona zębatki na pasku i pasek trybu demo). To tylko "otwarty/zamknięty"
// w pamięci strony, więc nie ma sensu trzymać go w localStorage ani w kontekście Reacta.
let open = false;
const listeners = new Set<() => void>();
const set = (value: boolean) => {
  open = value;
  listeners.forEach((l) => l());
};

export const openSettings = () => set(true);
export const closeSettings = () => set(false);

export function useSettingsOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => open,
    () => false,
  );
}
