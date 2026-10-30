import type { Cocktail, Page } from "../api";
import type { CocktailRef } from "../data/types";
import { DEMO_USER, type DemoData, type DemoRecipe, dailySeries, withoutRecipe } from "../demo/fixtures";
import { type Role, canManage, grantableRoles } from "../roles";
import type { AdminCocktailQuery, AdminStats, AdminUser, ReportedReview } from "./types";

// Dane panelu administratora w trybie demo i czyste funkcje, które liczą to samo, co backend (/api/v1/admin/...).
// Katalog koktajli składa się z dwóch źródeł: importu (tu) i przepisów użytkowników (DemoData.recipes, te same, które
// widać na koncie i które można edytować w edytorze). Nazwy i zdjęcia importu są z API Solvro; konta, opinie i liczby wymyślone.
const IMG = "https://cocktails.solvro.pl/images/cocktails/";

export type ImportCocktail = { id: number; name: string; slug: string; category: string; verified: boolean; views30d: number; ratingAvg: number | null; ratingCount: number };
export type AdminReview = { id: number; cocktail: CocktailRef; author: string; rating: number; text: string; createdAt: string; reports: { by: string; reason: string }[] };
export type AdminDemoUser = { id: number; username: string; role: Role; joined: string };
export type AdminDemo = { imports: ImportCocktail[]; reviews: AdminReview[]; users: AdminDemoUser[] };

export function seedAdminDemo(now: Date): AdminDemo {
  const ago = (days: number, hours = 0) => new Date(now.getTime() - (days * 24 + hours) * 3_600_000).toISOString();
  const imp = (id: number, name: string, slug: string, category: string, verified: boolean, views30d: number, ratingAvg: number | null, ratingCount: number): ImportCocktail => ({ id, name, slug, category, verified, views30d, ratingAvg, ratingCount });
  const ref = (id: number, name: string, slug: string): CocktailRef => ({ id, name, imageUrl: `${IMG}${slug}.png` });
  return {
    imports: [
      imp(11007, "Margarita", "margarita", "Ordinary Drink", true, 1204, 4.6, 18), imp(11003, "Negroni", "negroni", "Ordinary Drink", true, 938, 4.2, 9),
      imp(11008, "Manhattan", "manhattan", "Cocktail", true, 861, 4.4, 11), imp(11009, "Moscow Mule", "moscow-mule", "Punch / Party Drink", true, 805, 4.0, 6),
      imp(11005, "Dry Martini", "dry-martini", "Cocktail", true, 742, 3.9, 5), imp(11006, "Daiquiri", "daiquiri", "Ordinary Drink", true, 690, 4.3, 7),
      imp(11004, "Whiskey Sour", "whiskey-sour", "Ordinary Drink", true, 655, 4.5, 8), imp(11002, "Long Island Tea", "long-island-tea", "Ordinary Drink", true, 612, 4.1, 12),
      imp(11014, "Alexander", "alexander", "Ordinary Drink", true, 240, null, 0), imp(11060, "Balmoral", "balmoral", "Ordinary Drink", true, 118, 5.0, 2),
      imp(11034, "Angel Face", "angel-face", "Ordinary Drink", false, 29, null, 0), imp(11052, "Archbishop", "archbishop", "Ordinary Drink", false, 33, 3.5, 3),
      imp(11055, "Artillery", "artillery", "Ordinary Drink", false, 41, null, 0), imp(11046, "Applecar", "applecar", "Ordinary Drink", false, 36, null, 0),
      imp(11023, "Almeria", "almeria", "Ordinary Drink", false, 22, null, 0), imp(11021, "Allegheny", "allegheny", "Ordinary Drink", false, 18, null, 0),
    ],
    reviews: [
      { id: 1, cocktail: ref(11007, "Margarita", "margarita"), author: "marek_88", rating: 1, text: "Najlepsza wódka z dostawą pod drzwi na tanie-trunki.example, kod ZNIZKA10 daje 10 procent.", createdAt: ago(0, 3),
        reports: [{ by: "tomek_barman", reason: "To reklama, nie opinia." }, { by: "ola.shaker", reason: "Spam." }, { by: "kasia_mixuje", reason: "" }, { by: "kuba_p", reason: "Link do sklepu." }] },
      { id: 2, cocktail: ref(11003, "Negroni", "negroni"), author: "kuba_p", rating: 2, text: "Autor tego przepisu to oszust i złodziej, nie wchodźcie na jego profil.", createdAt: ago(1, 5),
        reports: [{ by: "tomek_barman", reason: "Obraza autora." }, { by: "kasia_mixuje", reason: "Atak na człowieka, nie na przepis." }] },
      { id: 3, cocktail: ref(11060, "Balmoral", "balmoral"), author: "anon_barman", rating: 1, text: "xxx", createdAt: ago(3), reports: [{ by: "ola.shaker", reason: "Bez treści." }] },
      { id: 4, cocktail: ref(11007, "Margarita", "margarita"), author: "tomek_barman", rating: 5, text: "Klasyka. Sól na brzegu robi robotę.", createdAt: ago(8), reports: [] },
      { id: 5, cocktail: ref(11008, "Manhattan", "manhattan"), author: "ola.shaker", rating: 5, text: "Najlepiej z dobrym bourbonem.", createdAt: ago(12), reports: [] },
      { id: 6, cocktail: ref(11005, "Dry Martini", "dry-martini"), author: "kuba_p", rating: 3, text: "Za mocny jak dla mnie.", createdAt: ago(16), reports: [] },
    ],
    users: [
      { id: 1, username: DEMO_USER, role: "user", joined: ago(48) }, { id: 2, username: "tomek_barman", role: "user", joined: ago(58) }, { id: 3, username: "ola.shaker", role: "admin", joined: ago(63) },
      { id: 4, username: "marek_88", role: "user", joined: ago(0, 6) }, { id: 5, username: "kuba_p", role: "user", joined: ago(1, 2) }, { id: 6, username: "anon_barman", role: "user", joined: ago(3, 4) },
      { id: 7, username: "jan_kowalczyk", role: "staff", joined: ago(81) }, { id: 8, username: "solvro_owner", role: "owner", joined: ago(90) },
    ],
  };
}

