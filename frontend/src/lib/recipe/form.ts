// Model formularza przepisu: czyste funkcje (bez Reacta i sieci), żeby reguły dało się sprawdzić testem.
// Limity i reguły są te same co w backendzie (CocktailWriteSerializer); backend i tak sprawdza wszystko jeszcze raz.
export const LIMITS = { name: 200, glass: 100, imageUrl: 500, instructions: 5000, measure: 200, rows: 50 } as const;

/** Jeden wiersz składnika. `ingredientId` jest puste, dopóki nie wybrano składnika z listy (samo wpisanie nazwy nie wystarcza). */
export type IngredientRow = { key: string; ingredientId: number | null; name: string; measure: string };

export type RecipeForm = {
  name: string;
  category: string;
  glass: string;
  alcoholic: boolean;
  imageUrl: string;
  instructions: string;
  rows: IngredientRow[];
};

export type FormErrors = {
  name?: string;
  category?: string;
  glass?: string;
  imageUrl?: string;
  instructions?: string;
  rows?: string; // błąd całej listy (za dużo wierszy)
  general?: string; // błąd, którego nie da się przypisać do pola (np. odpowiedź serwera)
  row?: Record<string, string>; // błędy poszczególnych wierszy, po `key`
};

// Klucz tylko do list w Reakcie. Nie crypto.randomUUID: działa wyłącznie na bezpiecznych adresach (https, localhost).
let counter = 0;
const newKey = () => `r${++counter}-${Math.random().toString(36).slice(2, 8)}`;
export const newRow = (): IngredientRow => ({ key: newKey(), ingredientId: null, name: "", measure: "" });

export const emptyForm = (): RecipeForm => ({ name: "", category: "", glass: "", alcoholic: true, imageUrl: "", instructions: "", rows: [] });

const blankRow = (r: IngredientRow) => !r.name.trim() && !r.measure.trim();

/** Adres zdjęcia: pusty jest w porządku, niepusty musi być poprawnym adresem https (tak jak w backendzie). */
export function imageUrlError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (v.length > LIMITS.imageUrl) return `Adres może mieć najwyżej ${LIMITS.imageUrl} znaków.`;
  try {
    if (new URL(v).protocol !== "https:") return "Adres zdjęcia musi zaczynać się od https://.";
  } catch {
    return "To nie wygląda jak adres. Wklej cały link, np. https://...";
  }
  return undefined;
}

export function validate(f: RecipeForm): FormErrors {
  const e: FormErrors = {};
  if (!f.name.trim()) e.name = "Podaj nazwę przepisu.";
  else if (f.name.trim().length > LIMITS.name) e.name = `Nazwa może mieć najwyżej ${LIMITS.name} znaków.`;
  if (!f.category) e.category = "Wybierz kategorię.";
  if (f.glass.length > LIMITS.glass) e.glass = `Najwyżej ${LIMITS.glass} znaków.`;
  const image = imageUrlError(f.imageUrl);
  if (image) e.imageUrl = image;
  if (f.instructions.length > LIMITS.instructions) e.instructions = `Instrukcja może mieć najwyżej ${LIMITS.instructions} znaków.`;

  const rows = f.rows.filter((r) => !blankRow(r));
  if (rows.length > LIMITS.rows) e.rows = `Najwyżej ${LIMITS.rows} składników.`;
  const row: Record<string, string> = {};
  const seen = new Map<number, string>(); // id składnika -> key pierwszego wiersza z nim
  for (const r of rows) {
    if (r.ingredientId == null) row[r.key] = r.name.trim() ? "Wybierz składnik z listy albo dodaj nowy." : "Wybierz składnik.";
    else if (seen.has(r.ingredientId)) row[r.key] = "Ten składnik jest już na liście.";
    else seen.set(r.ingredientId, r.key);
    if (r.measure.length > LIMITS.measure && !row[r.key]) row[r.key] = `Miara może mieć najwyżej ${LIMITS.measure} znaków.`;
  }
  if (Object.keys(row).length) e.row = row;
  return e;
}

export const hasErrors = (e: FormErrors) => Object.keys(e).length > 0;

/** Kształt, którego oczekuje własny backend przy POST/PUT/PATCH /cocktails/. */
export function toPayload(f: RecipeForm) {
  return {
    name: f.name.trim(),
    category: f.category,
    glass: f.glass.trim(),
    alcoholic: f.alcoholic,
    image_url: f.imageUrl.trim(),
    instructions: f.instructions.trim(),
    ingredients: f.rows.filter((r) => !blankRow(r)).map((r) => ({ ingredient: r.ingredientId as number, measure: r.measure.trim() })),
  };
}

type Source = {
  name: string;
  category: string;
  glass: string;
  alcoholic: boolean;
  imageUrl: string | null;
  instructions: string;
  ingredients: { id: number; name: string; measure: string | null }[];
};

/** Formularz wypełniony istniejącym przepisem (edycja). */
export const fromRecipe = (c: Source): RecipeForm => ({
  name: c.name,
  category: c.category,
  glass: c.glass,
  alcoholic: c.alcoholic,
  imageUrl: c.imageUrl ?? "",
  instructions: c.instructions,
  rows: c.ingredients.map((i) => ({ key: newKey(), ingredientId: i.id, name: i.name, measure: i.measure ?? "" })),
});

// Porównanie bez kluczy wierszy (klucze są losowe) i bez pustych wierszy: "zmieniono" to realna zmiana treści.
const content = (f: RecipeForm) =>
  JSON.stringify({ ...f, name: f.name.trim(), rows: f.rows.filter((r) => !blankRow(r)).map(({ ingredientId, name, measure }) => ({ ingredientId, name: name.trim(), measure: measure.trim() })) });

export const isDirty = (current: RecipeForm, initial: RecipeForm) => content(current) !== content(initial);

/** Czy użytkownik cokolwiek wpisał (domyślna kategoria i przełącznik alkoholu nie liczą się): pustego formularza nie zapisujemy jako szkic. */
export const isEmpty = (f: RecipeForm) => !f.name.trim() && !f.glass.trim() && !f.imageUrl.trim() && !f.instructions.trim() && f.rows.every(blankRow);

const asText = (v: unknown): string | undefined => {
  const first = Array.isArray(v) ? v.find((x) => typeof x === "string") : v;
  return typeof first === "string" ? first : undefined;
};

/** Przekłada odpowiedź błędu backendu ({"name": ["..."], "image_url": [...]}) na błędy formularza. */
export function serverErrors(status: number, body: unknown): FormErrors {
  if (status === 429) return { general: "Za dużo zmian naraz. Poczekaj minutę i spróbuj ponownie." };
  if (status === 401) return { general: "Sesja wygasła. Zaloguj się ponownie (szkic jest zapisany)." };
  if (status === 403) return { general: "Nie masz uprawnień do tego przepisu." };
  if (status === 400 && body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const e: FormErrors = {};
    if (asText(b.name)) e.name = asText(b.name);
    if (asText(b.category)) e.category = asText(b.category);
    if (asText(b.glass)) e.glass = asText(b.glass);
    if (asText(b.image_url)) e.imageUrl = asText(b.image_url);
    if (asText(b.instructions)) e.instructions = asText(b.instructions);
    if (b.ingredients) e.rows = asText(b.ingredients) ?? "Popraw listę składników.";
    return hasErrors(e) ? e : { general: asText(b.detail) ?? "Serwer odrzucił te dane. Sprawdź formularz." };
  }
  return { general: "Nie udało się zapisać. Spróbuj ponownie za chwilę." };
}
