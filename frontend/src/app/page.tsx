"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import CocktailCard from "@/components/CocktailCard";
import Featured from "@/components/Featured";
import FilterBar, { type By } from "@/components/Filters";
import type { Draft } from "@/components/PhoneFilters";
import { getCategories, getGlasses, listCocktails, type Filters } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { STATUS_PL } from "@/lib/pl";
import { useFavorites } from "@/lib/favorites";
import { patchParams } from "@/lib/params";
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

const button = "min-h-11 rounded-full border border-foreground/30 px-5 py-2 hover:bg-foreground/10 disabled:opacity-40";

// Filtry żyją w URL-u (?q=...&category=...), więc odświeżenie, link i "wstecz" je zachowują.
function Cocktails() {
  const router = useRouter();
  const sp = useSearchParams();
  const favs = useFavorites();
  const source = useSource();
  const { session, demo } = useSession();

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
  // "Moje" tylko dla zalogowanego z prawdziwego konta; w trybie demo przepisy nie leżą w backendzie
  const canMine = source === "own" && !!session && !demo;
  const byParam = sp.get("by");
  const by: By = source !== "own" ? "" : byParam === "import" || byParam === "users" || (byParam === "mine" && canMine) ? byParam : "";
  const glass = source === "own" ? (sp.get("glass") ?? "") : "";
  const statusParam = sp.get("status") ?? "";
  const status = source === "own" && statusParam in STATUS_PL ? (statusParam as keyof typeof STATUS_PL) : "";
  const page = Math.max(1, parseInt(sp.get("page") ?? "", 10) || 1);
  const onlyFav = sp.get("fav") === "1";

  // Zmienia parametry URL-a (patrz lib/params.ts); wyszukiwarka i przycisk ulubionych są w pasku u góry (TopBar).
  const update = (patch: Record<string, string>) => router.replace(patchParams(patch), { scroll: false });

  // Bez id[] API zwraca WSZYSTKIE koktajle, więc przy pustej liście nie wolno pytać.
  const noFavs = onlyFav && favs.length === 0;

  // ponytail: id[] trafia do URL-a zapytania, więc setki ulubionych = długi URL; wtedy filtrowanie po stronie klienta
  const filters: Filters = {
    name, category, alcoholic, sort, page, ids: onlyFav ? favs : undefined, verified, ingredient,
    origin: by === "import" || by === "users" ? by : undefined,
    author: by === "mine" ? session?.username : undefined,
    glass: glass || undefined,
    status: status || undefined,
  };
  // Ile wyników dałby zestaw filtrów z arkusza na telefonie (sama liczba: strona 1, tylko meta.total). Szukanie i ulubione zostają z adresu.
  const countFor = async (d: Draft) => {
    const f: Filters = {
      ...filters, page: 1,
      category: d.category, alcoholic: d.alcohol, verified: d.verified, ingredient: d.ing.trim(),
      origin: d.by === "import" || d.by === "users" ? d.by : undefined,
      author: d.by === "mine" ? session?.username : undefined,
      glass: d.glass || undefined,
      status: d.status || undefined,
    };
    return (await listCocktails(f, source)).meta.total;
  };
  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ["cocktails", source, filters], // zmiana filtrów albo źródła = nowy klucz = nowe zapytanie
    queryFn: () => listCocktails(filters, source),
    enabled: !noFavs,
    placeholderData: keepPreviousData, // poprzednie wyniki widoczne, gdy ładują się nowe
  });
  const categories = useQuery({ queryKey: ["categories", source], queryFn: () => getCategories(source), staleTime: Infinity });
  const glasses = useQuery({ queryKey: ["glasses"], queryFn: getGlasses, staleTime: Infinity, enabled: source === "own" });

  return (
    <main id="content" className="mx-auto w-full max-w-7xl p-4">
      <h1 className="mb-3 text-2xl font-bold md:mb-6 md:text-3xl">Koktajle</h1>

      {/* kafelki "Na topie" tylko przy własnym backendzie i tylko na czystej liście (bez filtrów, szukania i ulubionych) */}
      {source === "own" && page === 1 && !name && !category && !alcoholic && !verified && !ingredient && !by && !glass && !status && !onlyFav && <Featured />}

      <FilterBar
        category={category}
        categories={categories.data ?? []}
        alcoholic={alcoholic}
        sort={sort}
        sorts={sorts}
        ingredient={ingredient}
        verified={verified}
        by={by}
        canMine={canMine}
        glass={glass}
        glasses={glasses.data ?? []}
        status={status}
        total={data?.meta.total}
        own={source === "own"}
        update={update}
        countFor={countFor}
      />

      {noFavs ? (
        <p className="py-12 text-center text-foreground/70">Nie masz jeszcze ulubionych koktajli. Kliknij serce na karcie.</p>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-red-500/40 p-6 text-center">
          <p className="mb-3">Nie udało się pobrać koktajli.</p>
          <button onClick={() => refetch()} className={button}>
            Spróbuj ponownie
          </button>
        </div>
      ) : isPending ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true" aria-label="Ładowanie">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i} className="aspect-4/5 animate-pulse rounded-xl bg-foreground/10" />
          ))}
        </ul>
      ) : data.data.length === 0 ? (
        <p className="py-12 text-center text-foreground/70">Brak koktajli spełniających kryteria.</p>
      ) : (
        <>
          <ul
            className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5 ${isPlaceholderData ? "opacity-60" : ""}`}
          >
            {data.data.map((c) => (
              <li key={c.id}>
                <CocktailCard cocktail={c} />
              </li>
            ))}
          </ul>

          <nav className="mt-8 flex items-center justify-center gap-3 md:gap-4" aria-label="Paginacja">
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
