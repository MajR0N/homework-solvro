import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type IngredientOption, getCategories, getCocktail, getGlasses, HttpError, searchIngredients } from "../api";
import { useSession } from "../auth";
import { demoIngredients, saveDemoRecipe } from "../demo/data";
import { DEMO_CATEGORIES, DEMO_GLASSES, DEMO_INGREDIENTS, demoIngredientId } from "../demo/fixtures";
import { type RecipeForm, toPayload } from "../recipe/form";
import { proxyJson } from "./proxy";

// Dane edytora przepisu. Tak jak w account.ts: w trybie demo listy wyboru i zapis są lokalne, w prawdziwym trybie idą do
// backendu (odczyty wprost, zapisy przez proxy z ciasteczkiem). Edytor nie wie, który tryb jest włączony.
const retry = (count: number, e: unknown) => !(e instanceof HttpError && e.status < 500) && count < 2;
const useDemoFlag = () => useSession().demo;

export function useCategories() {
  const demo = useDemoFlag();
  return useQuery({ queryKey: ["edit", "categories", demo], staleTime: Infinity, retry, queryFn: () => (demo ? Promise.resolve(DEMO_CATEGORIES) : getCategories("own")) });
}

export function useGlasses() {
  const demo = useDemoFlag();
  return useQuery({ queryKey: ["edit", "glasses", demo], staleTime: Infinity, retry, queryFn: () => (demo ? Promise.resolve(DEMO_GLASSES) : getGlasses()) });
}

/** Podpowiedzi składników dla wpisanego fragmentu (min. 1 znak). */
export function useIngredientSearch(text: string) {
  const demo = useDemoFlag();
  const q = text.trim();
  return useQuery({
    queryKey: ["edit", "ingredients", demo, q.toLowerCase()],
    enabled: q.length > 0,
    retry,
    staleTime: 30_000,
    queryFn: async (): Promise<IngredientOption[]> => {
      if (!demo) return searchIngredients(q);
      const needle = q.toLowerCase();
      return [...DEMO_INGREDIENTS, ...demoIngredients.get()]
        .filter((n, i, all) => n.toLowerCase().includes(needle) && all.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)
        .slice(0, 8)
        .map((name) => ({ id: demoIngredientId(name), name, alcoholic: false }));
    },
  });
}

/** Dodaje nowy składnik (każdy zalogowany może) i zwraca go jako opcję do wyboru. */
export function useCreateIngredient() {
  const demo = useDemoFlag();
  return useMutation({
    mutationFn: async (name: string): Promise<IngredientOption> => {
      const clean = name.trim();
      if (demo) {
        if (!DEMO_INGREDIENTS.some((n) => n.toLowerCase() === clean.toLowerCase())) demoIngredients.update((names) => (names.some((n) => n.toLowerCase() === clean.toLowerCase()) ? names : [...names, clean]));
        return { id: demoIngredientId(clean), name: clean, alcoholic: false };
      }
      const created = await proxyJson<{ id: number; name: string; alcoholic: boolean }>("ingredients", { method: "POST", body: { name: clean } });
      if (!created) throw new HttpError(502);
      return { id: created.id, name: created.name, alcoholic: created.alcoholic };
    },
  });
}

/** Istniejący przepis do edycji (zawsze z własnego backendu albo z trybu demo, nigdy z API Solvro). */
export function useRecipeToEdit(id: number | null) {
  const { demo, session } = useSession();
  return useQuery({
    queryKey: ["edit", "recipe", demo, session?.username, id],
    enabled: id != null && !!session,
    retry,
    gcTime: 0, // edytor zawsze startuje ze świeżych danych, żeby nie nadpisać cudzej zmiany starą kopią
    queryFn: () => getCocktail(String(id), "own"),
  });
}

/** Zapis (nowy przepis, gdy `id` = null, inaczej zmiana). Zwraca id zapisanego przepisu. */
export function useSaveRecipe(id: number | null) {
  const client = useQueryClient();
  const demo = useDemoFlag();
  return useMutation({
    mutationFn: async (form: RecipeForm): Promise<number> => {
      if (demo) {
        const rows = form.rows.filter((r) => r.name.trim() || r.measure.trim());
        return saveDemoRecipe(
          {
            name: form.name.trim(), category: form.category, glass: form.glass.trim(), alcoholic: form.alcoholic,
            imageUrl: form.imageUrl.trim(), instructions: form.instructions.trim(),
            ingredients: rows.map((r) => ({ id: r.ingredientId as number, name: r.name.trim(), measure: r.measure.trim() })),
          },
          id,
        );
      }
      const saved = await proxyJson<{ id: number }>(id == null ? "cocktails" : `cocktails/${id}`, { method: id == null ? "POST" : "PUT", body: toPayload(form) });
      if (!saved) throw new HttpError(502);
      return saved.id;
    },
    onSuccess: () => client.invalidateQueries(), // lista, konto i szczegóły widzą nowy stan
  });
}