// ---------- katalog: jeden wiersz na koktajl, bez względu na źródło ----------

type Row = { id: number; name: string; imageUrl: string | null; category: string; authorName: string; verified: boolean; views30d: number; ratingAvg: number | null; ratingCount: number; daily: number[] };

export function catalogOf(demo: DemoData, adm: AdminDemo): Row[] {
  const imports = adm.imports.map((c): Row => ({ ...c, imageUrl: `${IMG}${c.slug}.png`, authorName: "", daily: dailySeries(c.views30d, c.id % 7) }));
  const recipes = demo.recipes.map((r: DemoRecipe): Row => ({ id: r.id, name: r.name, imageUrl: r.imageUrl, category: r.category, authorName: r.authorName ?? "", verified: r.verified ?? false, views30d: r.views30d, ratingAvg: r.ratingAvg ?? null, ratingCount: r.ratingCount ?? 0, daily: r.daily }));
  return [...imports, ...recipes];
}

const toCocktail = (r: Row): Cocktail => ({
  id: r.id, name: r.name, category: r.category, glass: "", instructions: "", imageUrl: r.imageUrl, alcoholic: true, hasImage: r.imageUrl !== null,
  verified: r.verified, status: null, ratingAvg: r.ratingAvg, ratingCount: r.ratingCount, views30d: r.views30d, authorName: r.authorName,
});

/** Strona tabeli koktajli: te same filtry i sortowanie co `GET /cocktails/` (search, verified, has_image, origin, ordering). */
export function cocktailsPage(rows: Row[], q: AdminCocktailQuery, perPage: number): Page<Cocktail> {
  const needle = q.search.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!needle || r.name.toLowerCase().includes(needle) || r.authorName.toLowerCase().includes(needle)) &&
      (q.verified === "" || r.verified === (q.verified === "true")) &&
      (q.hasImage === "" || r.imageUrl === null) &&
      (q.origin === "" || (q.origin === "import" ? r.authorName === "" : r.authorName !== "")),
  );
  const desc = q.ordering.startsWith("-");
  const key = q.ordering.replace(/^-/, "");
  const value = (r: Row) => (key === "popular" ? r.views30d : key === "verified" ? Number(r.verified) : key === "id" ? r.id : 0);
  filtered.sort((a, b) => (key === "name" ? a.name.localeCompare(b.name, "pl") * (desc ? -1 : 1) : (value(a) - value(b)) * (desc ? -1 : 1)) || a.name.localeCompare(b.name, "pl") || a.id - b.id);
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  const page = Math.min(Math.max(1, q.page), lastPage);
  return { data: filtered.slice((page - 1) * perPage, page * perPage).map(toCocktail), meta: { total: filtered.length, lastPage } };
}

// ---------- zmiany (zawsze nowy obiekt) ----------

type Both = { demo: DemoData; adm: AdminDemo };

export function withVerified({ demo, adm }: Both, ids: number[], verified: boolean): Both {
  const hit = new Set(ids);
  return {
    demo: { ...demo, recipes: demo.recipes.map((r) => (hit.has(r.id) ? { ...r, verified } : r)) },
    adm: { ...adm, imports: adm.imports.map((c) => (hit.has(c.id) ? { ...c, verified } : c)) },
  };
}

