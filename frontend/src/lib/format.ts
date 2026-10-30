// Drobne funkcje do pokazywania liczb, dat i odmiany po polsku.

/** Odmiana: 1 opinia, 2-4 opinie, 5+ opinii (ale 12-14 to "opinii", 22-24 to "opinie"). */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const last = n % 10;
  return last >= 2 && last <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? few : many;
}

// useGrouping "always": domyślnie polski format nie dzieli czterocyfrowych liczb (1284), a chcemy "1 284"
const numberFormat = new Intl.NumberFormat("pl-PL", { useGrouping: "always" });
export const fmt = (n: number) => numberFormat.format(n);

/** Ocena po polsku, z przecinkiem: 4,6 */
export const decimal = (x: number) => x.toFixed(1).replace(".", ",");

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });

/** Dwie litery do awatara z nazwy użytkownika: kasia_mixuje -> KM, ola.shaker -> OS, marek_88 -> M8 */
export const initials = (name: string) =>
  name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
