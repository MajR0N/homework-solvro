import type { Cocktail, Ingredient } from "../api";
import type { ActivityEvent, CocktailRef, MyRecipe, MyReview, MyStats } from "../data/types";

// Dane przykładowe trybu demo i czyste funkcje, które z nich liczą to samo, co backend (statystyki, aktywność, listy).
// Nazwy i zdjęcia koktajli, do których należą opinie, pochodzą z API Solvro; przepisy kasia_mixuje, opinie i liczby są wymyślone.
export const DEMO_USER = "kasia_mixuje";
const IMG = "https://cocktails.solvro.pl/images/cocktails/";

// Id przepisów demo są duże, żeby nie zderzyły się z id z API Solvro (11000+) ani z bazą własnego backendu.
export const DEMO_ID_MIN = 900_000;
export const isDemoId = (id: number | string) => Number(id) >= DEMO_ID_MIN;

export type DemoRecipe = Cocktail & { ingredients: Ingredient[]; views30d: number; viewsTotal: number; daily: number[]; createdAt: string };
export type DemoReview = { id: number; rating: number; text: string; createdAt: string; author: string; cocktail: CocktailRef };
export type DemoData = { recipes: DemoRecipe[]; reviews: DemoReview[] };

/** Rozkłada `total` na części proporcjonalne do wag tak, że suma wychodzi dokładnie `total` (metoda największych reszt). */
export function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ r: r - out[i], i })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; rest > 0; k++, rest--) out[order[k].i]++;
  return out;
}

/** 30 dni wyświetleń o sumie `total`: łagodny wzrost z lekkim, powtarzalnym "szumem" zależnym od `seed`. */
export const dailySeries = (total: number, seed: number) =>
  distribute(total, Array.from({ length: 30 }, (_, i) => 1 + i * 0.12 + ((i * 7 + seed * 3) % 5) * 0.25));

const ref = (id: number, name: string, slug: string): CocktailRef => ({ id, name, imageUrl: `${IMG}${slug}.png` });
const MARGARITA = ref(11007, "Margarita", "margarita");
const DAIQUIRI = ref(11006, "Daiquiri", "daiquiri");
const MULE = ref(11009, "Moscow Mule", "moscow-mule");
const MANHATTAN = ref(11008, "Manhattan", "manhattan");
const SOUR = ref(11004, "Whiskey Sour", "whiskey-sour");

