"use client";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog, EmptyState, ViewsChart, dangerButton, panel, primaryButton, Skeleton, Thumb } from "@/components/account/ui";
import { StatusPill } from "@/components/Badges";
import { useDeleteRecipe, useMyRecipes, useMyStats } from "@/lib/data/account";
import type { MyRecipe } from "@/lib/data/types";
import { decimal, fmt } from "@/lib/format";

// Panel autora (propozycja D): wykres, liczby i tabela własnych przepisów. Na wąskim ekranie tabela zamienia się
// w wiersze (propozycja E), bo tabela z sześcioma kolumnami się tam nie mieści.
export default function MyRecipesPage() {
  const recipes = useMyRecipes();
  const stats = useMyStats();
  const remove = useDeleteRecipe();
  const [toDelete, setToDelete] = useState<MyRecipe | null>(null);
  const [notice, setNotice] = useState("");

  const rating = (r: MyRecipe) => (r.ratingAvg != null && (r.ratingCount ?? 0) > 0 ? `${decimal(r.ratingAvg)} (${r.ratingCount})` : "brak opinii");
  const mark = (r: MyRecipe) => (r.verified ? "Zweryfikowany" : "Bez znaczka");
  const del = (r: MyRecipe) => (
    <button type="button" onClick={() => setToDelete(r)} aria-label={`Usuń ${r.name}`} className={dangerButton}>
      Usuń
    </button>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Panel autora</h2>
        <Link href="/recipes/new" className={primaryButton}>
          Dodaj przepis
        </Link>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-foreground/25 bg-foreground/5 px-4 py-2.5 text-sm">
          {notice}
        </p>
      )}

      {recipes.error ? (
        <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
          Nie udało się pobrać przepisów.{" "}
          <button type="button" onClick={() => recipes.refetch()} className="underline underline-offset-4">
            Spróbuj ponownie
          </button>
        </div>
      ) : !recipes.data ? (
        <Skeleton className="h-64" />
      ) : recipes.data.length === 0 ? (
        <EmptyState title="Brak przepisów" text="Pierwszy przepis może mieć tylko nazwę, składniki i instrukcję. Zdjęcie dodasz później.">
          <Link href="/recipes/new" className={`${primaryButton} mt-2`}>
            Dodaj pierwszy przepis
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <section className={panel} aria-labelledby="chart-title">
              <h3 id="chart-title" className="mb-3 text-lg font-semibold">
                Wyświetlenia z 30 dni
              </h3>
              {stats.data ? <ViewsChart days={stats.data.viewsByDay} /> : <Skeleton className="h-24" />}
            </section>
            <dl className={`${panel} grid content-center gap-4`}>
              <div>
                <dd className="text-2xl font-bold tabular-nums">{stats.data ? fmt(stats.data.viewsTotal) : "…"}</dd>
                <dt className="text-sm text-foreground/75">wyświetleń razem</dt>
              </div>
              <div>
                <dd className="text-2xl font-bold tabular-nums">{stats.data ? (stats.data.ratingAvg != null ? decimal(stats.data.ratingAvg) : "brak") : "…"}</dd>
                <dt className="text-sm text-foreground/75">średnia ocena</dt>
              </div>
            </dl>
          </div>

          <div className={`${panel} hidden overflow-x-auto !p-2 md:block`}>
            <table className="w-full text-left text-sm">
              <thead className="text-foreground/70">
                <tr>
                  <th className="px-3 py-2 font-semibold">Przepis</th>
                  <th className="px-3 py-2 font-semibold">Znaczek</th>
                  <th className="px-3 py-2 font-semibold">Etykieta</th>
                  <th className="px-3 py-2 text-right font-semibold">Wyświetlenia (30 dni)</th>
                  <th className="px-3 py-2 text-right font-semibold">Ocena</th>
                  <th className="px-3 py-2 text-right font-semibold">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {recipes.data.map((r) => (
                  <tr key={r.id} className="border-t border-foreground/15">
                    <td className="px-3 py-2">
                      <Link href={`/cocktails/${r.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                        <Thumb src={r.imageUrl} className="size-9" />
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{mark(r)}</td>
                    <td className="px-3 py-2">{r.status ? <StatusPill status={r.status} /> : <span className="text-foreground/60">brak</span>}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.views30d)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rating(r)}</td>
                    <td className="px-3 py-2 text-right">{del(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-2 md:hidden">
            {recipes.data.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-foreground/20 bg-foreground/5 p-2">
                <Link href={`/cocktails/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Thumb src={r.imageUrl} className="size-13" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className="block text-sm text-foreground/70">
                      {mark(r)}, {fmt(r.views30d)} wyśw., {rating(r)}
                    </span>
                  </span>
                </Link>
                {del(r)}
              </li>
            ))}
          </ul>
        </>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Usunąć „${toDelete.name}”?`}
          text="Razem z opiniami o tym przepisie. Tego nie da się cofnąć."
          confirmLabel="Usuń przepis"
          onClose={() => setToDelete(null)}
          onConfirm={() =>
            remove.mutate(toDelete.id, {
              onSuccess: () => setNotice(`Usunięto „${toDelete.name}”.`),
              onError: () => setNotice(`Nie udało się usunąć „${toDelete.name}”. Spróbuj ponownie.`),
            })
          }
        />
      )}
    </div>
  );
}
