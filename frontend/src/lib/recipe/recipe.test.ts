import { describe, expect, it } from "vitest";
import { clearDraft, draftKey, loadDraft, parseDraft, saveDraft } from "./draft";
import { type IngredientRow, type RecipeForm, emptyForm, fromRecipe, hasErrors, imageUrlError, isDirty, isEmpty, newRow, serverErrors, toPayload, validate } from "./form";

const row = (id: number | null, name: string, measure = ""): IngredientRow => ({ ...newRow(), ingredientId: id, name, measure });
const valid = (): RecipeForm => ({ ...emptyForm(), name: "Mojito", category: "Cocktail", rows: [row(5, "Mint", "kilka"), row(7, "Rum", "50 ml")] });

describe("validate", () => {
  it("poprawny formularz nie ma błędów", () => {
    expect(hasErrors(validate(valid()))).toBe(false);
  });
  it("wymaga nazwy i kategorii", () => {
    const e = validate({ ...valid(), name: "   ", category: "" });
    expect(e.name).toMatch(/nazwę/);
    expect(e.category).toMatch(/kategorię/);
  });
  it("pilnuje limitów z backendu", () => {
    const e = validate({ ...valid(), name: "x".repeat(201), glass: "g".repeat(101), instructions: "i".repeat(5001) });
    expect(e.name && e.glass && e.instructions).toBeTruthy();
    expect(validate({ ...valid(), rows: Array.from({ length: 51 }, (_, i) => row(i + 1, `S${i}`)) }).rows).toMatch(/50/);
    expect(validate({ ...valid(), rows: [row(1, "A", "m".repeat(201))] }).row).toBeTruthy();
  });
  it("adres zdjęcia: pusty ok, https ok, reszta błąd", () => {
    expect(imageUrlError("")).toBeUndefined();
    expect(imageUrlError("https://cocktails.solvro.pl/a.png")).toBeUndefined();
    for (const bad of ["http://x.pl/a.png", "ftp://x.pl/a", "javascript:alert(1)", "nie adres", "https://" + "a".repeat(500)]) expect(imageUrlError(bad), bad).toBeTruthy();
  });
  it("składnik trzeba wybrać z listy: sama wpisana nazwa to błąd wiersza", () => {
    const typed = row(null, "lime juise");
    const e = validate({ ...valid(), rows: [row(5, "Mint"), typed] });
    expect(e.row?.[typed.key]).toMatch(/z listy/);
  });
  it("ten sam składnik dwa razy to błąd na drugim wierszu", () => {
    const a = row(5, "Mint"), b = row(5, "Mint", "2 listki");
    const e = validate({ ...valid(), rows: [a, b] });
    expect(e.row?.[a.key]).toBeUndefined();
    expect(e.row?.[b.key]).toMatch(/już na liście/);
  });
  it("puste wiersze są ignorowane, ale wiersz z samą miarą jest błędem", () => {
    expect(hasErrors(validate({ ...valid(), rows: [...valid().rows, newRow(), newRow()] }))).toBe(false);
    const onlyMeasure = row(null, "", "50 ml");
    expect(validate({ ...valid(), rows: [onlyMeasure] }).row?.[onlyMeasure.key]).toMatch(/Wybierz składnik/);
  });
});

describe("toPayload i fromRecipe", () => {
  it("payload ma kształt backendu, przycięte teksty i pomija puste wiersze", () => {
    const f = { ...valid(), name: "  Mojito  ", imageUrl: " https://x.pl/a.png ", instructions: " Wymieszaj. ", rows: [...valid().rows, newRow()] };
    expect(toPayload(f)).toEqual({
      name: "Mojito", category: "Cocktail", glass: "", alcoholic: true, image_url: "https://x.pl/a.png", instructions: "Wymieszaj.",
      ingredients: [{ ingredient: 5, measure: "kilka" }, { ingredient: 7, measure: "50 ml" }],
    });
  });
  it("edycja: formularz z przepisu i z powrotem daje te same dane", () => {
    const f = fromRecipe({ name: "Mojito", category: "Cocktail", glass: "Highball", alcoholic: false, imageUrl: null, instructions: "Mieszaj", ingredients: [{ id: 5, name: "Mint", measure: null }] });
    expect(f.imageUrl).toBe("");
    expect(f.rows[0]).toMatchObject({ ingredientId: 5, name: "Mint", measure: "" });
    expect(toPayload(f)).toMatchObject({ name: "Mojito", alcoholic: false, image_url: "", ingredients: [{ ingredient: 5, measure: "" }] });
    expect(isDirty(f, fromRecipe({ name: "Mojito", category: "Cocktail", glass: "Highball", alcoholic: false, imageUrl: null, instructions: "Mieszaj", ingredients: [{ id: 5, name: "Mint", measure: null }] }))).toBe(false);
  });
});

