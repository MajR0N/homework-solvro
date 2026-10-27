const BASE = "https://cocktails.solvro.pl/api/v1";

export type Cocktail = {
  id: number;
  name: string;
  category: string;
  glass: string;
  instructions: string;
  imageUrl: string | null;
  alcoholic: boolean;
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
export type Page<T> = { data: T[]; meta: { total: number; lastPage: number } };

async function get<T>(path: string, params?: URLSearchParams): Promise<T> {
  const res = await fetch(`${BASE}${path}${params ? `?${params}` : ""}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export type Filters = {
  name: string;
  category: string;
  alcoholic: "" | "true" | "false";
  sort: string;
  page: number;
  ids?: number[]; // favorites view
};

export function listCocktails(f: Filters) {
  const p = new URLSearchParams({ page: String(f.page), perPage: "12", sort: f.sort });
  if (f.name) p.set("name", f.name);
  if (f.category) p.set("category", f.category);
  if (f.alcoholic) p.set("alcoholic", f.alcoholic);
  f.ids?.forEach((id) => p.append("id[]", String(id)));
  return get<Page<Cocktail>>("/cocktails", p);
}
export const getCocktail = (id: string) =>
  get<{ data: Cocktail & { ingredients: Ingredient[] } }>(`/cocktails/${id}`).then((r) => r.data);
export const getCategories = () => get<{ data: string[] }>("/cocktails/categories").then((r) => r.data);