export function seedDemoData(now: Date): DemoData {
  const ago = (days: number, hours = 0) => new Date(now.getTime() - (days * 24 + hours) * 3_600_000).toISOString();
  const ing = (rows: [string, string][]): Ingredient[] =>
    rows.map(([name, measure], i) => ({ id: -(i + 1), name, alcohol: false, type: null, percentage: null, imageUrl: null, measure }));
  const recipe = (
    id: number, name: string, slug: string, category: string, glass: string, instructions: string,
    rows: [string, string][], verified: boolean, views: number, ratingAvg: number | null, ratingCount: number, createdDaysAgo: number, seed: number,
  ): DemoRecipe => ({
    id, name, category, glass, alcoholic: true, instructions, imageUrl: `${IMG}${slug}.png`, ingredients: ing(rows), verified,
    status: views >= 600 ? "popular" : views >= 250 ? "trending" : null, // ponytail: progi wymyślone; w prawdziwym backendzie etykiety liczy baza
    ratingAvg, ratingCount, views30d: views, viewsTotal: views, daily: dailySeries(views, seed), createdAt: ago(createdDaysAgo),
  });
  return {
    recipes: [
      recipe(900_001, "Wiśniowy Mojito", "moscow-mule", "Cocktail", "Highball glass", "Rozgnieć wiśnie z miętą i cukrem. Dodaj rum i sok z limonki, wypełnij lodem i dopełnij wodą gazowaną.",
        [["Rum biały", "50 ml"], ["Wiśnie", "8 sztuk"], ["Mięta", "kilka listków"], ["Sok z limonki", "20 ml"], ["Woda gazowana", "do pełna"]], true, 612, 4.6, 5, 20, 1),
      recipe(900_002, "Negroni z grejpfrutem", "negroni", "Cocktail", "Old-fashioned glass", "Wymieszaj z lodem w szklance, dodaj plaster grejpfruta.",
        [["Gin", "30 ml"], ["Campari", "30 ml"], ["Czerwony wermut", "30 ml"], ["Sok z grejpfruta", "20 ml"]], false, 301, 4.0, 2, 12, 2),
      recipe(900_003, "Domowy Daiquiri", "daiquiri", "Ordinary Drink", "Cocktail glass", "Wstrząśnij z lodem, przelej do schłodzonego kieliszka.",
        [["Rum biały", "60 ml"], ["Sok z limonki", "25 ml"], ["Syrop cukrowy", "15 ml"]], false, 274, 4.3, 2, 9, 3),
      recipe(900_004, "Old Fashioned po polsku", "whiskey-sour", "Cocktail", "Old-fashioned glass", "Rozpuść cukier z angosturą, dodaj whisky i lód, mieszaj.",
        [["Whisky", "50 ml"], ["Angostura", "2 krople"], ["Cukier", "1 łyżeczka"]], false, 97, null, 0, 4, 4),
    ],
    reviews: [
      { id: 1, rating: 4, text: "Dałam odrobinę mniej cukru i było idealnie.", createdAt: ago(1, 3), author: DEMO_USER, cocktail: DAIQUIRI },
      { id: 2, rating: 4, text: "Świeży imbir zamiast piwa imbirowego też działa.", createdAt: ago(2, 5), author: DEMO_USER, cocktail: MULE },
      { id: 3, rating: 4, text: "Klasyka, sól na brzegu robi robotę.", createdAt: ago(5), author: DEMO_USER, cocktail: MARGARITA },
      { id: 4, rating: 5, text: "Najlepiej z dobrym bourbonem.", createdAt: ago(10), author: DEMO_USER, cocktail: MANHATTAN },
      { id: 5, rating: 3, text: "Za kwaśny jak dla mnie.", createdAt: ago(18), author: DEMO_USER, cocktail: SOUR },
      { id: 6, rating: 5, text: "Wiśnie bardzo dobrze łączą się z miętą.", createdAt: ago(0, 4), author: "tomek_barman", cocktail: ref(900_001, "Wiśniowy Mojito", "moscow-mule") },
      { id: 7, rating: 4, text: "Grejpfrut robi różnicę.", createdAt: ago(1, 9), author: "ola.shaker", cocktail: ref(900_002, "Negroni z grejpfrutem", "negroni") },
      { id: 8, rating: 4, text: "Prosty i dobry.", createdAt: ago(3), author: "kuba_p", cocktail: ref(900_003, "Domowy Daiquiri", "daiquiri") },
    ],
  };
}

// ---------- to, co zwróciłby backend (te same kształty co w data/types.ts) ----------

export const recipesOf = (d: DemoData): MyRecipe[] => d.recipes;

const asReview = (r: DemoReview): MyReview => ({ id: r.id, rating: r.rating, text: r.text, createdAt: r.createdAt, cocktail: r.cocktail });
const byNewest = (a: DemoReview, b: DemoReview) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id;

export const myReviewsOf = (d: DemoData): MyReview[] => d.reviews.filter((r) => r.author === DEMO_USER).sort(byNewest).map(asReview);

export function activityOf(d: DemoData, limit: number): ActivityEvent[] {
  const mine = new Set(d.recipes.map((r) => r.id));
  return d.reviews
    .flatMap((r): ActivityEvent[] => {
      if (r.author === DEMO_USER) return [{ ...asReview(r), kind: "given", author: r.author }];
      return mine.has(r.cocktail.id) ? [{ ...asReview(r), kind: "received", author: r.author }] : [];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    .slice(0, limit);
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function statsOf(d: DemoData, now: Date): MyStats {
  const rated = d.recipes.reduce((s, r) => s + (r.ratingCount ?? 0), 0);
  const viewsByDay = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i));
    return { day: isoDay(day), views: d.recipes.reduce((s, r) => s + (r.daily[i] ?? 0), 0) };
  });
  return {
    recipes: d.recipes.length,
    viewsTotal: d.recipes.reduce((s, r) => s + r.viewsTotal, 0),
    views30d: viewsByDay.reduce((s, v) => s + v.views, 0),
    ratingAvg: rated ? Math.round((d.recipes.reduce((s, r) => s + (r.ratingAvg ?? 0) * (r.ratingCount ?? 0), 0) / rated) * 100) / 100 : null,
    ratingCount: rated,
    reviewsWritten: d.reviews.filter((r) => r.author === DEMO_USER).length,
    viewsByDay,
  };
}

