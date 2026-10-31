"use client";
import { useQuery } from "@tanstack/react-query";
import { listCocktails } from "@/lib/api";
import CocktailCard from "./CocktailCard";
import Rail from "./Rail";

// "Na topie teraz": rząd koktajli, które własny backend oznaczył jako trending (decyzja U1: ten sam rząd przewijany na każdym
// ekranie, bez pustych miejsc przy kilku kartach). Solvro nie ma takiej etykiety, więc przy tym źródle strona w ogóle nie
// renderuje tej sekcji (patrz page.tsx). Brak takich koktajli = brak sekcji.
export default function Featured() {
  const { data } = useQuery({
    queryKey: ["featured"],
    // status: "trending" po stronie backendu, więc dostajemy tylko takie koktajle, od najmocniej rosnących
    queryFn: () => listCocktails({ name: "", category: "", alcoholic: "", sort: "-trending", page: 1, verified: false, ingredient: "", status: "trending" }, "own"),
    staleTime: 60_000,
  });
  const items = (data?.data ?? []).slice(0, 10);
  if (items.length === 0) return null;

  return (
    <Rail title="Na topie teraz">
      {items.map((c) => (
        <CocktailCard key={c.id} cocktail={c} />
      ))}
    </Rail>
  );
}
