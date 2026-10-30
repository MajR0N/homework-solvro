"use client";
import { useRouter } from "next/navigation";
import { button, panel } from "@/components/account/ui";
import { useSession, useLogout } from "@/lib/auth";
import { useResetDemo } from "@/lib/data/account";
import { ROLE_PL, isRole } from "@/lib/roles";

export default function SettingsPage() {
  const { session, demo } = useSession();
  const logout = useLogout();
  const resetDemo = useResetDemo();
  const router = useRouter();
  if (!session) return null; // układ konta pokazuje wtedy ekran logowania

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <h2 className="text-2xl font-bold tracking-tight">Ustawienia</h2>
      <dl className={`${panel} grid gap-3`}>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground/75">Nazwa użytkownika</dt>
          <dd className="font-semibold">{session.username}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-foreground/15 pt-3">
          <dt className="text-foreground/75">Rola</dt>
          <dd className="font-semibold">{isRole(session.role) ? ROLE_PL[session.role] : session.role}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-foreground/15 pt-3">
          <dt className="text-foreground/75">Konto</dt>
          <dd className="font-semibold">{demo ? "Tryb demo (przykładowe dane)" : "Własny backend"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
          className={button}
        >
          {demo ? "Wyłącz tryb demo" : "Wyloguj"}
        </button>
        {demo && (
          <button type="button" onClick={resetDemo} className={button}>
            Przywróć dane przykładowe
          </button>
        )}
      </div>
      <p className="text-sm text-foreground/70">Zmiana hasła i usuwanie konta wymagają funkcji, których backend jeszcze nie ma, więc ich tu nie ma.</p>
    </div>
  );
}
