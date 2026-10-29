# Koktajle — frontend

Przeglądarka koktajli oparta o [Cocktails API Solvro](https://cocktails.solvro.pl).
Next.js (App Router) · TypeScript · Tailwind CSS · TanStack Query.

**Wersja online:** <https://homework-solvro.vercel.app/> (dane z publicznego API Solvro). Własny backend z katalogu `backend/` działa tylko lokalnie, więc na wersji online przełącznik źródła jest ukryty.

## Funkcje
- lista koktajli z paginacją
- wyszukiwanie po nazwie (z opóźnieniem 300 ms), filtr kategorii i alkoholu, sortowanie — po stronie API; filtry są w URL-u (odświeżenie, link i „wstecz” je zachowują)
- ulubione zapisywane w `localStorage` + widok „Tylko ulubione”
- szczegóły koktajlu ze składnikami i ilościami
- przełącznik źródła danych: API Solvro albo własny backend w Django (po włączeniu, patrz niżej)
- responsywny układ, obsługa klawiatury i czytników ekranu, stany ładowania / błędu / braku wyników

## Uruchomienie
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build produkcyjny
```

## Własny backend (przełącznik źródła)

Frontend umie czytać dane z API Solvro (domyślnie) albo z własnego backendu z katalogu `backend/`. Przełącznik „Źródło danych” pojawia się tylko wtedy, gdy ustawiona jest zmienna z adresem backendu. Wybór jest zapamiętany w przeglądarce.

```bash
# 1. uruchom backend (patrz backend/README.md), domyślnie http://127.0.0.1:8000
# 2. w frontend/.env.local (plik poza gitem):
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000/api/v1
# 3. uruchom frontend (npm run dev) i otwórz http://localhost:3000
```

Dane są kopią danych Solvro (te same id), więc ulubione działają na obu źródłach. Adres frontendu musi być na liście `CORS_ALLOWED_ORIGINS` backendu (domyślnie `localhost:3000` i `127.0.0.1:3000`). Po otwarciu szczegółów koktajlu frontend zgłasza wyświetlenie backendowi, który sam odrzuca powtórzenia.

## Struktura
- `src/lib/api.ts` — typy i funkcje pobierające dane; **adapter**: odpowiedzi własnego backendu są tłumaczone na te same typy, których używa interfejs (nazwy parametrów, strony, pola)
- `src/lib/source.ts` — wybór źródła danych (`localStorage` + `useSyncExternalStore`, tak jak ulubione)
- `src/lib/favorites.ts` — ulubione (`localStorage` + `useSyncExternalStore`)
- `src/app/page.tsx` — lista, wyszukiwanie, filtry, paginacja
- `src/app/cocktails/[id]/page.tsx` — szczegóły koktajlu
- `src/lib/pl.ts` — polskie nazwy kategorii i szklanek
- `src/components/` — `CocktailCard`, `FavoriteButton`, `SourceSwitch`

## Znane ograniczenia
- **Własny backend nie jest wdrożony**, więc na wersji online (Vercel) działa tylko Solvro. Gdy backend jest wyłączony, a wybrano go jako źródło, strona pokazuje zwykły komunikat o błędzie pobierania.
- Zdjęcia z własnego backendu pokazujemy tylko z adresów `https://cocktails.solvro.pl` (inne hosty `next/image` odrzuca, a pozwolenie na wszystkie otworzyłoby optymalizator dla obcych). Własne koktajle z innym adresem zdjęcia dostają puste miejsce.
- Własny backend ma 9 kategorii (tylko te w użyciu), a Solvro 10 (jedna pusta). Kolejność nazw z interpunkcją (spacja i myślnik) może się minimalnie różnić, bo bazy mają inne reguły sortowania. W obrębie jednej kategorii Solvro nie gwarantuje żadnej kolejności, nasz backend sortuje alfabetycznie.
- Nowe pola backendu (oceny, znaczek „zweryfikowany”, etykiety popularności) i logowanie nie mają jeszcze miejsca w interfejsie.
- Treści przepisów (nazwy, instrukcje, opisy składników) pochodzą z API w języku angielskim i nie są tłumaczone; przetłumaczone są tylko kategorie i rodzaje szklanek.
- Dla nieistniejącego id strona szczegółów zwraca HTTP 200 z komunikatem (renderowanie po stronie klienta).
- Widok „Tylko ulubione” wysyła wszystkie ulubione id w URL-u zapytania do API — przy setkach ulubionych URL będzie długi.
