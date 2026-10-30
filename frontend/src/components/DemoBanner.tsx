"use client";
import { useDemo, DEMO_USER } from "@/lib/demo/mode";
import { ROLES, type Role } from "@/lib/roles";

// Widoczny, dopóki działa tryb demo: nikt nie może wziąć przykładowych danych za prawdziwe.
export default function DemoBanner() {
  const demo = useDemo();
  if (!demo.on) return null;
  return (
    <div role="status" className="mx-auto mt-3 w-full max-w-7xl px-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-current/25 bg-primary/10 px-4 py-2.5 text-sm">
        <p className="min-w-full sm:min-w-0 sm:flex-1">
          <strong>Tryb demo:</strong> jesteś {DEMO_USER}. Dane są przykładowe, a zmiany zapisują się tylko w tej przeglądarce.
        </p>
        <label className="flex items-center gap-2">
          Rola
          <select
            value={demo.role}
            onChange={(e) => demo.setRole(e.target.value as Role)}
            className="select rounded-full border border-foreground/30 bg-background py-1.5 pl-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => demo.setOn(false)} className="rounded-full border border-foreground/30 px-4 py-1.5">
          Wyłącz demo
        </button>
      </div>
    </div>
  );
}
