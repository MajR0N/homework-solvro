"use client";
import { useQuery } from "@tanstack/react-query";
import { listCocktails } from "@/lib/api";
import CocktailCard from "./CocktailCard";

// "Na topie teraz": kafelki z koktajli, które własny backend oznaczył jako trending. Solvro nie ma takiej etykiety,
// więc przy tym źródle strona w ogóle nie renderuje tej sekcji (patrz page.tsx). Brak takich koktajli = brak sekcji.
export default function Featured() {
  const { data } = useQuery({
    queryKey: ["featured"],
    queryFn: () => listCocktails({ name: "", category: "", alcoholic: "", sort: "-trending", page: 1, verified: false, ingredient: "" }, "own"),
    staleTime: 60_000,
  });
  const items = (data?.data ?? []).filter((c) => c.status === "trending").slice(0, 5);
  if (items.length === 0) return null;

  // dokładnie pięć = kafelki (jeden duży i cztery małe); mniej = zwykły rząd kart, żeby w siatce nie zostały puste komórki
  const bento = items.length === 5;
  return (
    <section aria-labelledby="na-topie" className="mb-8">
      <h2 id="na-topie" className="mb-4 text-2xl font-semibold tracking-tight">
        Na topie teraz
      </h2>
      <ul className={bento ? "grid auto-rows-[13rem] grid-cols-2 gap-4 lg:grid-cols-4" : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}>
        {items.map((c, i) => (
          <li key={c.id} className={bento && i === 0 ? "col-span-2 row-span-2" : ""}>
            <CocktailCard cocktail={c} size={bento ? (i === 0 ? "big" : "compact") : "normal"} />
          </li>
        ))}
      </ul>
    </section>
  );
}
