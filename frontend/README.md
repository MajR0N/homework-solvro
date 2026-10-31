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

- **Własny pomysł: ciemne szkło.** Pasek u góry i opisy na kartach to półprzezroczyste, rozmyte panele w granacie Solvro, z białym tekstem i białym logo w obu motywach (w ciemnym motywie szkło jest jaśniejsze, #274276, żeby odcinało się od strony). Pasek jest wspólny dla wszystkich stron i zawiera logo, wyszukiwarkę, przycisk „Ulubione” i wybór źródła danych. Karta to zdjęcie na całą wysokość z wąskim panelem szkła o stałej wysokości (nazwa z ikoną weryfikacji, ocena, kategoria); etykieta popularności leży na zdjęciu. Strona koktajlu ma baner z rozmytym zdjęciem w tle i siatkę składników. Lista ma szklany pasek filtrów (przyciski Kategoria i Filtry otwierają okna, alkohol i sortowanie są w pasku), chipy z włączonymi filtrami i przyciskiem „Wyczyść filtry”, a przy własnym backendzie sekcję „Na topie teraz”. Układy wybrano spośród makiet z folderu `design-proposals/`.
- **Motyw jasny i ciemny** wynika z ustawienia systemu. Kolory są zmiennymi CSS w `src/app/globals.css`, a każda para tekst i tło ma policzony kontrast WCAG: tekst co najmniej 4,5:1, elementy graficzne co najmniej 3:1 (komentarze w pliku podają wartości, także dla najgorszego przypadku szkła).
- **Jeden ciepły akcent**, używany oszczędnie: serduszko ulubionych i etykieta „Na topie”. Nigdy nie jest jedynym nośnikiem informacji (jest też ikona, tekst i `aria-pressed`).
- Dostępność: link „Przejdź do treści”, widoczny fokus klawiatury, etykiety dla czytników ekranu, szanowanie ustawienia ograniczenia animacji.

## Telefon (poniżej 768 px)

Na telefonie każda strona ma własny układ, a nie ściśnięty układ komputerowy. Progi: telefon do 767 px, tablet 768 do 1023 px (układ komputerowy z płynnymi siatkami), komputer od 1024 px. Decyzje M1 do M15 są w `STEPS.md` (sekcje 41 do 47).

- Górny pasek to jeden wąski rząd (logo, lupa rozwijająca wyszukiwanie, zębatka z ustawieniami); dolna nawigacja ma cztery miejsca, chowa się podczas pisania i omija dolny pas bezpieczny telefonu. W panelu administratora te same cztery miejsca to ekrany panelu, a ekrany z własnym paskiem akcji (edytor, zaznaczone koktajle, sprawa w moderacji) zastępują nawigację swoim paskiem.
- Lista: jeden rząd „Filtry, Sortuj, liczba”, filtry w arkuszu od dołu z liczbą wyników na żywo, dwie kolumny kart, „Na topie” jako rząd przewijany palcem. Konto to „centrum” z listą sekcji, panel administratora ma karty kont, listę koktajli z paskiem zaznaczenia i moderację jako kolejkę z osobnym ekranem sprawy.
- Zasady: cele dotyku co najmniej 44 x 44 px, pola tekstowe 16 px (bez powiększania na iOS), tekst co najmniej 12 px, brak przewijania w poziomie, paski przestają się kleić na niskim ekranie. Sprawdzone skryptem mierzącym w Edge (360, 390, 430, 768, 1024 px) i kontrastem tekstu w obu motywach; **nie** sprawdzane na prawdziwym telefonie.

## Własny backend (przełącznik źródła)

Frontend umie czytać dane z API Solvro (domyślnie) albo z własnego backendu z katalogu `backend/`. Przełącznik „Źródło danych” pojawia się tylko wtedy, gdy ustawiona jest zmienna z adresem backendu. Wybór jest zapamiętany w przeglądarce. Na wersji online zmienna jest ustawiona, więc przełącznik jest widoczny.

```bash
# 1. uruchom backend (patrz backend/README.md), domyślnie http://127.0.0.1:8000
# 2. w frontend/.env.local (plik poza gitem):
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000/api/v1
# 3. uruchom frontend (npm run dev) i otwórz http://localhost:3000
```

Dane są kopią danych Solvro (te same id), więc ulubione działają na obu źródłach. Adres frontendu musi być na liście `CORS_ALLOWED_ORIGINS` backendu (domyślnie `localhost:3000` i `127.0.0.1:3000`). Po otwarciu szczegółów koktajlu frontend zgłasza wyświetlenie backendowi, który sam odrzuca powtórzenia.

### Logowanie (ciasteczka httpOnly przez serwer Next.js)

Tokeny JWT **nie trafiają do JavaScriptu w przeglądarce**: są w ciasteczkach `httpOnly` ustawianych przez trasy serwera Next.js, więc złośliwy skrypt (XSS) nie może ich ukraść. Przeglądarka rozmawia tylko z naszym serwerem:

| Trasa | Działanie |
|---|---|
| `POST /api/auth/login` | login i hasło do backendu, tokeny do ciasteczek, w odpowiedzi tylko nazwa i rola |
| `POST /api/auth/logout` | unieważnia refresh w backendzie i czyści ciasteczka |
| `GET /api/auth/session` | kto jest zalogowany (zawsze 200, brak sesji to `{"user": null}`); odświeża tokeny, gdy access wygasł |
| `/api/proxy/<ścieżka>` | wywołania wymagające logowania (zapisy, „moje” dane): serwer dokłada token i przekazuje do backendu; punkty `auth/login`, `refresh`, `logout`, `register` są zablokowane (zwracałyby tokeny) |

Zabezpieczenia: ciasteczka mają `httpOnly`, `SameSite=Lax`, `Secure` na produkcji i ścieżkę `/api`; żądania zmieniające dane muszą mieć nagłówek `Origin` naszej własnej strony (ochrona przed CSRF); ścieżki proxy to tylko litery, cyfry, `-` i `_` (bez `..`, więc proxy nie da się skierować na cudzy serwer). Odświeżanie tokenów robi serwer: jednorazowy refresh jest współdzielony przez równoległe żądania. Backend widzi prawdziwy adres klienta dzięki nagłówkom `X-Client-IP` i `X-Proxy-Secret` (patrz `PROXY_SECRET` w `backend/README.md`), więc limity logowania działają na ludzi, a nie na serwer Next.js.

Zmienne środowiskowe (pliki `.env*` są poza gitem):

| Zmienna | Gdzie | Znaczenie |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | przeglądarka i serwer | adres API, np. `http://127.0.0.1:8000/api/v1` (publiczne odczyty idą stąd wprost z przeglądarki) |
| `BACKEND_URL` | tylko serwer | adres API dla tras `/api/...`; gdy brak, serwer używa `NEXT_PUBLIC_BACKEND_URL` |
| `PROXY_SECRET` | tylko serwer | ten sam sekret co w backendzie (min. 32 znaki). Bez niego proxy nie przekazuje adresu klienta i backend widzi adres serwera Next.js |

Znane ograniczenia: po wylogowaniu token access (ważny 10 minut) działa do wygaśnięcia, bo JWT nie da się odwołać; odświeżanie jest współdzielone tylko w obrębie jednej instancji serwera (na Vercelu dwa równoległe żądania na dwóch instancjach mogą się jeszcze ścigać, wtedy trzeba zalogować się ponownie).

### Tryb demo

Przycisk „Tryb demo” na pasku (i na stronie logowania) włącza przykładowy profil `kasia_mixuje`: aplikacja udaje zalogowaną osobę bez backendu i bez logowania, a nad treścią widać baner z wyborem roli (user, admin, staff, owner). Zmiany zapisują się tylko w `localStorage` tej przeglądarki, więc nic nie trafia do prawdziwej bazy. Wyłączone demo = prawdziwe logowanie i prawdziwy backend. Strony nie wiedzą, w którym trybie są: wybiera to warstwa danych (hooki), a nie komponenty. Magazyn danych demo to `src/lib/demo/store.ts` (z testami), stan trybu to `src/lib/demo/mode.ts`. Na razie tryb demo daje tylko sesję; przykładowe przepisy, opinie i statystyki dochodzą w fazie 1.

### Konto użytkownika (`/account/...`)

Strona konta łączy pięć propozycji z `design-proposals/profile.html`: baner z liczbami (A), sekcje jako zakładki na wąskim ekranie albo menu boczne na szerokim (B), półki z kartami (C), panel autora z wykresem i tabelą (D) oraz układ na telefon z wierszami (E). Każda sekcja ma własny adres:

| Adres | Co pokazuje |
|---|---|
| `/account` | przegląd: liczby, półki (moje przepisy z kafelkiem „Dodaj przepis”, ulubione, ostatnie oceny) i ostatnia aktywność |
| `/account/recipes` | panel autora: wykres wyświetleń z 30 dni, tabela (na telefonie wiersze), usuwanie z potwierdzeniem |
| `/account/favorites` | ulubione (zapisane w tej przeglądarce, więc działają w demo i po zalogowaniu) |
| `/account/reviews` | moje opinie, z usuwaniem |
| `/account/settings` | dane konta, wylogowanie, w demo także przywracanie danych |
| `/recipes/new`, `/recipes/<id>/edit` | edytor przepisu (opis niżej) |

Strony używają tylko hooków z `src/lib/data/account.ts` (`useMyRecipes`, `useMyReviews`, `useMyActivity`, `useMyStats`, `useFavoriteCocktails`, `useDeleteRecipe`, `useDeleteReview`) i nie wiedzą, czy dane są z trybu demo, czy z backendu. Prawdziwy backend: `GET /cocktails/?author=<nazwa>` (publiczny odczyt, wprost) oraz `GET /me/reviews`, `/me/activity`, `/me/stats` i `DELETE` przez proxy z ciasteczkiem. Tryb demo: `src/lib/demo/fixtures.ts` liczy to samo z przykładowych danych w `localStorage` (testy: `fixtures.test.ts`). Przepisy demo mają id od 900000, a strona szczegółów (`/cocktails/900001`) czyta je z `localStorage`.

**Dolna nawigacja (propozycja E).** Poniżej 768 px pojawia się szklany pasek z czterema pozycjami (Główna, Ulubione, Dodaj, Profil, ikony Phosphor), a z górnego paska znikają ulubione i konto. Od 768 px jest tylko górny pasek.

**Filtry na liście (własny backend).** Panel „Filtry” ma teraz także: autora (wszyscy, import Solvro, użytkownicy, moje), etykietę popularności i rodzaj szklanki. „Moje” jest tylko dla zalogowanego z prawdziwego konta (nie w trybie demo). Wartości są w adresie: `?by=import|users|mine&status=trending|popular|most_popular&glass=...`.

### Edytor przepisu (`/recipes/new`, `/recipes/<id>/edit`)

Układ jak strona koktajlu (propozycja C z `design-proposals/recipe.html`): szklany baner (zdjęcie, nazwa, kategoria, szklanka, adres zdjęcia, alkohol), panele „Składniki” i „Przygotowanie” oraz przyklejony szklany pasek zapisu. Ten sam ekran dodaje i edytuje; na telefonie edytor ma trzy zwijane sekcje (Podstawy, Składniki, Przygotowanie) i własny dolny pasek zamiast nawigacji.

- **Składniki to prawdziwe składniki z bazy.** Backend łączy je po id, więc samo wpisanie nazwy nie wystarcza: pole działa jak lista podpowiedzi (wzorzec ARIA combobox: strzałki, Enter, Esc), a gdy nic nie pasuje, pojawia się „Dodaj „…” jako nowy składnik” (`POST /ingredients/`, może każdy zalogowany). Każdy składnik tylko raz, miara to dowolny tekst.
- **Walidacja** w `src/lib/recipe/form.ts` (czyste funkcje z testami, te same limity co backend): nazwa i kategoria wymagane, zdjęcie tylko `https`, najwyżej 50 składników. Po nieudanej próbie zapisu fokus trafia na pierwsze błędne pole, a błędy z backendu (400) trafiają do właściwych pól (`serverErrors`).
- **Szkic** zapisuje się sam w `localStorage` po 400 ms przerwy w pisaniu (klucz zawiera konto albo „demo” i id przepisu) i wraca przy następnym otwarciu z przyciskiem „Odrzuć szkic”. Po zapisie jest kasowany, po nieudanym zapisie (np. wygasła sesja) zostaje.
- **Ostrzeżenie przed wyjściem.** Zamknięcie lub odświeżenie karty pokazuje okno przeglądarki, a kliknięcie w link naszej aplikacji okno „Wyjść bez zapisywania?” (szkic zostaje). „Anuluj” pyta o odrzucenie i kasuje szkic. **Czego to nie łapie:** przycisku „wstecz” przeglądarki i przejść z kodu; wtedy chroni szkic.
- **Uprawnienia.** Edytować może autor oraz administrator wzwyż (backend sprawdza to jeszcze raz, 403). Dane z importu Solvro nie mają autora, więc zwykły użytkownik zobaczy komunikat zamiast formularza. Przycisk „Edytuj” jest w panelu autora i na stronie przepisu.
- **Znaczek „zweryfikowany”** nie jest w formularzu: backend nie pozwala go ustawić przez API (nadaje go administrator, faza 3).
- **Zdjęcie** to adres `https`; podgląd i obraz w aplikacji działają tylko dla hosta `cocktails.solvro.pl` (ograniczenie `next/image`, patrz „Znane ograniczenia”), inne adresy zapisują się, ale pokazują puste miejsce.
- W trybie demo wszystko działa na `localStorage` (listy kategorii, szklanek i składników są stałe, nowe składniki zapamiętuje przeglądarka); w prawdziwym trybie zapis idzie przez proxy z ciasteczkiem, a po zapisie źródło danych przełącza się na własny backend.

### Panel administratora (`/admin/...`)

Dla ról admin, staff i owner (link „Panel” na górnym pasku i „Panel administratora” na koncie). Układ z górnym paskiem nawigacji (wariant z `design-proposals/admin-topbar.html`), cztery ekrany łączące pięć propozycji z `design-proposals/admin.html`:

| Adres | Co robi |
|---|---|
| `/admin` | pulpit: liczby, „Do zrobienia” (zgłoszone opinie, przepisy bez znaczka, koktajle bez zdjęcia), wyświetlenia z 7 dni, najpopularniejszy koktajl, nowi użytkownicy |
| `/admin/cocktails` | tabela albo galeria; szukanie po nazwie i autorze, filtry (bez znaczka, zweryfikowane, bez zdjęcia, import lub użytkownicy), sortowanie, strony, zaznaczanie i **masowe nadawanie i zdejmowanie znaczka**, usuwanie z potwierdzeniem, „Edytuj” (ten sam edytor co dla autorów) |
| `/admin/moderation` | kolejka: zgłoszone opinie (usuń opinię albo odrzuć zgłoszenia) i nowe przepisy użytkowników (zweryfikuj, edytuj, usuń); skróty **J** i **K** przechodzą po kolejce |
| `/admin/users` | konta z liczbami i zgłoszeniami, **zmiana roli listą, która pokazuje tylko role możliwe do nadania**; konto własne, równe i wyższe są zablokowane z napisem dlaczego; obok tabela „Kto co może” z podświetloną moją rolą |

W edytorze przepisu administrator wzwyż ma dodatkowo przełącznik „Znaczek zweryfikowany” (idzie osobnym wywołaniem `POST /admin/cocktails/verify/`, bo zwykły zapis koktajlu go nie przyjmuje) i widzi autora cudzego przepisu.

**Reguły ról** (`src/lib/roles.ts`: `canManage`, `grantableRoles`) są lustrem `backend/accounts/policy.py`: interfejs nie pokazuje tego, czego i tak nie wolno, ale rozstrzyga backend (403). Test `src/lib/admin/demo.test.ts` sprawdza wszystkie 3 × 4 × 4 kombinacje aktor, konto i nowa rola tak samo jak testy backendu.

**Tryb demo.** Panel działa w całości bez backendu: `src/lib/admin/demo.ts` to czyste funkcje, które liczą to samo, co API (katalog z importu i przepisów użytkowników, kolejka zgłoszeń, konta, role, pulpit), a dane leżą w `localStorage` (`demo-admin` i `demo-data`; „Przywróć dane” w banerze je resetuje). Rolę demo ustawia się w banerze (user, admin, staff, owner), więc można obejrzeć uprawnienia każdej roli. W demo „Edytuj” działa tylko dla przepisów demo (import Solvro da się edytować tylko z prawdziwym backendem).

## Struktura
- `src/app/globals.css` — kolory marki i wyprowadzone z nich zmienne (jasny i ciemny motyw), szkło, fokus
- `src/lib/params.ts` — budowanie adresu listy po zmianie filtra (wspólne dla strony i paska)
- `src/lib/api.ts` — typy i funkcje pobierające dane; **adapter**: odpowiedzi własnego backendu są tłumaczone na te same typy, których używa interfejs (nazwy parametrów, strony, pola)
- `src/lib/source.ts` — wybór źródła danych (`localStorage` + `useSyncExternalStore`, tak jak ulubione)
- `src/lib/auth.ts` — sesja: pyta serwer, kto jest zalogowany (tokenów w przeglądarce nie ma)
- `src/lib/server/` — kod tylko dla serwera: rozmowa z backendem, odświeżanie tokenów, czyste funkcje proxy (`proxy-utils.ts` ma testy: `npm test`)
- `src/app/api/` — trasy `auth/login`, `auth/logout`, `auth/session` i ogólne `proxy/[...path]`
- `src/lib/demo/` — tryb demo: `mode.ts` (włączenie i rola), `store.ts` (magazyn w `localStorage` z wartością początkową i resetem)
- `src/lib/data/` — dane konta: `account.ts` (hooki), `mappers.ts` (backend na typy interfejsu), `proxy.ts` (wywołania przez proxy), `types.ts`
- `src/lib/admin/` — panel administratora: `demo.ts` (dane i reguły trybu demo, z testami), `hooks.ts` (hooki: demo albo API), `mappers.ts`, `store.ts`, `types.ts`; `src/app/admin/` — ekrany
- `src/lib/recipe/` — model formularza przepisu (`form.ts`), szkice (`draft.ts`), ostrzeżenie przed wyjściem (`useLeaveGuard.ts`); `src/components/recipe/` — edytor i pole składnika
- `src/lib/format.ts` — odmiana po polsku, liczby, daty, inicjały
- `src/app/account/`, `src/components/account/`, `src/components/BottomDock.tsx` — strona konta i dolna nawigacja
- `src/lib/roles.ts` — role i ich kolejność
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
