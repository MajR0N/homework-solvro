import { describe, expect, it } from "vitest";
import { ROLES, type Role, canManage, grantableRoles, rank } from "../roles";
import { seedDemoData } from "../demo/fixtures";
import { Forbidden, adminStatsOf, catalogOf, cocktailsPage, reportedOf, seedAdminDemo, usersOf, withRole, withVerified, withoutAdminReview, withoutCocktail, withoutReports } from "./demo";
import type { AdminCocktailQuery } from "./types";

const NOW = new Date(2026, 9, 30, 12);
const world = () => ({ demo: seedDemoData(NOW), adm: seedAdminDemo(NOW) });
const Q: AdminCocktailQuery = { search: "", verified: "", hasImage: "", origin: "", ordering: "-popular", page: 1 };
const query = (p: Partial<AdminCocktailQuery>) => ({ ...Q, ...p });

describe("katalog i tabela koktajli", () => {
  it("łączy import i przepisy użytkowników", () => {
    const { demo, adm } = world();
    const rows = catalogOf(demo, adm);
    expect(rows).toHaveLength(16 + 7);
    expect(rows.filter((r) => r.authorName === "")).toHaveLength(16);
  });
  it("filtry: znaczek, pochodzenie, brak zdjęcia, szukanie po nazwie i autorze", () => {
    const { demo, adm } = world();
    const rows = catalogOf(demo, adm);
    const names = (q: Partial<AdminCocktailQuery>) => cocktailsPage(rows, query(q), 100).data.map((c) => c.name);
    expect(names({ verified: "false", origin: "users" })).toEqual(expect.arrayContaining(["Negroni z grejpfrutem", "Manhattan bez lodu"]));
    expect(names({ origin: "import" })).toHaveLength(16);
    expect(names({ hasImage: "false" })).toEqual(["Bez nazwy 2"]);
    expect(names({ search: "tomek" })).toEqual(["Szarlotka z rumem"]); // szukanie dotyczy też autora
    expect(names({ search: "MARG" })).toEqual(["Margarita"]);
  });
  it("sortowanie i stronicowanie jak w backendzie", () => {
    const { demo, adm } = world();
    const rows = catalogOf(demo, adm);
    const page1 = cocktailsPage(rows, query({ ordering: "-popular" }), 5);
    expect(page1.data.map((c) => c.name).slice(0, 2)).toEqual(["Margarita", "Negroni"]);
    expect(page1.meta).toEqual({ total: 23, lastPage: 5 });
    expect(cocktailsPage(rows, query({ ordering: "name", page: 1 }), 100).data[0].name).toBe("Alexander");
    expect(cocktailsPage(rows, query({ ordering: "-name" }), 100).data[0].name).toBe("Wiśniowy Mojito");
    expect(cocktailsPage(rows, query({ page: 99 }), 5).data).toHaveLength(3); // za duża strona = ostatnia
    expect(cocktailsPage(rows, query({ ordering: "verified" }), 100).data[0].verified).toBe(false); // bez znaczka pierwsze
  });
  it("wiersz ma pola, których potrzebuje tabela", () => {
    const { demo, adm } = world();
    const c = cocktailsPage(catalogOf(demo, adm), query({ search: "Bez nazwy" }), 10).data[0];
    expect(c).toMatchObject({ hasImage: false, imageUrl: null, authorName: "anon_barman", verified: false, views30d: 4 });
  });
});

describe("masowe znaczki i usuwanie", () => {
  it("nadanie znaczka dotyczy importu i przepisów, a pominięte id są obojętne", () => {
    const { demo, adm } = world();
    const next = withVerified({ demo, adm }, [11034, 900_102, 424242], true);
    const rows = catalogOf(next.demo, next.adm);
    expect(rows.find((r) => r.id === 11034)?.verified).toBe(true);
    expect(rows.find((r) => r.id === 900_102)?.verified).toBe(true);
    expect(adminStatsOf(next.demo, next.adm, NOW).unverified).toBe(adminStatsOf(demo, adm, NOW).unverified - 2);
    expect(catalogOf(demo, adm).find((r) => r.id === 11034)?.verified).toBe(false); // oryginał nietknięty
  });
  it("znaczek można też zdjąć", () => {
    const { demo, adm } = world();
    const off = withVerified({ demo, adm }, [11007], false);
    expect(catalogOf(off.demo, off.adm).find((r) => r.id === 11007)?.verified).toBe(false);
  });
  it("usunięcie koktajlu usuwa jego opinie, także zgłoszone", () => {
    const { demo, adm } = world();
    const next = withoutCocktail({ demo, adm }, 11007);
    expect(catalogOf(next.demo, next.adm).some((r) => r.id === 11007)).toBe(false);
    expect(reportedOf(next.adm).some((r) => r.cocktail.id === 11007)).toBe(false);
    const recipe = withoutCocktail({ demo, adm }, 900_102);
    expect(recipe.demo.recipes.some((r) => r.id === 900_102)).toBe(false);
  });
});

