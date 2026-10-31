/** Numery stron do pokazania w paginacji: zawsze pierwsza, ostatnia i sąsiedzi bieżącej; luka większa niż jedna strona = null (wielokropek). */
export function pageItems(page: number, last: number): (number | null)[] {
  const nums = [...new Set([1, page - 1, page, page + 1, last])].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  return nums.flatMap((n, i) => {
    const gap = i === 0 ? 0 : n - nums[i - 1];
    // luka równa jednej stronie: wielokropek zająłby tyle samo miejsca co ta strona, więc pokazujemy samą stronę
    return gap === 2 ? [n - 1, n] : gap > 2 ? [null, n] : [n];
  });
}
