"use client";
import { useQuery } from "@tanstack/react-query";
import { listCocktails } from "@/lib/api";
import type { Source } from "@/lib/source";
import { MIN_ITEMS, type Theme, themeFilters, themeHref } from "@/lib/themes";
import { useInView } from "@/lib/useInView";
import CocktailCard from "./CocktailCard";
import Rail from "./Rail";

// Jeden rząd tematyczny. Dane pobiera dopiero, gdy rząd zbliży się do widoku (siedem rzędów naraz to siedem zapytań, a większości
// nikt nie zobaczy), a rzędu z mniej niż MIN_ITEMS wynikami nie pokazuje wcale (decyzja U9).
export default function ThemeRail({ theme, source }: { theme: Theme; source: Source }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const { data, isError } = useQuery({
    queryKey: ["theme", source, theme.id],
    queryFn: () => listCocktails(themeFilters(theme), source),
    enabled: seen,
    staleTime: 5 * 60_000,
  });

  if (isError || (data && data.data.length < MIN_ITEMS)) return null;
  if (!data) return <div ref={ref} aria-hidden="true" className="mb-8 h-72 animate-pulse rounded-xl bg-foreground/10" />;

  return (
    <Rail title={theme.title} note={theme.note} href={themeHref(theme)} linkLabel={`Zobacz wszystkie (${data.meta.total})`}>
      {data.data.map((c) => (
        <CocktailCard key={c.id} cocktail={c} />
      ))}
    </Rail>
  );
}
