# Koktajle — frontend

Przeglądarka koktajli oparta o [Cocktails API Solvro](https://cocktails.solvro.pl).
Next.js (App Router) · TypeScript · Tailwind CSS · TanStack Query.

## Funkcje
- lista koktajli z paginacją
- wyszukiwanie po nazwie (z opóźnieniem 300 ms), filtr kategorii i alkoholu, sortowanie — po stronie API; filtry są w URL-u (odświeżenie, link i „wstecz” je zachowują)
- ulubione zapisywane w `localStorage` + widok „Tylko ulubione”
- szczegóły koktajlu ze składnikami i ilościami
- responsywny układ, obsługa klawiatury i czytników ekranu, stany ładowania / błędu / braku wyników

## Uruchomienie
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build produkcyjny
```

## Struktura
- `src/lib/api.ts` — typy i funkcje pobierające dane z API
- `src/lib/favorites.ts` — ulubione (`localStorage` + `useSyncExternalStore`)
- `src/app/page.tsx` — lista, wyszukiwanie, filtry, paginacja
- `src/app/cocktails/[id]/page.tsx` — szczegóły koktajlu
- `src/lib/pl.ts` — polskie nazwy kategorii i szklanek
- `src/components/` — `CocktailCard`, `FavoriteButton`

## Znane ograniczenia
- Treści przepisów (nazwy, instrukcje, opisy składników) pochodzą z API w języku angielskim i nie są tłumaczone; przetłumaczone są tylko kategorie i rodzaje szklanek.
- Dla nieistniejącego id strona szczegółów zwraca HTTP 200 z komunikatem (renderowanie po stronie klienta).
- Widok „Tylko ulubione” wysyła wszystkie ulubione id w URL-u zapytania do API — przy setkach ulubionych URL będzie długi.
