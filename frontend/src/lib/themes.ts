import type { Filters } from "./api";

// Rzędy tematyczne z trybu "Odkrywaj" (decyzje U4 i U9). Motyw to zapisane zapytanie z hasłem: te same parametry adresu, których
// używa lista (q, alcohol, ing), więc "Zobacz wszystkie" to zwykły link do listy z filtrem. Uczciwie: "smak" znaczy tu "rodzina z nazwy"
// (Sour, Fizz...) albo flaga alkoholu, a nie dane o smaku. Ponytail: zapytania na sztywno w kodzie; gdy motywy mają układać redaktorzy,
// zastępuje to model "kolekcje" w backendzie (odrzucony na teraz, bo to osobna funkcja z panelem i testami).
export type Theme = {
  id: string;
  title: string;
  note: string;
  params: Record<string, string>; // dokładnie jeden z: q (fragment nazwy), alcohol ("false"), ing (składnik, tylko własny backend)
  own?: boolean; // składniki zna tylko własny backend; API Solvro ich nie filtruje, więc przy nim rząd byłby pusty
};

export const THEMES: Theme[] = [
  { id: "sour", title: "Kwaśno i rześko", note: "Rodzina Sour: cytrusowy kwas w równowadze ze słodyczą.", params: { q: "sour" } },
  { id: "fizz", title: "Bąbelki i lekkość", note: "Rodzina Fizz: lekkie i orzeźwiające.", params: { q: "fizz" } },
  { id: "zero", title: "Zero procent", note: "Pełnia smaku bez alkoholu.", params: { alcohol: "false" } },
  { id: "coffee", title: "Kawa w kieliszku", note: "Na pobudkę albo na deser.", params: { q: "coffee" } },
  { id: "daiquiri", title: "Rumowe klasyki", note: "Daiquiri i jego rodzina.", params: { q: "daiquiri" } },
  { id: "punch", title: "Na imprezę", note: "Poncze dla całej ekipy.", params: { q: "punch" } },
  { id: "mint", title: "Z miętą", note: "Ogród w szklance.", params: { ing: "mint" }, own: true },
  { id: "lime", title: "Cytrusowy zastrzyk", note: "Dużo limonki.", params: { ing: "lime" }, own: true },
];

/** Rząd z mniejszą liczbą wyników się nie pokazuje, żeby motyw nigdy nie wyglądał na pusty (decyzja U9). */
export const MIN_ITEMS = 3;

/** Link "Zobacz wszystkie": lista z tym filtrem (filtr w adresie, więc działa też Wstecz). */
export const themeHref = (t: Theme) => `/?${new URLSearchParams(t.params)}`;

/** Filtry zapytania o pierwszą stronę rzędu. */
export function themeFilters(t: Theme): Filters {
  return {
    name: t.params.q ?? "",
    category: "",
    alcoholic: t.params.alcohol === "false" ? "false" : "",
    sort: "+name",
    page: 1,
    verified: false,
    ingredient: t.params.ing ?? "",
  };
}
