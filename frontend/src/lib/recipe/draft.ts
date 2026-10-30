import { type RecipeForm, emptyForm } from "./form";

// Szkic formularza w localStorage: edytor zapisuje go po każdej zmianie, więc zamknięta karta, awaria albo wygasła sesja
// nie kasują pracy. Klucz zawiera właściciela (konto albo "demo") i id przepisu ("new" dla nowego), żeby szkice się nie mieszały.
type Backend = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type Draft = { form: RecipeForm; savedAt: string };

export const draftKey = (owner: string, id: number | null) => `recipe-draft:${owner}:${id ?? "new"}`;

const isRow = (r: unknown): boolean => {
  const x = r as RecipeForm["rows"][number];
  return typeof x?.key === "string" && typeof x?.name === "string" && typeof x?.measure === "string" && (x.ingredientId === null || typeof x.ingredientId === "number");
};

/** Odczyt z walidacją kształtu: uszkodzony albo obcy zapis to "brak szkicu", nigdy błąd. */
export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    const f = d?.form;
    const ok =
      typeof d?.savedAt === "string" &&
      ["name", "category", "glass", "imageUrl", "instructions"].every((k) => typeof f?.[k] === "string") &&
      typeof f?.alcoholic === "boolean" &&
      Array.isArray(f?.rows) &&
      f.rows.every(isRow);
    return ok ? { form: { ...emptyForm(), ...f }, savedAt: d.savedAt } : null;
  } catch {
    return null;
  }
}

export const loadDraft = (storage: Backend, key: string) => parseDraft(storage.getItem(key));

export function saveDraft(storage: Backend, key: string, form: RecipeForm, now = new Date()) {
  try {
    storage.setItem(key, JSON.stringify({ form, savedAt: now.toISOString() } satisfies Draft));
  } catch {} // pełny albo zablokowany localStorage: szkic to dodatek, nie wolno z jego powodu zepsuć edycji
}

export const clearDraft = (storage: Backend, key: string) => storage.removeItem(key);
