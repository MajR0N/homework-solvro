import { demoData } from "../demo/data";
import { browserStorage, createStore } from "../demo/store";
import { type AdminDemo, seedAdminDemo } from "./demo";

// Dane panelu administratora w trybie demo (konta, zgłoszone opinie, katalog z importu) w localStorage.
// Przepisy użytkowników leżą w demoData (te same, które widać na koncie), więc zmiany znaczka i usunięcia dotykają obu magazynów.
const isAdminDemo = (x: unknown): x is AdminDemo => ["imports", "reviews", "users"].every((k) => Array.isArray((x as AdminDemo)?.[k as keyof AdminDemo]));

export const demoAdmin = createStore<AdminDemo>(browserStorage, "demo-admin", () => seedAdminDemo(new Date()), isAdminDemo);

/** Oba magazyny naraz, żeby zmiana ich nie rozjechała. */
export const demoWorld = () => ({ demo: demoData.get(), adm: demoAdmin.get() });
export function setDemoWorld(w: { demo: ReturnType<typeof demoData.get>; adm: ReturnType<typeof demoAdmin.get> }) {
  demoData.set(w.demo);
  demoAdmin.set(w.adm);
}
