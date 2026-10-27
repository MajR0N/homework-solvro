# Koktajle — frontend

Przeglądarka koktajli oparta o [Cocktails API Solvro](https://cocktails.solvro.pl).
Next.js (App Router) · TypeScript · Tailwind CSS · TanStack Query.

## Funkcje
- lista koktajli z paginacją
- wyszukiwanie po nazwie (z opóźnieniem 300 ms), filtr kategorii i alkoholu, sortowanie — po stronie API
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
- `src/components/` — `CocktailCard`, `FavoriteButton`

## Znane ograniczenia
- Filtry są w stanie komponentu, nie w URL — po powrocie ze szczegółów wracają do domyślnych.
- Dla nieistniejącego id strona szczegółów zwraca HTTP 200 z komunikatem (renderowanie po stronie klienta).
