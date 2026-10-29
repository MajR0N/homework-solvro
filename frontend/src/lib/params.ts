// Buduje adres listy po zmianie parametrów (pusta wartość = usuń parametr). Każda zmiana filtra wraca na stronę 1.
// `base` to bieżące parametry; domyślnie z paska adresu (czyta window.location, a nie hooka, żeby opóźnione wywołanie
// nie użyło nieaktualnych wartości). Zwraca ścieżkę bezwzględną ("/?q=..."), więc działa też ze strony szczegółów.
export function patchParams(patch: Record<string, string>, base: string = window.location.search): string {
  const next = new URLSearchParams(base);
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  if (!("page" in patch)) next.delete("page");
  return next.toString() ? `/?${next}` : "/";
}
