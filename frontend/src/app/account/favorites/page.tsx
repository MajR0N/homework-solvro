"use client";
import Link from "next/link";
import CocktailCard from "@/components/CocktailCard";
import { EmptyState, primaryButton, Skeleton } from "@/components/account/ui";
import { useFavoriteCocktails } from "@/lib/data/account";

// Ulubione są zapisane w tej przeglądarce (localStorage), więc działają tak samo w trybie demo i po zalogowaniu.
export default function FavoritesPage() {
  const { ids, data, error, refetch } = useFavoriteCocktails();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Ulubione</h2>
        {ids.length > 12 && (
          <Link href="/?fav=1" className="text-sm underline underline-offset-4 hover:text-primary">
            Pokaż wszystkie ({ids.length}) na liście
          </Link>
        )}
      </div>
      {ids.length === 0 ? (
        <EmptyState title="Nie masz jeszcze ulubionych" text="Kliknij serce na karcie koktajlu, żeby go tu zapisać.">
          <Link href="/" className={`${primaryButton} mt-2`}>
            Przeglądaj koktajle
          </Link>
        </EmptyState>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
          Nie udało się pobrać ulubionych.{" "}
          <button type="button" onClick={() => refetch()} className="underline underline-offset-4">
            Spróbuj ponownie
          </button>
        </div>
      ) : !data ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Ładowanie">
          {Array.from({ length: Math.min(ids.length, 8) }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-4/5" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {data.data.map((c) => (
            <li key={c.id}>
              <CocktailCard cocktail={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
