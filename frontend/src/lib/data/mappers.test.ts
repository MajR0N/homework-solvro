import { describe, expect, it } from "vitest";
import { activityFromOwn, reviewFromOwn, statsFromOwn } from "./mappers";

const ref = { id: 7, name: "Margarita", image_url: "https://cocktails.solvro.pl/images/cocktails/margarita.png" };

describe("mappers", () => {
  it("opinia: snake_case na camelCase, zdjęcie z hosta Solvro zostaje", () => {
    expect(reviewFromOwn({ id: 1, rating: 4, text: "ok", created_at: "2026-10-30T10:00:00Z", cocktail: ref })).toEqual({
      id: 1, rating: 4, text: "ok", createdAt: "2026-10-30T10:00:00Z", cocktail: { id: 7, name: "Margarita", imageUrl: ref.image_url },
    });
  });
  it("zdjęcie spoza hosta Solvro albo bez https jest pomijane (next/image by je odrzucił)", () => {
    for (const url of ["https://evil.example/a.png", "http://cocktails.solvro.pl/a.png", "", "nie-adres"]) {
      const r = reviewFromOwn({ id: 1, rating: 5, text: "", created_at: "x", cocktail: { ...ref, image_url: url } });
      expect(r.cocktail.imageUrl, url).toBeNull();
    }
  });
  it("aktywność: kind i autor (null = usunięte konto)", () => {
    const base = { id: 2, rating: 3, text: "", created_at: "x", cocktail: ref };
    expect(activityFromOwn({ ...base, kind: "received", author_username: "bob" })).toMatchObject({ kind: "received", author: "bob" });
    expect(activityFromOwn({ ...base, kind: "given", author_username: null })).toMatchObject({ kind: "given", author: null });
  });
  it("statystyki: wszystkie pola przetłumaczone, brak ocen = null", () => {
    const days = [{ day: "2026-10-30", views: 2 }];
    expect(statsFromOwn({ recipes: 2, views_total: 5, views_30d: 4, rating_avg: null, rating_count: 0, reviews_written: 1, views_by_day: days })).toEqual({
      recipes: 2, viewsTotal: 5, views30d: 4, ratingAvg: null, ratingCount: 0, reviewsWritten: 1, viewsByDay: days,
    });
  });
});
