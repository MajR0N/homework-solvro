import { isRole, type Role } from "../roles";
import { DEMO_USER } from "./fixtures";
import { browserStorage, createStore, useStore } from "./store";

// Tryb demo: aplikacja udaje zalogowaną osobę z przykładowymi danymi (bez backendu i bez logowania), a zmiany zapisują się
// tylko w tej przeglądarce. Przydaje się do pokazu: konto, edytor i panel admina działają tak samo jak z prawdziwym backendem.
// Strony nie wiedzą, w którym trybie są: wybiera to warstwa danych (hooki), nie komponenty.
export { DEMO_USER };

export type DemoState = { on: boolean; role: Role };

const isDemoState = (x: unknown): x is DemoState => typeof (x as DemoState)?.on === "boolean" && isRole((x as DemoState)?.role);

export const demoStore = createStore<DemoState>(
  browserStorage,
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