describe("isDirty i isEmpty", () => {
  it("zmiana treści to zmiana, losowe klucze i puste wiersze nie", () => {
    const a = valid();
    expect(isDirty({ ...a, rows: [...a.rows, newRow()] }, a)).toBe(false);
    expect(isDirty({ ...a, name: "Mojito " }, a)).toBe(false); // spacje na końcu to nie zmiana
    expect(isDirty({ ...a, name: "Daiquiri" }, a)).toBe(true);
    expect(isDirty({ ...a, alcoholic: false }, a)).toBe(true);
    expect(isDirty({ ...a, rows: a.rows.slice(1) }, a)).toBe(true);
  });
  it("pusty formularz to taki, w którym nic nie wpisano", () => {
    expect(isEmpty(emptyForm())).toBe(true);
    expect(isEmpty({ ...emptyForm(), category: "Shot", alcoholic: false })).toBe(true);
    expect(isEmpty({ ...emptyForm(), instructions: "x" })).toBe(false);
  });
});

describe("szkic", () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  };
  it("klucz rozróżnia właściciela i przepis", () => {
    expect(draftKey("demo", null)).toBe("recipe-draft:demo:new");
    expect(draftKey("ann", 12)).toBe("recipe-draft:ann:12");
    expect(draftKey("ann", 12)).not.toBe(draftKey("bob", 12));
  });
  it("zapis i odczyt oddają ten sam formularz oraz czas", () => {
    const s = memory();
    const now = new Date("2026-10-30T12:00:00Z");
    saveDraft(s, "k", valid(), now);
    const d = loadDraft(s, "k");
    expect(d?.savedAt).toBe(now.toISOString());
    expect(toPayload(d!.form)).toEqual(toPayload(valid()));
    clearDraft(s, "k");
    expect(loadDraft(s, "k")).toBeNull();
  });
  it("uszkodzony albo obcy zapis to brak szkicu", () => {
    for (const raw of [null, "", "{nie json", "[]", JSON.stringify({ form: { name: 1 }, savedAt: "x" }), JSON.stringify({ form: { ...valid(), rows: [{ key: 1 }] }, savedAt: "x" })]) {
      expect(parseDraft(raw), String(raw)).toBeNull();
    }
  });
  it("błąd zapisu (pełny localStorage) nie psuje edycji", () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => {} };
    expect(() => saveDraft(broken, "k", valid())).not.toThrow();
  });
});

describe("serverErrors (odpowiedzi backendu na błędy formularza)", () => {
  it("błędy pól trafiają do właściwych pól", () => {
    const e = serverErrors(400, { name: ["To pole jest wymagane."], image_url: ["Adres zdjęcia musi zaczynać się od https://."], category: ["Zła kategoria"] });
    expect(e).toEqual({ name: "To pole jest wymagane.", imageUrl: "Adres zdjęcia musi zaczynać się od https://.", category: "Zła kategoria" });
  });
  it("błąd listy składników trafia do listy", () => {
    expect(serverErrors(400, { ingredients: ["Ten sam składnik występuje więcej niż raz."] }).rows).toMatch(/Ten sam składnik/);
    expect(serverErrors(400, { ingredients: [{ ingredient: ["Zły id"] }] }).rows).toBe("Popraw listę składników.");
  });
  it("kody 401, 403, 429 mają zrozumiałe komunikaty ogólne", () => {
    expect(serverErrors(401, undefined).general).toMatch(/Sesja wygasła/);
    expect(serverErrors(403, undefined).general).toMatch(/uprawnień/);
    expect(serverErrors(429, undefined).general).toMatch(/Za dużo/);
  });
  it("nieznany kształt albo błąd serwera nie psuje formularza", () => {
    expect(serverErrors(400, { coś: 1 }).general).toBeTruthy();
    expect(serverErrors(400, null).general).toBeTruthy();
    expect(serverErrors(500, undefined).general).toMatch(/Nie udało się/);
  });
});
