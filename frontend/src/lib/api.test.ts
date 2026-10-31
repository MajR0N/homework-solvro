import { describe, expect, it } from "vitest";
import { type Filters, ownListParams } from "./api";

const base: Filters = { name: "", category: "", alcoholic: "", sort: "+name", page: 1 };
const q = (f: Partial<Filters>) => Object.fromEntries(ownListParams({ ...base, ...f }));

describe("ownListParams (zapytanie do własnego backendu)", () => {
  it("bez filtrów: tylko strona, rozmiar i sortowanie bez plusa", () => {
    expect(q({})).toEqual({ page: "1", page_size: "20", ordering: "name" });
    expect(q({ sort: "-popular", page: 3 })).toMatchObject({ page: "3", ordering: "-popular" });
  });
  it("przekłada nazwy parametrów Solvro na własne", () => {
    expect(q({ name: "mar", category: "Shot", alcoholic: "false", verified: true, ingredient: "mint,lime" })).toMatchObject({
      search: "mar", category: "Shot", alcoholic: "false", verified: "true", ingredient: "mint,lime",
    });
  });
  it("nowe filtry: pochodzenie, autor, szklanka, etykieta", () => {
    expect(q({ origin: "users", author: "kasia", glass: "Highball glass", status: "trending" })).toMatchObject({
      origin: "users", author: "kasia", glass: "Highball glass", status: "trending",
    });
  });
  it("puste filtry nie trafiają do adresu", () => {
    const keys = Object.keys(q({ origin: undefined, author: undefined, glass: "", status: undefined }));
    expect(keys).toEqual(["page", "page_size", "ordering"]);
  });
  it("ulubione: lista id po przecinku, a pusta lista to puste id= (brak wyników, nie wszystkie)", () => {
    expect(q({ ids: [3, 5] }).id).toBe("3,5");
    expect(q({ ids: [] }).id).toBe("");
  });
});
