"use client";
import { useDemo } from "@/lib/demo/mode";
import { openSettings } from "@/lib/ui/settingsSheet";

// Widoczny, dopóki działa tryb demo: nikt nie może wziąć przykładowych danych za prawdziwe. Na telefonie to wąski pasek (zasada M2),
// który otwiera arkusz ustawień; od 768 px tę rolę pełni pigułka na górnym pasku (DemoToggle, decyzja U2).
export default function DemoBanner() {
  const demo = useDemo();
  if (!demo.on) return null;
  return (
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
  );
}
