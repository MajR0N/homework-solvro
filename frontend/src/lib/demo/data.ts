import { type DemoData, type RecipeInput, seedDemoData, withRecipeSaved, withoutRecipe, withoutReview } from "./fixtures";
import { browserStorage, createStore } from "./store";

// Dane przykładowe trybu demo w localStorage. Pierwszy odczyt tworzy je od zera, a reset przywraca stan początkowy.
const isDemoData = (x: unknown): x is DemoData => Array.isArray((x as DemoData)?.recipes) && Array.isArray((x as DemoData)?.reviews);

export const demoData = createStore<DemoData>(browserStorage, "demo-data", () => seedDemoData(new Date()), isDemoData);

export const deleteDemoRecipe = (id: number) => demoData.update((d) => withoutRecipe(d, id));
export const deleteDemoReview = (id: number) => demoData.update((d) => withoutReview(d, id));

// Składniki dodane w edytorze w trybie demo (same nazwy; id wylicza demoIngredientId)
const isNames = (x: unknown): x is string[] => Array.isArray(x) && x.every((n) => typeof n === "string");
export const demoIngredients = createStore<string[]>(browserStorage, "demo-ingredients", () => [], isNames);

export function saveDemoRecipe(input: RecipeInput, id: number | null): number {
  const { data, id: savedId } = withRecipeSaved(demoData.get(), input, id, new Date());
  demoData.set(data);
  return savedId;
}
