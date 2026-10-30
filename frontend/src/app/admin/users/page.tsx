"use client";
import { useState } from "react";
import { EmptyState, Skeleton, panel } from "@/components/account/ui";
import { useAdminAccess, useAdminUsers, useChangeRole } from "@/lib/admin/hooks";
import type { AdminUser } from "@/lib/admin/types";
import { initials, plural, shortDate } from "@/lib/format";
import { ROLES, ROLE_PL, type Role, rank } from "@/lib/roles";
import { useDebounced } from "@/lib/useDebounced";

// Użytkownicy i role (propozycja D z design-proposals/admin.html). Rola zmienia się listą, która pokazuje tylko role, które
// WOLNO nadać (niższe od mojej); własne konto i konta równe lub wyższe od mojego są zablokowane z napisem dlaczego.
// Obok tabela "Kto co może": reguły widoczne w interfejsie, z podświetloną moją rolą. Egzekwuje je backend (403), nie ten ekran.
const MATRIX: [string, number][] = [ // [uprawnienie, najniższa ranga, która je ma]
  ["Dodaje przepisy i opinie", 0],
  ["Edytuje własne przepisy", 0],
  ["Edytuje cudze przepisy", 1],
  ["Nadaje znaczek", 1],
  ["Usuwa cudze opinie", 1],
  ["Nadaje rolę user", 1],
  ["Nadaje rolę admin", 2],
  ["Nadaje rolę staff", 3],
];

export default function UsersPage() {
  const access = useAdminAccess();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"" | Role>("");
  const users = useAdminUsers(useDebounced(search, 250), role);
  const change = useChangeRole();
  const [notice, setNotice] = useState("");

  const lockReason = (u: AdminUser) => (u.username === access.username ? "To Twoje konto" : u.role === "owner" ? "Owner: tylko z konsoli" : rank(u.role) >= rank(access.role) ? "Rola równa lub wyższa od Twojej" : "Brak niższej roli do nadania");

  const onChange = (u: AdminUser, next: Role) =>
    change.mutate(
      { id: u.id, role: next },
      { onSuccess: () => setNotice(`${u.username} ma teraz rolę ${next}.`), onError: () => setNotice(`Nie udało się zmienić roli konta ${u.username}. Backend odmówił albo konto się zmieniło.`) },
    );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Użytkownicy</h2>
          {users.data && <span className="text-foreground/70">{users.data.length} {plural(users.data.length, "konto", "konta", "kont")}</span>}
          <span className="flex-1" />
          <label>
            <span className="sr-only">Szukaj konta</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj nazwy użytkownika" className="w-60 rounded-full border border-foreground/35 bg-background px-4 py-2 text-sm" />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <span className="text-foreground/75">Rola:</span>
            <select value={role} onChange={(e) => setRole(e.target.value as "" | Role)} className="select rounded-full border border-foreground/35 bg-background py-1.5 pl-3.5 text-sm font-semibold">
              <option value="">Wszystkie</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_PL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {notice && (
          <p role="status" className="rounded-xl border border-foreground/25 bg-foreground/5 px-4 py-2.5 text-sm">
            {notice}
          </p>
        )}

        {users.error ? (
          <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
            Nie udało się pobrać kont.{" "}
            <button type="button" onClick={() => users.refetch()} className="underline underline-offset-4">
              Spróbuj ponownie
            </button>
          </div>
        ) : !users.data ? (
          <Skeleton className="h-80" />
        ) : users.data.length === 0 ? (
          <EmptyState title="Nie znaleziono konta" text="Sprawdź pisownię nazwy użytkownika albo zmień filtr roli." />
        ) : (
          <div className={`${panel} overflow-x-auto !p-1`}>
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-foreground/70">
                <tr>
                  <th className="px-3 py-2 font-semibold">Konto</th>
                  <th className="px-3 py-2 font-semibold">Rola</th>
                  <th className="px-3 py-2 text-right font-semibold">Przepisy</th>
                  <th className="px-3 py-2 text-right font-semibold">Opinie</th>
                  <th className="px-3 py-2 font-semibold">Od</th>
                  <th className="px-3 py-2 font-semibold">Zmień rolę</th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => (
                  <tr key={u.id} className="border-t border-foreground/15">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-3">
                        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">
                          {initials(u.username)}
                        </span>
                        <span>
                          <span className="font-semibold">{u.username}</span>
                          {u.reports > 0 && (
                            <span className="block text-xs font-semibold text-red-700 dark:text-red-300">
                              {u.reports} {plural(u.reports, "zgłoszenie", "zgłoszenia", "zgłoszeń")} opinii
                            </span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${u.role === "staff" || u.role === "owner" ? "border-transparent bg-primary text-on-primary" : "border-foreground/40"}`}>{u.role}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.recipes}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.reviews}</td>
                    <td className="px-3 py-2 tabular-nums">{shortDate(u.joined)}</td>
                    <td className="px-3 py-2">
                      {u.canEdit && u.assignableRoles.length > 0 ? (
                        <select
                          aria-label={`Rola konta ${u.username}`}
                          value={u.role}
                          disabled={change.isPending}
                          onChange={(e) => onChange(u, e.target.value as Role)}
                          className="select rounded-full border border-foreground/40 bg-background py-1 pl-3 text-sm font-semibold"
                        >
                          {u.assignableRoles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-foreground/65">{lockReason(u)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-foreground/70">
          Zalogowano jako {access.username} ({access.role}). Rolę można nadać tylko niższą od własnej, a własnego konta i konta ownera nie da się zmienić z panelu.
        </p>
      </div>

      <aside className={panel} aria-labelledby="matrix-h">
        <h3 id="matrix-h" className="mb-2 text-lg font-semibold">
          Kto co może
        </h3>
        <table className="w-full text-center text-xs">
          <thead>
            <tr>
              <th className="py-1 text-left"><span className="sr-only">Uprawnienie</span></th>
              {ROLES.map((r) => (
                <th key={r} className={`px-1 py-1 ${r === access.role ? "rounded-t-md bg-foreground/10" : ""}`}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map(([label, min]) => (
              <tr key={label} className="border-t border-foreground/15">
                <td className="py-1.5 pr-2 text-left">{label}</td>
                {ROLES.map((r, i) => (
                  <td key={r} className={`py-1.5 ${r === access.role ? "bg-foreground/10" : ""}`}>
                    {i >= min ? (
                      <>
                        <span aria-hidden="true" className="font-bold text-emerald-700 dark:text-emerald-300">✓</span>
                        <span className="sr-only">tak</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true" className="text-foreground/50">–</span>
                        <span className="sr-only">nie</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-foreground/70">Podświetlona kolumna to Twoja rola.</p>
      </aside>
    </div>
  );
}
