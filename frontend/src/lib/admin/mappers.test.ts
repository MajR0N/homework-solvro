import { describe, expect, it } from "vitest";
import { reportedFromAdmin, statsFromAdmin, userFromAdmin } from "./mappers";

describe("mappery panelu administratora", () => {
  it("konto: pola, uprawnienia i nieznana rola jako user", () => {
    const base = { id: 3, username: "ola", date_joined: "2026-10-01T10:00:00Z", recipes: 2, reviews: 5, reports: 1, can_edit: true, assignable_roles: ["user", "admin", "wizard"] };
    expect(userFromAdmin({ ...base, role: "staff" })).toEqual({
      id: 3, username: "ola", role: "staff", joined: "2026-10-01T10:00:00Z", recipes: 2, reviews: 5, reports: 1, canEdit: true, assignableRoles: ["user", "admin"], // "wizard" odrzucone
    });
    expect(userFromAdmin({ ...base, role: "hacker" }).role).toBe("user");
  });
  it("zgłoszona opinia: autor i zgłaszający mogą być pustymi (usuniętymi) kontami, zdjęcie spoza Solvro znika", () => {
    const r = reportedFromAdmin({
      id: 9, rating: 1, text: "spam", created_at: "x", author_username: null,
      cocktail: { id: 4, name: "Margarita", image_url: "https://obcy.example/a.png" }, report_count: 2,
      reports: [{ reporter: null, reason: "" }, { reporter: "ola", reason: "spam" }],
    });
    expect(r).toMatchObject({ author: null, reportCount: 2, cocktail: { id: 4, imageUrl: null } });
    expect(r.reports[0]).toEqual({ reporter: null, reason: "" });
  });
  it("statystyki: snake_case na camelCase, brak najpopularniejszego koktajlu to null", () => {
    const s = statsFromAdmin({
      cocktails: 220, unverified: 3, pending_recipes: 2, without_image: 1, users: 8, reported_reviews: 1, views_7d: 40,
      views_by_day: [{ day: "2026-10-30", views: 5 }], top_cocktail: null, new_users: [{ username: "kuba", role: "user", date_joined: "d" }],
    });
    expect(s).toMatchObject({ pendingRecipes: 2, withoutImage: 1, reportedReviews: 1, views7d: 40, top: null });
    expect(s.newUsers).toEqual([{ username: "kuba", role: "user", joined: "d" }]);
    const withTop = statsFromAdmin({ ...{ cocktails: 1, unverified: 0, pending_recipes: 0, without_image: 0, users: 1, reported_reviews: 0, views_7d: 0, views_by_day: [], new_users: [] }, top_cocktail: { id: 1, name: "Mojito", image_url: "https://cocktails.solvro.pl/m.png", views_30d: 9 } });
    expect(withTop.top).toEqual({ id: 1, name: "Mojito", imageUrl: "https://cocktails.solvro.pl/m.png", views30d: 9 });
  });
});