describe("zgłoszone opinie", () => {
  it("kolejka: tylko zgłoszone, najwięcej zgłoszeń pierwsze, z powodami", () => {
    const { adm } = world();
    const q = reportedOf(adm);
    expect(q.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(q[0]).toMatchObject({ reportCount: 4, author: "marek_88", cocktail: { name: "Margarita" } });
    expect(q[0].reports.map((r) => r.reporter)).toContain("kuba_p");
  });
  it("odrzucenie zgłoszeń zostawia opinię, usunięcie ją kasuje", () => {
    const { adm } = world();
    const dismissed = withoutReports(adm, 1);
    expect(reportedOf(dismissed).map((r) => r.id)).toEqual([2, 3]);
    expect(dismissed.reviews.some((r) => r.id === 1)).toBe(true);
    expect(withoutAdminReview(adm, 1).reviews.some((r) => r.id === 1)).toBe(false);
  });
});

describe("konta i role (te same reguły co backend)", () => {
  const ADMIN_LEVEL: Role[] = ["admin", "staff", "owner"];

  it.each(ADMIN_LEVEL.flatMap((a) => ROLES.flatMap((t) => ROLES.map((n) => [a, t, n] as const))))("aktor %s, konto %s, nowa rola %s", (actorRole, targetRole, newRole) => {
    const { adm } = world();
    const target = { ...adm.users[1], role: targetRole }; // tomek_barman
    const setup = { ...adm, users: adm.users.map((u) => (u.id === target.id ? target : u)) };
    const allowed = rank(targetRole) < rank(actorRole) && rank(newRole) < rank(actorRole);
    const act = () => withRole(setup, { username: "ktoś_inny", role: actorRole }, target.id, newRole);
    if (allowed) expect(act().users.find((u) => u.id === target.id)?.role).toBe(newRole);
    else expect(act).toThrow(Forbidden);
  });

  it("nikt nie zmienia własnej roli, także gdy reguła rang by to dopuściła", () => {
    const { adm } = world();
    for (const role of ADMIN_LEVEL) for (const n of ROLES) expect(() => withRole(adm, { username: "kasia_mixuje", role }, 1, n)).toThrow(Forbidden);
  });

  it("lista kont: moja rola, co mogę edytować i jakie role nadać", () => {
    const { demo, adm } = world();
    const staffView = usersOf(demo, adm, { username: "kasia_mixuje", role: "staff" }, { search: "", role: "" });
    const by = Object.fromEntries(staffView.map((u) => [u.username, u]));
    expect(by.kasia_mixuje).toMatchObject({ role: "staff", canEdit: false, assignableRoles: [] });
    expect(by.tomek_barman).toMatchObject({ canEdit: true, assignableRoles: ["user", "admin"] });
    expect(by["ola.shaker"]).toMatchObject({ canEdit: true }); // staff stoi wyżej od admina
    expect(by.jan_kowalczyk.canEdit).toBe(false); // równy rangą
    expect(by.solvro_owner.canEdit).toBe(false);
    const adminView = Object.fromEntries(usersOf(demo, adm, { username: "kasia_mixuje", role: "admin" }, { search: "", role: "" }).map((u) => [u.username, u]));
    expect(adminView.tomek_barman.assignableRoles).toEqual(["user"]);
    expect(adminView["ola.shaker"].canEdit).toBe(false); // admin nie zarządza adminem
    expect(usersOf(demo, adm, { username: "kasia_mixuje", role: "admin" }, { search: "", role: "" })[0].joined >= staffView[staffView.length - 1].joined).toBe(true);
  });

  it("liczby przy koncie wynikają z danych (przepisy, opinie, zgłoszenia)", () => {
    const { demo, adm } = world();
    const by = Object.fromEntries(usersOf(demo, adm, { username: "x", role: "owner" }, { search: "", role: "" }).map((u) => [u.username, u]));
    expect(by.marek_88).toMatchObject({ recipes: 0, reviews: 1, reports: 4 });
    expect(by.kasia_mixuje).toMatchObject({ recipes: 4, reviews: 5 });
    expect(usersOf(demo, adm, { username: "x", role: "owner" }, { search: "KUBA", role: "" }).map((u) => u.username)).toEqual(["kuba_p"]);
    expect(usersOf(demo, adm, { username: "x", role: "owner" }, { search: "", role: "admin" }).map((u) => u.username)).toEqual(["ola.shaker"]);
  });

  it("odbicie reguł: pomocnicze funkcje zgadzają się z macierzą", () => {
    expect(grantableRoles("owner")).toEqual(["user", "admin", "staff"]);
    expect(grantableRoles("admin")).toEqual(["user"]);
    expect(canManage("staff", "admin")).toBe(true);
    expect(canManage("staff", "staff")).toBe(false);
  });
});

describe("pulpit", () => {
  it("liczby zgadzają się z katalogiem", () => {
    const { demo, adm } = world();
    const s = adminStatsOf(demo, adm, NOW);
    expect(s).toMatchObject({ cocktails: 23, users: 8, reportedReviews: 3, withoutImage: 1 });
    expect(s.pendingRecipes).toBe(5); // 3 przepisy kasia_mixuje + 2 innych autorów bez znaczka
    expect(s.unverified).toBe(6 + 5);
    expect(s.top).toMatchObject({ name: "Margarita", views30d: 1204 });
    expect(s.newUsers.map((u) => u.username)).toEqual(["marek_88", "kuba_p", "anon_barman", "kasia_mixuje"]);
  });
  it("wykres 7 dni kończy się dziś, a suma to views7d", () => {
    const { demo, adm } = world();
    const s = adminStatsOf(demo, adm, NOW);
    expect(s.viewsByDay).toHaveLength(7);
    expect(s.viewsByDay[6].day).toBe("2026-10-30");
    expect(s.viewsByDay.reduce((a, d) => a + d.views, 0)).toBe(s.views7d);
    expect(s.views7d).toBeGreaterThan(0);
  });
});
