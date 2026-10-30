import { type DemoData, seedDemoData, withoutRecipe, withoutReview } from "./fixtures";
import { browserStorage, createStore } from "./store";

// Dane przykładowe trybu demo w localStorage. Pierwszy odczyt tworzy je od zera, a reset przywraca stan początkowy.
const isDemoData = (x: unknown): x is DemoData => Array.isArray((x as DemoData)?.recipes) && Array.isArray((x as DemoData)?.reviews);

export const demoData = createStore<DemoData>(browserStorage, "demo-data", () => seedDemoData(new Date()), isDemoData);

export const deleteDemoRecipe = (id: number) => demoData.update((d) => withoutRecipe(d, id));
export const deleteDemoReview = (id: number) => demoData.update((d) => withoutReview(d, id));
