import { describe, expect, it } from "vitest";
import { DEMO_USER, activityOf, dailySeries, distribute, isDemoId, myReviewsOf, seedDemoData, statsOf, withoutRecipe, withoutReview } from "./fixtures";

const NOW = new Date(2026, 9, 30, 12, 0, 0); // 30 października 2026
const seed = () => seedDemoData(NOW);

describe("distribute i dailySeries", () => {
  it("suma wychodzi dokładnie, także gdy dzielenie się nie zgadza", () => {
    for (const total of [0, 1, 97, 274, 612, 1001]) {
      const parts = distribute(total, Array.from({ length: 30 }, (_, i) => 1 + i * 0.12));
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
    }
  });
  it("seria dzienna ma 30 dni i zadaną sumę", () => {
    const s = dailySeries(612, 1);
    expect(s).toHaveLength(30);
    expect(s.reduce((a, b) => a + b, 0)).toBe(612);
  });
  it("jest powtarzalna (te same dane dają ten sam wykres)", () => {
    expect(dailySeries(301, 2)).toEqual(dailySeries(301, 2));
    expect(dailySeries(301, 2)).not.toEqual(dailySeries(301, 3));
  });
});

describe("dane początkowe", () => {
  it("id przepisów demo są rozpoznawane, id z Solvro nie", () => {
    expect(seed().recipes.every((r) => isDemoId(r.id))).toBe(true);
    expect([11007, "11007", 42].some(isDemoId)).toBe(false);
    expect(isDemoId("900001")).toBe(true);
  });
  it("statystyki zgadzają się z przepisami: 4 przepisy, 1284 wyświetlenia, średnia ważona 4,4 z 9 opinii, 5 wystawionych", () => {
    const s = statsOf(seed(), NOW);
    expect(s).toMatchObject({ recipes: 4, viewsTotal: 1284, views30d: 1284, ratingAvg: 4.4, ratingCount: 9, reviewsWritten: 5 });
  });
  it("wykres: 30 dni, kończy się dziś, suma równa views30d", () => {
    const { viewsByDay, views30d } = statsOf(seed(), NOW);
    expect(viewsByDay).toHaveLength(30);
    expect(viewsByDay[29].day).toBe("2026-10-30");
    expect(viewsByDay[0].day).toBe("2026-10-01");
    expect(viewsByDay.reduce((s, d) => s + d.views, 0)).toBe(views30d);
  });
});

describe("to, co zwraca backend", () => {
  it("moje opinie: tylko moje, najnowsze pierwsze", () => {
    const mine = myReviewsOf(seed());
    expect(mine).toHaveLength(5);
    expect(mine.map((r) => r.cocktail.name)).toEqual(["Daiquiri", "Moscow Mule", "Margarita", "Manhattan", "Whiskey Sour"]);
  });
  it("aktywność miesza otrzymane i wystawione, od najnowszych, i respektuje limit", () => {
    const a = activityOf(seed(), 4);
    expect(a).toHaveLength(4);
    expect(a.map((e) => e.kind)).toEqual(["received", "given", "received", "given"]);
    expect(a[0]).toMatchObject({ author: "tomek_barman", cocktail: { name: "Wiśniowy Mojito" } });
    expect(activityOf(seed(), 50)).toHaveLength(8);
  });
  it("opinia cudza o cudzym koktajlu nie trafia do aktywności", () => {
    const d = seed();
    d.reviews.push({ id: 99, rating: 1, text: "x", createdAt: NOW.toISOString(), author: "ktoś", cocktail: { id: 11007, name: "Margarita", imageUrl: null } });
    expect(activityOf(d, 50).some((e) => e.id === 99)).toBe(false);
  });
});

describe("zmiany", () => {
  it("usunięcie przepisu usuwa jego opinie i wpływa na statystyki, a oryginał zostaje nietknięty", () => {
    const before = seed();
    const after = withoutRecipe(before, 900_001);
    expect(after.recipes).toHaveLength(3);
    expect(after.reviews.some((r) => r.cocktail.id === 900_001)).toBe(false);
    expect(before.recipes).toHaveLength(4);
    expect(statsOf(after, NOW)).toMatchObject({ recipes: 3, viewsTotal: 672, ratingCount: 4 });
  });
  it("usunięcie opinii zmniejsza liczbę wystawionych", () => {
    const after = withoutReview(seed(), 3);
    expect(statsOf(after, NOW).reviewsWritten).toBe(4);
    expect(myReviewsOf(after).some((r) => r.id === 3)).toBe(false);
    expect(DEMO_USER).toBe("kasia_mixuje");
  });
  it("bez przepisów statystyki są zerami, a nie błędem", () => {
    const empty = { recipes: [], reviews: [] };
    expect(statsOf(empty, NOW)).toMatchObject({ recipes: 0, viewsTotal: 0, ratingAvg: null, ratingCount: 0, reviewsWritten: 0 });
    expect(statsOf(empty, NOW).viewsByDay.every((d) => d.views === 0)).toBe(true);
  });
});
