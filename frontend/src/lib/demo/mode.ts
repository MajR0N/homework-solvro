import { isRole, type Role } from "../roles";
import { createStore, useStore } from "./store";

// Tryb demo: aplikacja udaje zalogowaną osobę z przykładowymi danymi (bez backendu i bez logowania), a zmiany zapisują się
// tylko w tej przeglądarce. Przydaje się do pokazu: konto, edytor i panel admina działają tak samo jak z prawdziwym backendem.
// Strony nie wiedzą, w którym trybie są: wybiera to warstwa danych (hooki), nie komponenty.
export const DEMO_USER = "kasia_mixuje";

export type DemoState = { on: boolean; role: Role };

const isDemoState = (x: unknown): x is DemoState => typeof (x as DemoState)?.on === "boolean" && isRole((x as DemoState)?.role);

// Po stronie serwera nie ma localStorage; tam i tak zawsze zwracany jest seed (wyłączone demo), więc zapis jest tylko zaślepką.
const noStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const demoStore = createStore<DemoState>(
  () => (typeof localStorage === "undefined" ? noStorage : localStorage),
  "demo",
  () => ({ on: false, role: "user" }),
  isDemoState,
);

export function useDemo() {
  const { on, role } = useStore(demoStore);
  return {
    on,
    role,
    setOn: (value: boolean) => demoStore.update((s) => ({ ...s, on: value })),
    setRole: (value: Role) => demoStore.update((s) => ({ ...s, role: value })),
  };
}
