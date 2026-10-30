# Koktajle — frontend

Przeglądarka koktajli oparta o [Cocktails API Solvro](https://cocktails.solvro.pl).
Next.js (App Router) · TypeScript · Tailwind CSS · TanStack Query.

**Wersja online:** <https://homework-solvro.vercel.app/>. Domyślnie dane pochodzą z publicznego API Solvro, a przełącznik „Źródło danych” pozwala wybrać własny backend z katalogu `backend/` (wdrożony: <https://homework-solvro-backend-fsuaihda.vercel.app/api/docs/>).

## Funkcje
- lista koktajli z paginacją
- wyszukiwanie po nazwie (z opóźnieniem 300 ms), filtr kategorii i alkoholu, sortowanie — po stronie API; filtry są w URL-u (odświeżenie, link i „wstecz” je zachowują)
- ulubione zapisywane w `localStorage` + widok „Tylko ulubione”
- szczegóły koktajlu ze składnikami i ilościami
- przełącznik źródła danych: API Solvro albo własny backend w Django (po włączeniu, patrz niżej)
- przy źródle „Własny backend”: znaczki na kartach i w szczegółach (zweryfikowany, etykieta popularności „Na topie” / „Popularny” / „Najpopularniejszy”, średnia ocena), dodatkowe sortowania (najpopularniejsze, na topie, najlepiej oceniane), filtry „Tylko zweryfikowane” i „Składnik” oraz lista opinii na stronie szczegółów (konto usunięte pokazuje się jako „usunięty użytkownik”)
- responsywny układ, obsługa klawiatury i czytników ekranu, stany ładowania / błędu / braku wyników

## Uruchomienie
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build produkcyjny
```

## Wygląd

Wygląd opiera się na identyfikacji Solvro: kolory z oficjalnej palety (#FFF, #D9E8FF, #80B3FF, #6583C8, #274276, #203560), oficjalne logo KN Solvro **bez zmian** (kopie plików w `public/solvro/`, to samo co w repozytorium Solvro) i krój **Space Grotesk**, który zalecają materiały Solvro (ładowany przez `next/font`, więc z własnej domeny).

- **Własny pomysł: ciemne szkło.** Pasek u góry i opisy na kartach to półprzezroczyste, rozmyte panele w granacie Solvro, z białym tekstem i białym logo w obu motywach (w ciemnym motywie szkło jest jaśniejsze, #274276, żeby odcinało się od strony). Pasek jest wspólny dla wszystkich stron i zawiera logo, wyszukiwarkę, przycisk „Ulubione” i wybór źródła danych. Karta to zdjęcie na całą wysokość z wąskim panelem szkła o stałej wysokości (nazwa z ikoną weryfikacji, ocena, kategoria); etykieta popularności leży na zdjęciu. Strona koktajlu ma baner z rozmytym zdjęciem w tle i siatkę składników. Układy wybrano spośród makiet z folderu `design-proposals/`.
- **Motyw jasny i ciemny** wynika z ustawienia systemu. Kolory są zmiennymi CSS w `src/app/globals.css`, a każda para tekst i tło ma policzony kontrast WCAG: tekst co najmniej 4,5:1, elementy graficzne co najmniej 3:1 (komentarze w pliku podają wartości, także dla najgorszego przypadku szkła).
- **Jeden ciepły akcent**, używany oszczędnie: serduszko ulubionych i etykieta „Na topie”. Nigdy nie jest jedynym nośnikiem informacji (jest też ikona, tekst i `aria-pressed`).
- Dostępność: link „Przejdź do treści”, widoczny fokus klawiatury, etykiety dla czytników ekranu, szanowanie ustawienia ograniczenia animacji.

## Własny backend (przełącznik źródła)

Frontend umie czytać dane z API Solvro (domyślnie) albo z własnego backendu z katalogu `backend/`. Przełącznik „Źródło danych” pojawia się tylko wtedy, gdy ustawiona jest zmienna z adresem backendu. Wybór jest zapamiętany w przeglądarce. Na wersji online zmienna jest ustawiona, więc przełącznik jest widoczny.

```bash
# 1. uruchom backend (patrz backend/README.md), domyślnie http://127.0.0.1:8000
# 2. w frontend/.env.local (plik poza gitem):
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000/api/v1
# 3. uruchom frontend (npm run dev) i otwórz http://localhost:3000
```

Dane są kopią danych Solvro (te same id), więc ulubione działają na obu źródłach. Adres frontendu musi być na liście `CORS_ALLOWED_ORIGINS` backendu (domyślnie `localhost:3000` i `127.0.0.1:3000`). Po otwarciu szczegółów koktajlu frontend zgłasza wyświetlenie backendowi, który sam odrzuca powtórzenia.

## Struktura
- `src/app/globals.css` — kolory marki i wyprowadzone z nich zmienne (jasny i ciemny motyw), szkło, fokus
- `src/lib/params.ts` — budowanie adresu listy po zmianie filtra (wspólne dla strony i paska)
- `src/lib/api.ts` — typy i funkcje pobierające dane; **adapter**: odpowiedzi własnego backendu są tłumaczone na te same typy, których używa interfejs (nazwy parametrów, strony, pola)
- `src/lib/source.ts` — wybór źródła danych (`localStorage` + `useSyncExternalStore`, tak jak ulubione)
- `src/lib/favorites.ts` — ulubione (`localStorage` + `useSyncExternalStore`)
- `src/app/page.tsx` — lista, wyszukiwanie, filtry, paginacja
- `src/app/cocktails/[id]/page.tsx` — szczegóły koktajlu
- `src/lib/pl.ts` — polskie nazwy kategorii i szklanek
- `src/components/` — `CocktailCard`, `FavoriteButton`, `SourceSwitch`, `Badges` (znaczki i gwiazdki), `TopBar` (szklany pasek)
- `public/solvro/` — oficjalne logo Solvro bez zmian

## Znane ograniczenia
- **Własny backend działa na darmowych planach** (Vercel i Neon), więc pierwsze zapytanie po dłuższej przerwie może trwać dłużej. Gdy backend jest niedostępny, a wybrano go jako źródło, strona pokazuje zwykły komunikat o błędzie pobierania.
- Zdjęcia z własnego backendu pokazujemy tylko z adresów `https://cocktails.solvro.pl` (inne hosty `next/image` odrzuca, a pozwolenie na wszystkie otworzyłoby optymalizator dla obcych). Własne koktajle z innym adresem zdjęcia dostają puste miejsce.
- Własny backend ma 9 kategorii (tylko te w użyciu), a Solvro 10 (jedna pusta). Kolejność nazw z interpunkcją (spacja i myślnik) może się minimalnie różnić, bo bazy mają inne reguły sortowania. W obrębie jednej kategorii Solvro nie gwarantuje żadnej kolejności, nasz backend sortuje alfabetycznie.
- Logowanie oraz dodawanie opinii i koktajli nie mają jeszcze formularzy w interfejsie (backend to obsługuje: Swagger i panel CMS). Opinie na razie można czytać, nie pisać.
- Dopóki nikt nie doda opinii ani nie otworzy koktajli, oceny i etykiety popularności są puste, więc znaczki widać tylko przy „zweryfikowany”.
- Nie ma automatycznych testów frontendu. Adapter był sprawdzony skryptem na prawdziwych API. Wygląd był oglądany na zrzutach ekranu z Edge (motyw jasny i ciemny, szerokość 1280 i 390 px), ale obsługa samą klawiaturą i czytnik ekranu nie były sprawdzane.
- Nie użyto biblioteki komponentów (shadcn/ui, decyzja D16 i F4): przy krótkim czasie wystarczył Tailwind z własnymi zmiennymi, bez nowych zależności.
- Treści przepisów (nazwy, instrukcje, opisy składników) pochodzą z API w języku angielskim i nie są tłumaczone; przetłumaczone są tylko kategorie i rodzaje szklanek.
- Dla nieistniejącego id strona szczegółów zwraca HTTP 200 z komunikatem (renderowanie po stronie klienta).
- Widok „Tylko ulubione” wysyła wszystkie ulubione id w URL-u zapytania do API — przy setkach ulubionych URL będzie długi.
