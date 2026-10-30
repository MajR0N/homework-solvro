import type { Cocktail } from "../api";

// Kształty danych strony konta. Są wspólne dla trybu demo i dla prawdziwego backendu: strony używają tylko tych typów,
// a to, skąd dane pochodzą, wiadomo wyłącznie w hookach (account.ts).
export type CocktailRef = { id: number; name: string; imageUrl: string | null };

/** Mój przepis: zwykły koktajl plus wyświetlenia z ostatnich 30 dni (tabela panelu autora). */
export type MyRecipe = Cocktail & { views30d: number };

export type MyReview = { id: number; rating: number; text: string; createdAt: string; cocktail: CocktailRef };

/** received = ktoś ocenił mój koktajl (author = kto), given = ja oceniłem cudzy. */
export type ActivityEvent = MyReview & { kind: "received" | "given"; author: string | null };

export type MyStats = {
  recipes: number;
  viewsTotal: number;
  views30d: number;
  ratingAvg: number | null;
  ratingCount: number;
  reviewsWritten: number;
  viewsByDay: { day: string; views: number }[]; // 30 dni od najstarszego, także dni z zerem
};