/** Usunięcie koktajlu usuwa też opinie o nim (CASCADE w bazie). */
export function withoutCocktail({ demo, adm }: Both, id: number): Both {
  return {
    demo: withoutRecipe(demo, id),
    adm: { ...adm, imports: adm.imports.filter((c) => c.id !== id), reviews: adm.reviews.filter((r) => r.cocktail.id !== id) },
  };
}

export const withoutReports = (adm: AdminDemo, reviewId: number): AdminDemo => ({ ...adm, reviews: adm.reviews.map((r) => (r.id === reviewId ? { ...r, reports: [] } : r)) });
export const withoutAdminReview = (adm: AdminDemo, reviewId: number): AdminDemo => ({ ...adm, reviews: adm.reviews.filter((r) => r.id !== reviewId) });

export function reportedOf(adm: AdminDemo): ReportedReview[] {
  return adm.reviews
    .filter((r) => r.reports.length > 0)
    .sort((a, b) => b.reports.length - a.reports.length || b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    .map((r) => ({ id: r.id, rating: r.rating, text: r.text, createdAt: r.createdAt, author: r.author, cocktail: r.cocktail, reportCount: r.reports.length, reports: r.reports.map((x) => ({ reporter: x.by, reason: x.reason })) }));
}

// ---------- konta i role ----------

type Actor = { username: string; role: Role };

/** Lista kont tak, jak zwraca ją backend: z liczbami oraz tym, co WOLNO mi z danym kontem zrobić. Moja rola pochodzi z `actor`. */
export function usersOf(demo: DemoData, adm: AdminDemo, actor: Actor, q: { search: string; role: "" | Role }): AdminUser[] {
  const rows = catalogOf(demo, adm);
  const needle = q.search.trim().toLowerCase();
  return adm.users
    .map((u) => (u.username === actor.username ? { ...u, role: actor.role } : u))
    .filter((u) => (!needle || u.username.toLowerCase().includes(needle)) && (!q.role || u.role === q.role))
    .sort((a, b) => b.joined.localeCompare(a.joined) || b.id - a.id)
    .map((u): AdminUser => {
      const canEdit = u.username !== actor.username && canManage(actor.role, u.role);
      const written = adm.reviews.filter((r) => r.author === u.username);
      return {
        id: u.id, username: u.username, role: u.role, joined: u.joined,
        recipes: rows.filter((r) => r.authorName === u.username).length,
        reviews: written.length + (u.username === DEMO_USER ? demo.reviews.filter((r) => r.author === DEMO_USER).length : 0),
        reports: written.reduce((s, r) => s + r.reports.length, 0),
        canEdit, assignableRoles: canEdit ? grantableRoles(actor.role) : [],
      };
    });
}

export class Forbidden extends Error {}

/** Zmiana roli z tymi samymi regułami co backend (accounts/policy.py): konto niższe od mojego i rola niższa od mojej. */
export function withRole(adm: AdminDemo, actor: Actor, userId: number, role: Role): AdminDemo {
  const target = adm.users.find((u) => u.id === userId);
  if (!target) throw new Error("Brak takiego konta");
  const effective = target.username === actor.username ? actor.role : target.role;
  if (target.username === actor.username || !canManage(actor.role, effective) || !grantableRoles(actor.role).includes(role)) throw new Forbidden("Brak uprawnień do tej zmiany");
  return { ...adm, users: adm.users.map((u) => (u.id === userId ? { ...u, role } : u)) };
}

// ---------- pulpit ----------

export function adminStatsOf(demo: DemoData, adm: AdminDemo, now: Date): AdminStats {
  const rows = catalogOf(demo, adm);
  const day = (back: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const viewsByDay = Array.from({ length: 7 }, (_, i) => ({ day: day(6 - i), views: rows.reduce((s, r) => s + (r.daily[23 + i] ?? 0), 0) }));
  const top = [...rows].sort((a, b) => b.views30d - a.views30d || a.name.localeCompare(b.name, "pl") || a.id - b.id)[0];
  const userMade = rows.filter((r) => r.authorName !== "");
  return {
    cocktails: rows.length,
    unverified: rows.filter((r) => !r.verified).length,
    pendingRecipes: userMade.filter((r) => !r.verified).length,
    withoutImage: rows.filter((r) => r.imageUrl === null).length,
    users: adm.users.length,
    reportedReviews: adm.reviews.filter((r) => r.reports.length > 0).length,
    views7d: viewsByDay.reduce((s, d) => s + d.views, 0),
    viewsByDay,
    top: top ? { id: top.id, name: top.name, imageUrl: top.imageUrl, views30d: top.views30d } : null,
    newUsers: [...adm.users].sort((a, b) => b.joined.localeCompare(a.joined) || b.id - a.id).slice(0, 4).map((u) => ({ username: u.username, role: u.role, joined: u.joined })),
  };
}
