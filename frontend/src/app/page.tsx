"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import CocktailCard from "@/components/CocktailCard";
import SourceSwitch from "@/components/SourceSwitch";
import { getCategories, listCocktails, type Filters } from "@/lib/api";
import { useFavorites } from "@/lib/favorites";
import { pl } from "@/lib/pl";
import { useSource } from "@/lib/source";

// API sortuje tylko z prefiksem + lub - (samo "name" jest po cichu ignorowane)
const SORTS = [
  { value: "+name", label: "Nazwa A–Z" },
  { value: "-name", label: "Nazwa Z–A" },
  { value: "+category", label: "Kategoria" },
];

// Dodatkowe sortowania znane tylko własnemu backendowi (liczone z wyświetleń i ocen)
const OWN_SORTS = [
  { value: "-popular", label: "Najpopularniejsze" },
  { value: "-trending", label: "Na topie" },
  { value: "-top_rated", label: "Najlepiej oceniane" },
];

const field = "w-full rounded-lg border border-foreground/25 bg-background px-3 py-2";
const button = "rounded-lg border px-4 py-2 hover:bg-foreground/10 disabled:opacity-40";

// Filtry żyją w URL-u (?q=...&category=...), więc odświeżenie, link i "wstecz" je zachowują.
function Cocktails() {
  const router = useRouter();
  const sp = useSearchParams();
  const favs = useFavorites();
  const source = useSource();

  // URL to dane od użytkownika - każdą wartość sprawdzamy
  const name = sp.get("q") ?? "";
  const category = sp.get("category") ?? "";
  const a = sp.get("alcohol");
  const alcoholic: Filters["alcoholic"] = a === "true" || a === "false" ? a : "";
  const sorts = source === "own" ? [...SORTS, ...OWN_SORTS] : SORTS;
  const sort = sorts.find((s) => s.value === sp.get("sort"))?.value ?? "+name";
  // filtry dostępne tylko we własnym backendzie; przy Solvro ignorujemy je, nawet jeśli są w adresie
  const verified = source === "own" && sp.get("verified") === "1";
  const ingredient = source === "own" ? (sp.get("ing") ?? "") : "";
  const page = Math.max(1, parseInt(sp.get("page") ?? "", 10) || 1);
  const onlyFav = sp.get("fav") === "1";

  // Zmienia parametry URL-a; pusta wartość = usuń. Każda zmiana filtra wraca na stronę 1.
  // Czyta window.location (nie sp), żeby opóźnione wywołanie nie użyło nieaktualnych parametrów.
  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    router.replace(next.toString() ? `?${next}` : "/", { scroll: false });
  };

  // pole tekstowe ma własny stan (płynne pisanie), do URL-a trafia po 300 ms przerwy
  const [text, setText] = useState(name);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const [ingText, setIngText] = useState(sp.get("ing") ?? "");
  const ingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(ingTimer.current), []);

  // Bez id[] API zwraca WSZYSTKIE koktajle, więc przy pustej liście nie wolno pytać.
  const noFavs = onlyFav && favs.length === 0;

  // ponytail: id[] trafia do URL-a zapytania, więc setki ulubionych = długi URL; wtedy filtrowanie po stronie klienta
  const filters: Filters = { name, category, alcoholic, sort, page, ids: onlyFav ? favs : undefined, verified, ingredient };
  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ["cocktails", source, filters], // zmiana filtrów albo źródła = nowy klucz = nowe zapytanie
    queryFn: () => listCocktails(filters, source),
    enabled: !noFavs,
    placeholderData: keepPreviousData, // poprzednie wyniki widoczne, gdy ładują się nowe
  });
  const categories = useQuery({ queryKey: ["categories", source], queryFn: () => getCategories(source), staleTime: Infinity });

  return (
    <main className="mx-auto w-full max-w-5xl p-4">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Koktajle</h1>
        <SourceSwitch />
      </div>

      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block text-sm">
          Szukaj
          <input
            type="search"
            value={text}
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => update({ q: v.trim() }), 300);
            }}
            placeholder="np. margarita"
            className={field}
          />
        </label>
        <label className="block text-sm">
          Kategoria
          <select value={category} onChange={(e) => update({ category: e.target.value })} className={field}>
            <option value="">Wszystkie</option>
            {categories.data?.map((c) => (
              <option key={c} value={c}>
                {pl(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Alkohol
          <select value={alcoholic} onChange={(e) => update({ alcohol: e.target.value })} className={field}>
            <option value="">Wszystkie</option>
            <option value="true">Z alkoholem</option>
            <option value="false">Bezalkoholowe</option>
          </select>
        </label>
        <label className="block text-sm">
          Sortuj
          <select value={sort} onChange={(e) => update({ sort: e.target.value })} className={field}>
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {source === "own" && (
          <label className="block text-sm">
            Składnik
            <input
              type="search"
              value={ingText}
              onChange={(e) => {
                const v = e.target.value;
                setIngText(v);
                clearTimeout(ingTimer.current);
                ingTimer.current = setTimeout(() => update({ ing: v.trim() }), 300);
              }}
              placeholder="np. mint, lime"
              aria-describedby="ing-hint"
              className={field}
            />
            <span id="ing-hint" className="mt-1 block text-xs text-foreground/70">
              Nazwy po angielsku; po przecinku: koktajl musi mieć wszystkie.
            </span>
          </label>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:col-span-2 lg:col-span-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={onlyFav} onChange={(e) => update({ fav: e.target.checked ? "1" : "" })} />
            Tylko ulubione ({favs.length})
          </label>
          {source === "own" && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={verified} onChange={(e) => update({ verified: e.target.checked ? "1" : "" })} />
              Tylko zweryfikowane
            </label>
          )}
        </div>
      </form>

      {noFavs ? (
        <p className="py-12 text-center text-foreground/70">Nie masz jeszcze ulubionych koktajli. Kliknij ♡ na karcie.</p>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
          <p className="mb-3">Nie udało się pobrać koktajli.</p>
          <button onClick={() => refetch()} className={button}>
            Spróbuj ponownie
          </button>
        </div>
      ) : isPending ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Ładowanie">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i} className="aspect-4/5 animate-pulse rounded-xl bg-foreground/10" />
          ))}
        </ul>
      ) : data.data.length === 0 ? (
        <p className="py-12 text-center text-foreground/70">Brak koktajli spełniających kryteria.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-foreground/70" aria-live="polite">
            Znaleziono: {data.meta.total}
          </p>
          <ul
            className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${isPlaceholderData ? "opacity-60" : ""}`}
          >
            {data.data.map((c) => (
              <li key={c.id}>
                <CocktailCard cocktail={c} />
              </li>
            ))}
          </ul>

          <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Paginacja">
            <button onClick={() => update({ page: String(page - 1) })} disabled={page <= 1} className={button}>
              Poprzednia
            </button>
            <span>
              Strona {page} z {data.meta.lastPage}
            </span>
            <button
              onClick={() => update({ page: String(page + 1) })}
              disabled={page >= data.meta.lastPage || isPlaceholderData}
              className={button}
            >
              Następna
            </button>
          </nav>
        </>
      )}
    </main>
  );
}

// useSearchParams wymaga Suspense, bo strona jest budowana statycznie
export default function Home() {
  return (
    <Suspense>
      <Cocktails />
    </Suspense>
  );
}
