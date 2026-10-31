import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HttpError, listAdminCocktails, PER_PAGE } from "../api";
import { useSession } from "../auth";
import { proxyJson } from "../data/proxy";
import { DEMO_USER } from "../demo/fixtures";
import { type Role, isAdminLevel, isRole } from "../roles";
import { adminStatsOf, catalogOf, cocktailsPage, reportedOf, usersOf, withRole, withVerified, withoutAdminReview, withoutCocktail, withoutReports } from "./demo";
import { type OwnAdminStats, type OwnAdminUser, type OwnReported, reportedFromAdmin, statsFromAdmin, userFromAdmin } from "./mappers";
import { demoAdmin, demoWorld, setDemoWorld } from "./store";
import type { AdminCocktailQuery, AdminStats, AdminUser, ReportedReview } from "./types";

// Warstwa danych panelu administratora, tak jak data/account.ts: strony wołają tylko te hooki. W trybie demo liczy je
// admin/demo.ts z localStorage, w prawdziwym trybie idą do /api/v1/admin/... przez proxy (odczyty koktajli wprost).
// Klucze zawierają tryb, konto i rolę, więc zmiana roli demo od razu odświeża widoki (inne uprawnienia, inne akcje).
const retry = (count: number, e: unknown) => !(e instanceof HttpError && e.status < 500) && count < 2;

export function useAdminAccess() {
  const { session, demo, loading } = useSession();
  const role: Role = session && isRole(session.role) ? session.role : "user";
  return { loading, demo, username: session?.username ?? null, role, allowed: !!session && isAdminLevel(role) };
}

function useAdminKey() {
  const a = useAdminAccess();
  return { ...a, base: ["admin", a.demo, a.username, a.role] as const, enabled: a.allowed };
}

type Paged<T> = { count: number; results: T[] };

export function useAdminStats() {
  const k = useAdminKey();
  return useQuery({
    queryKey: [...k.base, "stats"], enabled: k.enabled, retry,
    queryFn: async (): Promise<AdminStats> => {
      if (k.demo) {
        const { demo, adm } = demoWorld();
        return adminStatsOf(demo, adm, new Date());
      }
      const r = await proxyJson<OwnAdminStats>("admin/stats");
      if (!r) throw new HttpError(502);
      return statsFromAdmin(r);
    },
  });
}

/** Strona tabeli albo galerii koktajli. Poprzednia strona zostaje widoczna, gdy ładuje się następna. */
export function useAdminCocktails(q: AdminCocktailQuery) {
  const k = useAdminKey();
  return useQuery({
    queryKey: [...k.base, "cocktails", q], enabled: k.enabled, retry, placeholderData: keepPreviousData,
    queryFn: () => {
      if (!k.demo) return listAdminCocktails(q);
      const { demo, adm } = demoWorld();
      return Promise.resolve(cocktailsPage(catalogOf(demo, adm), q, PER_PAGE));
    },
  });
}

/** Przepisy użytkowników bez znaczka (połowa kolejki moderacji), najnowsze pierwsze. */
export const PENDING_QUERY: AdminCocktailQuery = { search: "", verified: "false", hasImage: "", origin: "users", ordering: "-id", page: 1 };

export function useReportedReviews() {
  const k = useAdminKey();
  return useQuery({
    queryKey: [...k.base, "reports"], enabled: k.enabled, retry,
    queryFn: async (): Promise<ReportedReview[]> => {
      if (k.demo) return reportedOf(demoAdmin.get());
      const r = await proxyJson<Paged<OwnReported>>("admin/reports", { query: { page_size: "50" } });
      return (r?.results ?? []).map(reportedFromAdmin);
    },
  });
}

export function useAdminUsers(search: string, role: "" | Role) {
  const k = useAdminKey();
  return useQuery({
    queryKey: [...k.base, "users", search, role], enabled: k.enabled, retry, placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminUser[]> => {
      if (k.demo) return usersOf(demoWorld().demo, demoAdmin.get(), { username: DEMO_USER, role: k.role }, { search, role });
      const query: Record<string, string> = { page_size: "100" };
      if (search.trim()) query.search = search.trim();
      if (role) query.role = role;
      const r = await proxyJson<Paged<OwnAdminUser>>("admin/users", { query });
      return (r?.results ?? []).map(userFromAdmin);
    },
  });
}

// ---------- zmiany: po każdej odświeżamy wszystko (lista, kolejka, pulpit i konto widzą ten sam stan) ----------

function useAdminMutation<V>(demoFn: (v: V, role: Role) => void, realFn: (v: V) => Promise<unknown>) {
  const client = useQueryClient();
  const { demo, role } = useAdminAccess();
  return useMutation({
    mutationFn: async (v: V) => (demo ? demoFn(v, role) : void (await realFn(v))),
    onSuccess: () => client.invalidateQueries(),
  });
}

export const useVerify = () =>
  useAdminMutation<{ ids: number[]; verified: boolean }>(
    ({ ids, verified }) => setDemoWorld(withVerified(demoWorld(), ids, verified)),
    (v) => proxyJson("admin/cocktails/verify", { method: "POST", body: v }),
  );

export const useDeleteCocktail = () =>
  useAdminMutation<number>(
    (id) => setDemoWorld(withoutCocktail(demoWorld(), id)),
    (id) => proxyJson(`cocktails/${id}`, { method: "DELETE" }),
  );

export const useDismissReports = () =>
  useAdminMutation<number>(
    (id) => demoAdmin.update((a) => withoutReports(a, id)),
    (id) => proxyJson(`admin/reports/${id}/dismiss`, { method: "POST" }),
  );

export const useDeleteReportedReview = () =>
  useAdminMutation<number>(
    (id) => demoAdmin.update((a) => withoutAdminReview(a, id)),
    (id) => proxyJson(`reviews/${id}`, { method: "DELETE" }),
  );

export const useChangeRole = () =>
  useAdminMutation<{ id: number; role: Role }>(
    ({ id, role }, actorRole) => demoAdmin.update((a) => withRole(a, { username: DEMO_USER, role: actorRole }, id, role)),
    ({ id, role }) => proxyJson(`admin/users/${id}`, { method: "PATCH", body: { role } }),
  );
