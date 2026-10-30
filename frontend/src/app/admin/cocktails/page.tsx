"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ConfirmDialog, EmptyState, Skeleton, Thumb, button, dangerButton, panel, primaryButton } from "@/components/account/ui";
import { VerifiedIcon } from "@/components/Badges";
import { useAdminAccess, useAdminCocktails, useDeleteCocktail, useVerify } from "@/lib/admin/hooks";
import type { AdminCocktailQuery } from "@/lib/admin/types";
import type { Cocktail } from "@/lib/api";
import { decimal, fmt } from "@/lib/format";
import { isDemoId } from "@/lib/demo/fixtures";
import { patchParams } from "@/lib/params";
import { pl } from "@/lib/pl";

// Tabela i galeria koktajli (propozycje A i E z design-proposals/admin.html): szukanie, filtry znaczka, zdjęcia i pochodzenia,
// sortowanie, strony, zaznaczanie, masowe nadawanie znaczka i usuwanie pojedynczych koktajli. Filtry są w adresie
// (?q=&verified=&image=&origin=&sort=&page=&view=), więc odświeżenie i link je zachowują.
const SORTS = [
  { value: "-popular", label: "Najpopularniejsze" },
  { value: "name", label: "Nazwa A–Z" },
  { value: "-name", label: "Nazwa Z–A" },
  { value: "verified", label: "Bez znaczka najpierw" },
  { value: "-id", label: "Najnowsze" },
];
const chip = "rounded-full border px-3.5 py-1 text-sm";
const chipOn = "border-transparent bg-primary font-semibold text-on-primary";
const chipOff = "border-foreground/30 hover:bg-foreground/10";

