import { OWN_BASE, type Source } from "./source";

const SOLVRO = "https://cocktails.solvro.pl/api/v1";
const PER_PAGE = 12;

// Typy poniżej to kształt, którego używa interfejs (taki jak w API Solvro). Odpowiedzi własnego backendu
// są do niego tłumaczone w tym pliku (adapter), więc strony i komponenty nie wiedzą, skąd są dane.
export type Status = "trending" | "popular" | "most_popular";

export type Cocktail = {
  id: number;
  name: string;
  category: string;
  glass: string;
  instructions: string;
  imageUrl: string | null;
  alcoholic: boolean;
  // tylko własny backend (Solvro tego nie zna), więc pola są opcjonalne
  verified?: boolean;
  status?: Status | null;
  ratingAvg?: number | null;
  ratingCount?: number;
};
export type Ingredient = {
  id: number;
  name: string;
  description?: string;
  alcohol: boolean;
  type: string | null;
  percentage: number | null;
  imageUrl: string | null;
  measure: string | null;
};
export type Review = { id: number; rating: number; text: string; author: string | null; createdAt: string };
export type Page<T> = { data: T[]; meta: { total: number; lastPage: number } };

// status pozwala odróżnić "nie ma takiego koktajlu" (4xx) od awarii serwera (5xx)
export class HttpError extends Error {
  constructor(public status: number) {
    super(`API ${status}`);
  }
}

function baseUrl(source: Source): string {
  if (source === "solvro") return SOLVRO;
  if (!OWN_BASE) throw new Error("Brak NEXT_PUBLIC_BACKEND_URL");
  return OWN_BASE;
}

async function get<T>(source: Source, path: string, params?: URLSearchParams): Promise<T> {
  const res = await fetch(`${baseUrl(source)}${path}${params ? `?${params}` : ""}`);
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

export type Filters = {
  name: string;
  category: string;
  alcoholic: "" | "true" | "false";
  sort: string;
  page: number;
  ids?: number[]; // favorites view
  verified?: boolean; // tylko własny backend
  ingredient?: string; // tylko własny backend: fragmenty nazw składników po przecinku
};

// ---------- własny backend (Django): kształt odpowiedzi i tłumaczenie na typy interfejsu ----------

type OwnIngredient = {
  id: number;
  name: string;
  description: string;
  alcoholic: boolean;
  type: string;
  percentage: string | number | null; // DRF wysyła liczby dziesiętne jako tekst, np. "40.00"
  image_url: string;
  measure?: string;
};
type OwnCocktail = {
  id: number;
  name: string;
  category: string;
  glass: string;
  alcoholic: boolean;
  image_url: string;
  instructions?: string; // na liście go nie ma, tylko w szczegółach
  ingredients?: OwnIngredient[];
  verified?: boolean;
  status?: Status | null;
  rating_avg?: number | null;
  rating_count?: number;
};
type OwnReview = { id: number; rating: number; text: string; author_username: string | null; created_at: string };

// next/image przyjmuje tylko hosty z next.config.ts. Własne koktajle mogą mieć dowolny adres zdjęcia, więc
// zdjęcia spoza hosta Solvro pomijamy (placeholder). Docelowo to zastąpi wgrywanie plików.
function allowedImage(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "cocktails.solvro.pl" ? url : null;
  } catch {
    return null;
  }
}

const fromOwn = (c: OwnCocktail): Cocktail => ({
  id: c.id,
  name: c.name,
  category: c.category,
  glass: c.glass,
  alcoholic: c.alcoholic,
  instructions: c.instructions ?? "",
  imageUrl: allowedImage(c.image_url),
  verified: c.verified ?? false,
  status: c.status ?? null,
  ratingAvg: c.rating_avg ?? null,
  ratingCount: c.rating_count ?? 0,
});

const ingredientFromOwn = (i: OwnIngredient): Ingredient => ({
  id: i.id,
  name: i.name,
  description: i.description || undefined,
  alcohol: i.alcoholic,
  type: i.type || null,
  percentage: i.percentage == null ? null : Number(i.percentage),
  imageUrl: allowedImage(i.image_url),
  measure: i.measure || null,
});

// ---------- funkcje używane przez strony ----------

export async function listCocktails(f: Filters, source: Source): Promise<Page<Cocktail>> {
  if (source === "own") {
    // Solvro: sort=+name, name=, id[]=1&id[]=2, perPage. Nasz backend: ordering=name, search=, id=1,2, page_size.
    const p = new URLSearchParams({ page: String(f.page), page_size: String(PER_PAGE), ordering: f.sort.replace(/^\+/, "") });
    if (f.name) p.set("search", f.name);
    if (f.category) p.set("category", f.category);
    if (f.alcoholic) p.set("alcoholic", f.alcoholic);
    if (f.ids) p.set("id", f.ids.join(",")); // puste id= to u nas "brak wyników", nie "wszystkie"
    if (f.verified) p.set("verified", "true");
    if (f.ingredient) p.set("ingredient", f.ingredient);
    const r = await get<{ count: number; results: OwnCocktail[] }>(source, "/cocktails/", p);
    return { data: r.results.map(fromOwn), meta: { total: r.count, lastPage: Math.max(1, Math.ceil(r.count / PER_PAGE)) } };
  }
  const p = new URLSearchParams({ page: String(f.page), perPage: String(PER_PAGE), sort: f.sort });
  if (f.name) p.set("name", f.name);
  if (f.category) p.set("category", f.category);
  if (f.alcoholic) p.set("alcoholic", f.alcoholic);
  f.ids?.forEach((id) => p.append("id[]", String(id)));
  return get<Page<Cocktail>>(source, "/cocktails", p);
}

export async function getCocktail(id: string, source: Source): Promise<Cocktail & { ingredients: Ingredient[] }> {
  if (source === "own") {
    const c = await get<OwnCocktail>(source, `/cocktails/${id}/`);
    return { ...fromOwn(c), ingredients: (c.ingredients ?? []).map(ingredientFromOwn) };
  }
  return get<{ data: Cocktail & { ingredients: Ingredient[] } }>(source, `/cocktails/${id}`).then((r) => r.data);
}

export async function getCategories(source: Source): Promise<string[]> {
  if (source === "own") return (await get<{ name: string }[]>(source, "/categories/")).map((c) => c.name);
  return get<{ data: string[] }>(source, "/cocktails/categories").then((r) => r.data);
}

// Opinie o koktajlu (tylko własny backend). author = null oznacza konto, które zostało usunięte.
export async function listReviews(id: string): Promise<{ total: number; reviews: Review[] }> {
  const r = await get<{ count: number; results: OwnReview[] }>("own", `/cocktails/${id}/reviews/`);
  return {
    total: r.count,
    reviews: r.results.map((x) => ({ id: x.id, rating: x.rating, text: x.text, author: x.author_username, createdAt: x.created_at })),
  };
}

// Zgłasza wyświetlenie szczegółów (tylko własny backend). Błąd jest ignorowany: licznik nie może psuć strony.
// Backend sam odrzuca powtórzenia, więc podwójne wywołanie (np. tryb deweloperski Reacta) niczego nie zawyża.
export function countView(id: string) {
  if (!OWN_BASE) return;
  fetch(`${OWN_BASE}/cocktails/${id}/views/`, { method: "POST" }).catch(() => {});
}
