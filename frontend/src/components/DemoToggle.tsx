"use client";
import { useEffect, useRef, useState } from "react";
import { useResetDemo } from "@/lib/data/account";
import { DEMO_USER, useDemo } from "@/lib/demo/mode";
import { ROLES, type Role } from "@/lib/roles";

// Tryb demo na szklanym pasku (komputer i tablet, decyzja U2: zamiast osobnego baneru pod paskiem). Wyłączony = zwykły przycisk.
// Włączony = biała pigułka "Tryb demo · rola", która jest stale widoczna (nikt nie weźmie przykładowych danych za prawdziwe) i rozwija
// panel: rola, przywrócenie danych, wyłączenie. Panel to zwykły przycisk rozwijający (aria-expanded), zamyka go Esc i kliknięcie obok.
// Na telefonie to samo robi wąski pasek z arkuszem ustawień (DemoBanner, SettingsSheet).
const pill = "whitespace-nowrap rounded-full border px-4 py-2 text-sm";

export default function DemoToggle() {
  const demo = useDemo();
  const reset = useResetDemo();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      root.current?.querySelector("button")?.focus();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  if (!demo.on)
    return (
      <button type="button" onClick={() => demo.setOn(true)} aria-pressed={false} className={`${pill} border-current/35`}>
        Tryb demo
      </button>
    );

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="demo-panel"
        className={`${pill} flex items-center gap-1.5 border-transparent bg-white font-semibold text-[#203560]`}
      >
        {/* poniżej 1024 px pasek jest ciasny, więc sama etykieta "Demo" (rola jest w panelu i dla czytnika ekranu) */}
        <span className="lg:hidden">
          Demo<span className="sr-only">, rola {demo.role}</span>
        </span>
        <span className="max-lg:hidden">Tryb demo · {demo.role}</span>
        <svg viewBox="0 0 24 24" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id="demo-panel" role="group" aria-label="Tryb demo" className="absolute right-0 top-full z-40 mt-3 grid w-80 gap-3 rounded-2xl border border-white/25 bg-[#203560] p-4 text-sm text-white shadow-xl">
          <p>
            <strong>Tryb demo:</strong> jesteś {DEMO_USER}. Dane są przykładowe, a zmiany zapisują się tylko w tej przeglądarce.
          </p>
          <label className="flex items-center justify-between gap-3">
            Rola
            <select value={demo.role} onChange={(e) => demo.setRole(e.target.value as Role)} className="select rounded-full border border-white/40 bg-white/10 py-1.5 pl-3 text-sm [&>option]:bg-[#203560]">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="flex-1 rounded-full border border-white/50 px-4 py-1.5 hover:bg-white/15">
              Przywróć dane
            </button>
            <button type="button" onClick={() => demo.setOn(false)} className="flex-1 rounded-full border border-white/50 px-4 py-1.5 hover:bg-white/15">
              Wyłącz demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
