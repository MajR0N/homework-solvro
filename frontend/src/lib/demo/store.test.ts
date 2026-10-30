import { describe, expect, it, vi } from "vitest";
import { isRole, rank } from "../roles";
import { createStore } from "./store";

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data };
};
type State = { n: number };
const isState = (x: unknown): x is State => typeof (x as State)?.n === "number";
const make = (m = memory()) => ({ m, store: createStore<State>(() => m, "k", () => ({ n: 1 }), isState) });

describe("createStore", () => {
  it("bez zapisu zwraca seed i daje tę samą referencję przy kolejnych odczytach", () => {
    const { store } = make();
    expect(store.get()).toEqual({ n: 1 });
    expect(store.get()).toBe(store.get());
  });
  it("zapisuje i odczytuje wartość, a update nie mutuje starej", () => {
    const { store, m } = make();
    const before = store.get();
    store.update((s) => ({ n: s.n + 1 }));
    expect(store.get()).toEqual({ n: 2 });
    expect(before).toEqual({ n: 1 });
    expect(JSON.parse(m.data.get("k")!)).toEqual({ n: 2 });
  });
  it("uszkodzony albo niepoprawny zapis wraca do seed", () => {
    const { store, m } = make();
    m.data.set("k", "{nie json");
    expect(store.get()).toEqual({ n: 1 });
    m.data.set("k", JSON.stringify({ n: "tekst" }));
    expect(store.get()).toEqual({ n: 1 });
  });
  it("reset przywraca seed i powiadamia", () => {
    const { store } = make();
    store.set({ n: 9 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.reset();
    expect(store.get()).toEqual({ n: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("subskrypcja dostaje powiadomienie po set i można ją anulować", () => {
    const { store } = make();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.set({ n: 5 });
    off();
    store.set({ n: 6 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("dwa magazyny z różnymi kluczami się nie mieszają", () => {
    const m = memory();
    const a = createStore<State>(() => m, "a", () => ({ n: 1 }), isState);
    const b = createStore<State>(() => m, "b", () => ({ n: 1 }), isState);
    a.set({ n: 7 });
    expect(b.get()).toEqual({ n: 1 });
  });
  it("zmiana zapisu z zewnątrz (inna karta) jest widoczna przy następnym odczycie", () => {
    const { store, m } = make();
    store.get();
    m.data.set("k", JSON.stringify({ n: 42 }));
    expect(store.get()).toEqual({ n: 42 });
  });
});

describe("roles", () => {
  it("rangi rosną od user do owner, nieznana rola jest poniżej wszystkich", () => {
    expect(["user", "admin", "staff", "owner"].map(rank)).toEqual([0, 1, 2, 3]);
    expect(rank("hacker")).toBe(-1);
    expect(isRole("staff")).toBe(true);
    expect(isRole("root")).toBe(false);
  });
});
