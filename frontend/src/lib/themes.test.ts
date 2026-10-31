import { describe, expect, it } from "vitest";
import { THEMES, themeFilters, themeHref } from "./themes";

describe("motywy rzędów (Odkrywaj)", () => {
  it("mają niepowtarzalne id i dokładnie jeden parametr", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    for (const t of THEMES) expect(Object.keys(t.params)).toHaveLength(1);
  });

  it("motyw ze składnikiem jest tylko dla własnego backendu, reszta działa też z API Solvro", () => {
    for (const t of THEMES) expect(!!t.own).toBe("ing" in t.params);
  });

  it("zapytanie i link mówią to samo", () => {
    const sour = THEMES.find((t) => t.id === "sour")!;
    expect(themeFilters(sour)).toMatchObject({ name: "sour", alcoholic: "", ingredient: "", page: 1 });
    expect(themeHref(sour)).toBe("/?q=sour");
    const zero = THEMES.find((t) => t.id === "zero")!;
    expect(themeFilters(zero)).toMatchObject({ name: "", alcoholic: "false" });
    expect(themeHref(zero)).toBe("/?alcohol=false");
    const mint = THEMES.find((t) => t.id === "mint")!;
    expect(themeFilters(mint).ingredient).toBe("mint");
    expect(themeHref(mint)).toBe("/?ing=mint");
  });
});
