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

  // Telefon (zasada M6): jeden rząd przewijany palcem, kafelki przyciągają się do krawędzi. Od md układ siatki jak niżej.
  // dokładnie pięć = kafelki (jeden duży i cztery małe); mniej = zwykły rząd kart, żeby w siatce nie zostały puste komórki
  const bento = items.length === 5;
  return (
    <section aria-labelledby="na-topie" className="mb-8">
      <h2 id="na-topie" className="mb-3 text-xl font-semibold tracking-tight md:mb-4 md:text-2xl">
        Na topie teraz
      </h2>
      <ul
        tabIndex={0}
        aria-label="Koktajle na topie, przewiń w bok"
        className={`-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:snap-none md:overflow-visible md:px-0 md:pb-0 ${bento ? "md:auto-rows-[13rem] md:grid-cols-2 md:gap-4 lg:grid-cols-4" : "md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"}`}
      >
        {items.map((c, i) => (
          <li key={c.id} className={`h-52 w-[72%] shrink-0 snap-start md:h-auto md:w-auto ${bento && i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
            <CocktailCard cocktail={c} size={bento ? (i === 0 ? "big" : "compact") : "normal"} />
          </li>
        ))}
      </ul>
    </section>
  );
}
