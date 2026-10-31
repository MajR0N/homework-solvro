"use client";
import { useResetDemo } from "@/lib/data/account";
import { DEMO_USER, useDemo } from "@/lib/demo/mode";
import { openSettings } from "@/lib/ui/settingsSheet";
import { ROLES, type Role } from "@/lib/roles";

// Widoczny, dopóki działa tryb demo: nikt nie może wziąć przykładowych danych za prawdziwe. Na komputerze to pełny baner z rolą i
// przyciskami, na telefonie wąski pasek (zasada M2), który otwiera arkusz ustawień z tymi samymi opcjami.
export default function DemoBanner() {
  const demo = useDemo();
  const reset = useResetDemo();
  if (!demo.on) return null;
  return (
    <>
    <div className="mx-auto mt-2 w-full max-w-7xl px-4 md:hidden">
      <button
        type="button"
        onClick={openSettings}
        aria-label={`Tryb demo, rola ${demo.role}. Otwórz ustawienia`}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-current/25 bg-primary/10 px-4 text-sm"
      >
        <span>
          <strong>Tryb demo</strong> · {demo.role}
        </span>
        <span aria-hidden="true" className="text-foreground/75">
          Zmień ›
        </span>
      </button>
    </div>
    <div role="status" className="mx-auto mt-3 hidden w-full max-w-7xl px-4 md:block">
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
        <button type="button" onClick={reset} className="rounded-full border border-foreground/30 px-4 py-1.5">
          Przywróć dane
        </button>
        <button type="button" onClick={() => demo.setOn(false)} className="rounded-full border border-foreground/30 px-4 py-1.5">
          Wyłącz demo
        </button>
      </div>
    </div>
    </>
  );
}
