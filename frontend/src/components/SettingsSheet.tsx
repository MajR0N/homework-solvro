"use client";
import { XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLogout, useSession } from "@/lib/auth";
import { useResetDemo } from "@/lib/data/account";
import { DEMO_USER, useDemo } from "@/lib/demo/mode";
import { ROLES, type Role } from "@/lib/roles";
import { ownAvailable } from "@/lib/source";
import { closeSettings, useSettingsOpen } from "@/lib/ui/settingsSheet";
import SourceSwitch from "./SourceSwitch";

// Arkusz ustawień na telefonie (zasada M2): zbiera to, co nie mieści się na odchudzonym pasku, czyli źródło danych, tryb demo
// (z rolą, przywracaniem danych i wyłączeniem) oraz logowanie i wylogowanie. Natywne <dialog>: fokus zostaje w oknie, Esc zamyka.
// Na komputerze nie jest używany (tam te same rzeczy są na pasku, w banerze i w menu profilu).
const row = "flex min-h-11 items-center justify-between gap-4";
const action = "inline-flex min-h-11 items-center justify-center rounded-full border border-foreground/30 px-5 hover:bg-foreground/10";

export default function SettingsSheet() {
  const open = useSettingsOpen();
  const ref = useRef<HTMLDialogElement>(null);
  const { session, demo: demoSession } = useSession();
  const demo = useDemo();
  const logout = useLogout();
  const reset = useResetDemo();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={closeSettings}
      onClick={(e) => e.target === ref.current && closeSettings()}
      aria-labelledby="settings-title"
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-foreground/20 bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-foreground backdrop:bg-black/55"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="settings-title" className="text-xl font-bold">
          Ustawienia
        </h2>
        <button type="button" onClick={closeSettings} aria-label="Zamknij ustawienia" className="grid size-11 place-items-center rounded-full hover:bg-foreground/10">
          <XIcon size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 divide-y divide-foreground/15">
        {ownAvailable && (
          <div className="grid gap-1 [&_label]:text-base [&_select]:min-h-11 [&_select]:w-full [&_select]:text-base">
            <SourceSwitch />
          </div>
        )}

        <div className="grid gap-2 pt-4">
          <label className={row}>
            <span>
              <span className="block font-semibold">Tryb demo</span>
              <span className="block text-sm text-foreground/70">Przykładowy profil, zmiany tylko w tej przeglądarce.</span>
            </span>
            <input type="checkbox" checked={demo.on} onChange={(e) => demo.setOn(e.target.checked)} className="size-6 shrink-0 accent-[#80b3ff]" />
          </label>
          {demo.on && (
            <>
              <label className={row}>
                <span>Rola ({DEMO_USER})</span>
                <select value={demo.role} onChange={(e) => demo.setRole(e.target.value as Role)} className="select min-h-11 rounded-full border border-foreground/35 bg-background py-2 pl-4 text-base">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={reset} className={action}>
                  Przywróć dane
                </button>
                <button type="button" onClick={() => demo.setOn(false)} className={action}>
                  Wyłącz demo
                </button>
              </div>
            </>
          )}
        </div>

        {/* prawdziwe konto: wylogowanie tutaj, bo na telefonie nie ma rozwijanego menu profilu (zasada M4) */}
        {!demoSession && ownAvailable && (
          <div className="pt-4">
            {session ? (
              <button
                type="button"
                onClick={async () => {
                  closeSettings();
                  await logout();
                }}
                className={`${action} w-full`}
              >
                Wyloguj ({session.username})
              </button>
            ) : (
              <Link href="/login" onClick={closeSettings} className={`${action} w-full`}>
                Zaloguj się
              </Link>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