// ---------- zmiany (zawsze zwracają nowy obiekt) ----------

/** Usunięcie przepisu usuwa też opinie o nim, tak jak w bazie (CASCADE). */
export const withoutRecipe = (d: DemoData, id: number): DemoData => ({
  recipes: d.recipes.filter((r) => r.id !== id),
  reviews: d.reviews.filter((r) => r.cocktail.id !== id),
});

export const withoutReview = (d: DemoData, id: number): DemoData => ({ ...d, reviews: d.reviews.filter((r) => r.id !== id) });

// ---------- edytor w trybie demo: listy wyboru i zapis przepisu ----------

// Rzeczy, które w prawdziwym backendzie przychodzą z /categories/, /glasses/ i /ingredients/
export const DEMO_CATEGORIES = ["Cocktail", "Ordinary Drink", "Punch / Party Drink", "Shot", "Shake", "Soft Drink"];
export const DEMO_GLASSES = ["Highball glass", "Old-fashioned glass", "Cocktail glass", "Collins glass", "Shot glass", "Copper Mug"];
export const DEMO_INGREDIENTS = [
  "Light rum", "Dark rum", "Gin", "Vodka", "Tequila", "Whiskey", "Bourbon", "Campari", "Sweet vermouth", "Dry vermouth", "Triple sec", "Amaretto",
  "Coffee liqueur", "Angostura bitters", "Lime juice", "Lemon juice", "Grapefruit juice", "Orange juice", "Cranberry juice", "Sugar syrup", "Sugar",
  "Mint", "Lime", "Lemon", "Orange", "Cherry", "Egg white", "Cream", "Soda water", "Ginger beer", "Tonic water", "Cola",
];

/** Id składnika w trybie demo: ten sam tekst zawsze daje to samo (ujemne) id, żeby nie zderzyło się z prawdziwymi. */
export function demoIngredientId(name: string): number {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 1_000_003;
  return -(h + 1000);
}

export type RecipeInput = {
  name: string;
  category: string;
  glass: string;
  alcoholic: boolean;
  imageUrl: string;
  instructions: string;
  ingredients: { id: number; name: string; measure: string }[];
};

/** Dodaje nowy przepis (`id` = null) albo zmienia istniejący. Statystyki istniejącego zostają, nowy zaczyna od zera. */
export function withRecipeSaved(d: DemoData, input: RecipeInput, id: number | null, now: Date): { data: DemoData; id: number } {
  const ingredients: Ingredient[] = input.ingredients.map((i) => ({ id: i.id, name: i.name, alcohol: false, type: null, percentage: null, imageUrl: null, measure: i.measure || null }));
  const fields = { name: input.name, category: input.category, glass: input.glass, alcoholic: input.alcoholic, instructions: input.instructions, imageUrl: input.imageUrl || null, ingredients };
  if (id != null) {
    if (!d.recipes.some((r) => r.id === id)) throw new Error("Brak takiego przepisu");
    return { id, data: { ...d, recipes: d.recipes.map((r) => (r.id === id ? { ...r, ...fields } : r)) } };
  }
  const newId = Math.max(DEMO_ID_MIN, ...d.recipes.map((r) => r.id)) + 1;
  const created: DemoRecipe = {
    ...fields, id: newId, verified: false, status: null, ratingAvg: null, ratingCount: 0, views30d: 0, viewsTotal: 0, daily: Array(30).fill(0), createdAt: now.toISOString(),
  };
  return { id: newId, data: { ...d, recipes: [...d.recipes, created] } };
}