function Cocktails() {
  const router = useRouter();
  const sp = useSearchParams();
  const access = useAdminAccess();
  const verify = useVerify();
  const remove = useDeleteCocktail();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [toDelete, setToDelete] = useState<Cocktail | null>(null);
  const [notice, setNotice] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  // adres to dane od użytkownika: każdą wartość sprawdzamy
  const v = sp.get("verified");
  const o = sp.get("origin");
  const q: AdminCocktailQuery = {
    search: sp.get("q") ?? "",
    verified: v === "true" || v === "false" ? v : "",
    hasImage: sp.get("image") === "none" ? "false" : "",
    origin: o === "import" || o === "users" ? o : "",
    ordering: SORTS.find((s) => s.value === sp.get("sort"))?.value ?? "-popular",
    page: Math.max(1, parseInt(sp.get("page") ?? "", 10) || 1),
  };
  const view = sp.get("view") === "gallery" ? "gallery" : "table";
  const { data, error, isPlaceholderData, refetch } = useAdminCocktails(q);

  // każda zmiana (filtr, strona) czyści zaznaczenie: inaczej akcja grupowa dotknęłaby koktajli, których już nie widać
  const update = (patch: Record<string, string>) => {
    setPicked(new Set());
    router.replace(patchParams(patch, window.location.search).replace(/^\/\?/, "/admin/cocktails?").replace(/^\/$/, "/admin/cocktails"), { scroll: false });
  };
  const rows = data?.data ?? [];
  const allPicked = rows.length > 0 && rows.every((c) => picked.has(c.id));
  const toggle = (id: number) =>
    setPicked((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  const run = (ids: number[], verified: boolean) =>
    verify.mutate(
      { ids, verified },
      {
        onSuccess: () => {
          setNotice(verified ? `Oznaczono jako zweryfikowane: ${ids.length}.` : `Zdjęto znaczek: ${ids.length}.`);
          setPicked(new Set());
        },
        onError: () => setNotice("Nie udało się zmienić znaczka. Spróbuj ponownie."),
      },
    );

  // w trybie demo da się edytować tylko przepisy demo (import Solvro jest tylko w prawdziwym backendzie)
  const editable = (c: Cocktail) => !access.demo || isDemoId(c.id);
  const author = (c: Cocktail) => c.authorName || "Import Solvro";
  const badge = (c: Cocktail) => (c.verified ? <span className="font-semibold text-emerald-700 dark:text-emerald-300">Zweryfikowany</span> : <span className="text-foreground/70">Bez znaczka</span>);
  const missing = (c: Cocktail) => c.hasImage === false && <span className="ml-1.5 rounded-full border border-red-500/60 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">Brak zdjęcia</span>;
  const rating = (c: Cocktail) => (c.ratingAvg != null && (c.ratingCount ?? 0) > 0 ? `${decimal(c.ratingAvg)} (${c.ratingCount})` : "brak");

  const filterBtn = (label: string, on: boolean, patch: Record<string, string>) => (
    <button type="button" aria-pressed={on} onClick={() => update({ ...patch, page: "" })} className={`${chip} ${on ? chipOn : chipOff}`}>
      {label}
    </button>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Koktajle</h2>
        {data && <span className="text-foreground/70">{fmt(data.meta.total)} {data.meta.total === 1 ? "wynik" : "wyników"}</span>}
        <span className="flex-1" />
        <div role="group" aria-label="Widok" className="inline-flex rounded-full border border-foreground/30 p-0.5">
          {(["table", "gallery"] as const).map((x) => (
            <button key={x} type="button" aria-pressed={view === x} onClick={() => update({ view: x === "table" ? "" : x })} className={`rounded-full px-3.5 py-1 text-sm ${view === x ? chipOn : "hover:bg-foreground/10"}`}>
              {x === "table" ? "Tabela" : "Galeria"}
            </button>
          ))}
        </div>
        <Link href="/recipes/new" className={primaryButton}>
          Dodaj koktajl
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="search">
        <label className="min-w-56 flex-1 sm:max-w-sm">
          <span className="sr-only">Szukaj po nazwie lub autorze</span>
          <input
            key={q.search /* po wyczyszczeniu filtrów pole ma się opróżnić */}
            type="search"
            defaultValue={q.search}
            placeholder="Szukaj po nazwie lub autorze"
            onChange={(e) => {
              const text = e.target.value;
              clearTimeout(searchTimer.current);
              searchTimer.current = setTimeout(() => update({ q: text.trim(), page: "" }), 300);
            }}
            className="w-full rounded-full border border-foreground/35 bg-background px-4 py-2 text-sm"
          />
        </label>
        <div role="group" aria-label="Znaczek" className="flex flex-wrap gap-1.5">
          {filterBtn("Wszystkie", q.verified === "" && !q.hasImage, { verified: "", image: "" })}
          {filterBtn("Bez znaczka", q.verified === "false", { verified: "false" })}
          {filterBtn("Zweryfikowane", q.verified === "true", { verified: "true" })}
          {filterBtn("Bez zdjęcia", q.hasImage === "false", { image: q.hasImage === "false" ? "" : "none" })}
        </div>
        <div role="group" aria-label="Pochodzenie" className="flex flex-wrap gap-1.5">
          {filterBtn("Import Solvro", q.origin === "import", { origin: q.origin === "import" ? "" : "import" })}
          {filterBtn("Od użytkowników", q.origin === "users", { origin: q.origin === "users" ? "" : "users" })}
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <span className="text-foreground/75">Sortuj:</span>
          <select value={q.ordering} onChange={(e) => update({ sort: e.target.value === "-popular" ? "" : e.target.value, page: "" })} className="select rounded-full border border-foreground/35 bg-background py-1.5 pl-3.5 text-sm font-semibold">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
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

      {error ? (
        <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
          Nie udało się pobrać koktajli.{" "}
          <button type="button" onClick={() => refetch()} className="underline underline-offset-4">
            Spróbuj ponownie
          </button>
        </div>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : rows.length === 0 ? (
        <EmptyState title="Brak koktajli dla tych filtrów" text="Zmień wyszukiwanie albo wyczyść filtry.">
          <button type="button" onClick={() => router.replace("/admin/cocktails")} className={`${button} mt-2`}>
            Wyczyść filtry
          </button>
        </EmptyState>
      ) : view === "table" ? (
        <div className={`${panel} overflow-x-auto !p-1 ${isPlaceholderData ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-foreground/70">
              <tr>
                <th className="px-3 py-2">
                  <input type="checkbox" className="size-4 accent-[#80b3ff]" aria-label="Zaznacz wszystkie na tej stronie" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((c) => c.id)))} />
                </th>
                <th className="px-3 py-2 font-semibold">Koktajl</th>
                <th className="px-3 py-2 font-semibold">Autor</th>
                <th className="px-3 py-2 font-semibold">Kategoria</th>
                <th className="px-3 py-2 font-semibold">Znaczek</th>
                <th className="px-3 py-2 text-right font-semibold">Wyświetlenia (30 dni)</th>
                <th className="px-3 py-2 text-right font-semibold">Ocena</th>
                <th className="px-3 py-2 text-right font-semibold">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-foreground/15">
                  <td className="px-3 py-2">
                    <input type="checkbox" className="size-4 accent-[#80b3ff]" aria-label={`Zaznacz ${c.name}`} checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/cocktails/${c.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                      <Thumb src={c.imageUrl} className="size-9" />
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{author(c)}</td>
                  <td className="px-3 py-2">{pl(c.category)}</td>
                  <td className="px-3 py-2">
                    {badge(c)}
                    {missing(c)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.views30d ?? 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rating(c)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex gap-2">
                      {editable(c) && (
                        <Link href={`/recipes/${c.id}/edit`} aria-label={`Edytuj ${c.name}`} className="rounded-full border border-foreground/30 px-3.5 py-1.5 hover:bg-foreground/10">
                          Edytuj
                        </Link>
                      )}
                      <button type="button" aria-label={`Usuń ${c.name}`} onClick={() => setToDelete(c)} className={dangerButton}>
                        Usuń
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${isPlaceholderData ? "opacity-60" : ""}`}>
          {rows.map((c) => (
            <li key={c.id} className={`relative aspect-square overflow-hidden rounded-xl bg-foreground/10 ${picked.has(c.id) ? "outline-3 outline-offset-2 outline-primary" : ""} ${c.hasImage === false ? "ring-[3px] ring-inset ring-red-600" : ""}`}>
              {c.imageUrl ? <Image src={c.imageUrl} alt="" fill sizes="(min-width: 1024px) 16vw, 33vw" className="object-cover" /> : <span className="grid size-full place-items-center px-2 text-center text-sm text-foreground/70">{c.hasImage === false ? "Brak zdjęcia" : "Zdjęcie spoza Solvro"}</span>}
              <input type="checkbox" aria-label={`Zaznacz ${c.name}`} checked={picked.has(c.id)} onChange={() => toggle(c.id)} className="absolute left-2 top-2 size-6 accent-[#80b3ff]" />
              {editable(c) && (
                <Link href={`/recipes/${c.id}/edit`} aria-label={`Edytuj ${c.name}`} className="absolute right-2 top-2 rounded-full bg-background/85 px-3 py-1 text-sm backdrop-blur hover:bg-background">
                  Edytuj
                </Link>
              )}
              <div className="glass absolute inset-x-1.5 bottom-1.5 rounded-lg px-2.5 py-1.5 text-sm">
                <p className="flex items-center gap-1.5 font-semibold leading-tight">
                  <span className="truncate">{c.name}</span>
                  {c.verified && <VerifiedIcon />}
                </p>
                <p className="truncate opacity-90">{author(c)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.meta.lastPage > 1 && (
        <nav className="flex items-center justify-center gap-4" aria-label="Paginacja">
          <button type="button" onClick={() => update({ page: String(q.page - 1) })} disabled={q.page <= 1} className={button}>
            Poprzednia
          </button>
          <span>
            Strona {q.page} z {data.meta.lastPage}
          </span>
          <button type="button" onClick={() => update({ page: String(q.page + 1) })} disabled={q.page >= data.meta.lastPage || isPlaceholderData} className={button}>
            Następna
          </button>
        </nav>
      )}

      {picked.size > 0 && (
        <div role="region" aria-label="Akcje grupowe" className="glass sticky bottom-24 z-30 flex flex-wrap items-center gap-3 rounded-3xl px-5 py-2.5 md:bottom-3 md:rounded-full">
          <b className="tabular-nums">{picked.size} zaznaczone</b>
          <span className="flex-1" />
          <button type="button" onClick={() => setPicked(new Set())} className="rounded-full border border-white/55 px-4 py-1.5 hover:bg-white/15">
            Wyczyść
          </button>
          <button type="button" disabled={verify.isPending} onClick={() => run([...picked], false)} className="rounded-full border border-white/55 px-4 py-1.5 hover:bg-white/15 disabled:opacity-50">
            Usuń znaczek
          </button>
          <button type="button" disabled={verify.isPending} onClick={() => run([...picked], true)} className="rounded-full bg-white px-4 py-1.5 font-bold text-[#203560] hover:opacity-90 disabled:opacity-50">
            Oznacz jako zweryfikowane
          </button>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Usunąć „${toDelete.name}”?`}
          text="Razem z opiniami o tym koktajlu. Tego nie da się cofnąć."
          confirmLabel="Usuń koktajl"
          onClose={() => setToDelete(null)}
          onConfirm={() =>
            remove.mutate(toDelete.id, {
              onSuccess: () => {
                setNotice(`Usunięto „${toDelete.name}”.`);
                setPicked((s) => new Set([...s].filter((id) => id !== toDelete.id)));
              },
              onError: () => setNotice(`Nie udało się usunąć „${toDelete.name}”. Spróbuj ponownie.`),
            })
          }
        />
      )}
    </div>
  );
}

// useSearchParams wymaga Suspense, bo strona jest budowana statycznie
export default function AdminCocktailsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Cocktails />
    </Suspense>
  );
}
