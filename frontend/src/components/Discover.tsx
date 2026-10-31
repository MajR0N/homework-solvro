"use client";
import type { Source } from "@/lib/source";
import { pl } from "@/lib/pl";
import { THEMES } from "@/lib/themes";
import Featured from "./Featured";
import ThemeRail from "./ThemeRail";

// Tryb "Odkrywaj" (decyzje U3 i U5): skrót do kategorii (chipy, dotknięcie otwiera listę z filtrem), potem "Na topie" (tylko własny
// backend i tylko gdy coś jest na topie) i rzędy tematyczne. Rzędy tematyczne ze składnikiem są tylko przy własnym backendzie.
export default function Discover({ categories, source, update }: { categories: string[]; source: Source; update: (patch: Record<string, string>) => void }) {
  return (
    <>
      {categories.length > 0 && (
        <nav aria-label="Kategorie" className="mb-6">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <li key={c} className="shrink-0">
                <button type="button" onClick={() => update({ category: c })} className="inline-flex min-h-11 items-center rounded-full border border-foreground/30 px-4 py-1.5 hover:bg-foreground/10 md:min-h-0">
                  {pl(c)}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {source === "own" && <Featured />}
      {THEMES.filter((t) => !t.own || source === "own").map((t) => (
        <ThemeRail key={t.id} theme={t} source={source} />
      ))}
    </>
  );
}
