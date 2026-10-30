import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HttpError, listMyRecipes } from "../api";
import { useSession } from "../auth";
import { demoData, deleteDemoRecipe, deleteDemoReview } from "../demo/data";
import { activityOf, myReviewsOf, recipesOf, statsOf } from "../demo/fixtures";
import { activityFromOwn, reviewFromOwn, statsFromOwn } from "./mappers";
import { proxyJson } from "./proxy";
import type { ActivityEvent, MyReview, MyStats } from "./types";

// Warstwa danych strony konta. Strony wołają tylko te hooki i nie wiedzą, czy dane są z trybu demo (localStorage),
// czy z prawdziwego backendu (przez proxy z ciasteczkiem). Klucz zapytania zawiera tryb i użytkownika, więc dane demo
// nigdy nie mieszają się z prawdziwymi, a po wylogowaniu cudze dane nie zostają w pamięci podręcznej.
function useWho() {
  const { session, demo } = useSession();
  return { demo, user: session?.username ?? null };
}

// 4xx = błąd po naszej stronie albo brak uprawnień, ponowienie nic nie da
const retry = (count: number, e: unknown) => !(e instanceof HttpError && e.status < 500) && count < 2;

type Page<T> = { count: number; results: T[] };

export function useMyRecipes() {
  const { demo, user } = useWho();
  return useQuery({
    queryKey: ["my", "recipes", demo, user],
    enabled: !!user,
    retry,
    queryFn: () => (demo ? Promise.resolve(recipesOf(demoData.get())) : listMyRecipes(user!)),
  });
}

export function useMyReviews() {
  const { demo, user } = useWho();
  return useQuery({
    queryKey: ["my", "reviews", demo, user],
    enabled: !!user,
    retry,
    queryFn: async (): Promise<MyReview[]> => {
      if (demo) return myReviewsOf(demoData.get());
      const r = await proxyJson<Page<Parameters<typeof reviewFromOwn>[0]>>("me/reviews", { query: { page_size: "100" } });
      return (r?.results ?? []).map(reviewFromOwn);
    },
  });
}

export function useMyActivity(limit = 6) {
  const { demo, user } = useWho();
  return useQuery({
    queryKey: ["my", "activity", demo, user, limit],
    enabled: !!user,
    retry,
    queryFn: async (): Promise<ActivityEvent[]> => {
      if (demo) return activityOf(demoData.get(), limit);
      const r = await proxyJson<Parameters<typeof activityFromOwn>[0][]>("me/activity", { query: { limit: String(limit) } });
      return (r ?? []).map(activityFromOwn);
    },
  });
}

export function useMyStats() {
  const { demo, user } = useWho();
  return useQuery({
    queryKey: ["my", "stats", demo, user],
    enabled: !!user,
    retry,
    queryFn: async (): Promise<MyStats> => {
      if (demo) return statsOf(demoData.get(), new Date());
      const r = await proxyJson<Parameters<typeof statsFromOwn>[0]>("me/stats");
      if (!r) throw new HttpError(502);
      return statsFromOwn(r);
    },
  });
}

// Po zmianie odświeżamy wszystko ("moje" dane i listę na stronie głównej), bo jeden przepis jest widoczny w wielu miejscach.
export function useDeleteRecipe() {
  const client = useQueryClient();
  const { demo } = useWho();
  return useMutation({
    mutationFn: async (id: number) => {
      if (demo) deleteDemoRecipe(id);
      else await proxyJson(`cocktails/${id}`, { method: "DELETE" });
    },
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useDeleteReview() {
  const client = useQueryClient();
  const { demo } = useWho();
  return useMutation({
    mutationFn: async (id: number) => {
      if (demo) deleteDemoReview(id);
      else await proxyJson(`reviews/${id}`, { method: "DELETE" });
    },
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useResetDemo() {
  const client = useQueryClient();
  return () => {
    demoData.reset();
    client.invalidateQueries();
  };
}
