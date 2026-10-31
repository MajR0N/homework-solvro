import { describe, expect, it } from "vitest";
import { pageItems } from "./pager";

describe("pageItems", () => {
  it("środek długiej listy: pierwsza, sąsiedzi i ostatnia z wielokropkami", () => {
    expect(pageItems(5, 19)).toEqual([1, null, 4, 5, 6, null, 19]);
  });
  it("początek i koniec", () => {
    expect(pageItems(1, 19)).toEqual([1, 2, null, 19]);
    expect(pageItems(19, 19)).toEqual([1, null, 18, 19]);
  });
  it("luka jednej strony jest zastąpiona tą stroną", () => {
    expect(pageItems(4, 19)).toEqual([1, 2, 3, 4, 5, null, 19]);
    expect(pageItems(3, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("mało stron: wszystkie, jedna strona: tylko ona", () => {
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
    expect(pageItems(1, 1)).toEqual([1]);
  });
});
