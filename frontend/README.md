# Koktajle — frontend

Przeglądarka koktajli oparta o [Cocktails API Solvro](https://cocktails.solvro.pl).
Next.js (App Router) · TypeScript · Tailwind CSS · TanStack Query.

**Wersja online:** <https://homework-solvro.vercel.app/>. Domyślnie dane pochodzą z publicznego API Solvro, a przełącznik „Źródło danych” pozwala wybrać własny backend z katalogu `backend/` (wdrożony: <https://homework-solvro-backend-fsuaihda.vercel.app/api/docs/>).

## Funkcje
- strona główna z dwoma widokami: „Odkrywaj” (rzędy tematyczne) i „Wszystkie” (siatka z numerowaną paginacją, 20 koktajli na stronę); opis niżej
- wyszukiwanie po nazwie (z opóźnieniem 300 ms), filtr kategorii i alkoholu, sortowanie — po stronie API; filtry są w URL-u (odświeżenie, link i „wstecz” je zachowują)
- ulubione zapisywane w `localStorage` + widok „Tylko ulubione”
- szczegóły koktajlu ze składnikami i ilościami
- przełącznik źródła danych: API Solvro albo własny backend w Django (po włączeniu, patrz niżej)
- przy źródle „Własny backend”: znaczki na kartach i w szczegółach (zweryfikowany, etykieta popularności „Na topie” / „Popularny” / „Najpopularniejszy”, średnia ocena), dodatkowe sortowania (najpopularniejsze, na topie, najlepiej oceniane), filtry „Tylko zweryfikowane” i „Składnik” oraz lista opinii na stronie szczegółów (konto usunięte pokazuje się jako „usunięty użytkownik”)
- konta (logowanie, ciasteczka `httpOnly`), strona konta, edytor przepisów, panel administratora i tryb demo (opisy niżej)
- osobny układ na telefon, układ szeroki do 1600 px, obsługa klawiatury i czytników ekranu, stany ładowania / błędu / braku wyników

## Uruchomienie
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build produkcyjny
npm test        # testy (Vitest)
npm run lint
```

## Strona główna: Odkrywaj i Wszystkie

Przełącznik w nagłówku listy ma dwa widoki (decyzje U1 do U9 w `STEPS.md`, sekcje 48 do 52):

- **Odkrywaj** (domyślny, tylko na czystej liście): rząd chipów kategorii, potem rzędy kart przewijane w poziomie (`Rail`: przyciąganie do karty, strzałki od 768 px, pojawiają się tylko gdy jest co przewijać). Przy własnym backendzie pierwszy jest rząd „Na topie teraz” (etykieta popularności z backendu). Dalej idą rzędy tematyczne, które ładują się dopiero, gdy zbliżą się do ekranu (`useInView`); rząd z mniej niż trzema wynikami jest ukryty. Każdy rząd ma link „Zobacz wszystkie (n)” do zwykłej listy z tym samym filtrem.
- **Wszystkie**: płaska siatka (2, 3, 4, 5 i od 1536 px 6 kolumn) z paskiem filtrów i numerowaną paginacją („1 … 4 5 6 … 11”; na telefonie zwarte „Strona 4 z 11” ze strzałkami). Szukanie, filtr, sortowanie, ulubione, strona 2 i dalsze oraz `?view=all` zawsze pokazują siatkę.
- **Tematy** to zwykłe zapytania zapisane w `src/lib/themes.ts` (bez zmian w backendzie): „Kwaśno i rześko” (nazwa zawiera *sour*), „Bąbelki i lekkość” (*fizz*), „Zero procent” (bez alkoholu), „Kawa w kieliszku” (*coffee*), „Rumowe klasyki” (*daiquiri*), „Na imprezę” (*punch*) oraz, tylko przy własnym backendzie, „Z miętą” i „Cytrusowy zastrzyk” (filtr składnika). **Uczciwie:** to rodziny nazw, a nie dane o smaku (API nie ma opisu smaku), więc „Zero procent” obejmuje też np. gorącą czekoladę, a „Kwaśno i rześko” to po prostu nazwy zawierające „sour”.
- **Pasek filtrów** (od 768 px) to Kategoria, Sortuj, „Filtry (n)” i liczba wyników. W oknie „Filtry” jest alkohol (dla obu źródeł) oraz, tylko przy własnym backendzie, składnik, znaczek, autor, etykieta i szklanka. Na telefonie te same filtry są w arkuszu od dołu.
- **Szerokość**: pasek u góry, nagłówek, pasek filtrów, rzędy i siatka mają wspólny kontener 1600 px (`max-w-400`), więc krawędzie się pokrywają; ten sam kontener mają strona koktajlu, konto i panel administratora.
- **Paginacja** to `src/lib/pager.ts` (które numery pokazać, z testami) i `src/components/Pager.tsx`; tego samego używa galeria w panelu administratora. Rozmiar strony (`PER_PAGE = 20`) jest w `src/lib/api.ts` i dotyczy obu źródeł; przy 6 kolumnach ostatni rząd ma 2 karty (20 = 3 × 6 + 2).

## Wygląd

Wygląd opiera się na identyfikacji Solvro: kolory z oficjalnej palety (#FFF, #D9E8FF, #80B3FF, #6583C8, #274276, #203560), oficjalne logo KN Solvro **bez zmian** (kopie plików w `public/solvro/`, to samo co w repozytorium Solvro) i krój **Space Grotesk**, który zalecają materiały Solvro (ładowany przez `next/font`, więc z własnej domeny).

- **Własny pomysł: ciemne szkło.** Pasek u góry i opisy na kartach to półprzezroczyste, rozmyte panele w granacie Solvro, z białym tekstem i białym logo w obu motywach (w ciemnym motywie szkło jest jaśniejsze, #274276, żeby odcinało się od strony). Pasek jest wspólny dla wszystkich stron i zawiera logo, wyszukiwarkę, przycisk „Ulubione”, wybór źródła danych, tryb demo i konto. Karta to zdjęcie na całą wysokość z wąskim panelem szkła o stałej wysokości (nazwa z ikoną weryfikacji, ocena, kategoria); etykieta popularności leży na zdjęciu. Strona koktajlu ma baner z rozmytym zdjęciem w tle i siatkę składników. Lista ma szklany pasek filtrów (Kategoria i Filtry otwierają okna, sortowanie jest w pasku), chipy z włączonymi filtrami i przyciskiem „Wyczyść filtry”, a widok „Odkrywaj” rzędy kart (patrz wyżej). Układy wybrano spośród makiet z folderu `design-proposals/`.
- **Motyw jasny i ciemny** wynika z ustawienia systemu. Kolory są zmiennymi CSS w `src/app/globals.css`, a każda para tekst i tło ma policzony kontrast WCAG: tekst co najmniej 4,5:1, elementy graficzne co najmniej 3:1 (komentarze w pliku podają wartości, także dla najgorszego przypadku szkła).
- **Jeden ciepły akcent**, używany oszczędnie: serduszko ulubionych i etykieta „Na topie”. Nigdy nie jest jedynym nośnikiem informacji (jest też ikona, tekst i `aria-pressed`).
- Dostępność: link „Przejdź do treści”, widoczny fokus klawiatury, etykiety dla czytników ekranu, szanowanie ustawienia ograniczenia animacji.

## Telefon (poniżej 768 px)

Na telefonie każda strona ma własny układ, a nie ściśnięty układ komputerowy. Progi: telefon do 767 px, tablet 768 do 1023 px (układ komputerowy z płynnymi siatkami), komputer od 1024 px. Decyzje M1 do M15 są w `STEPS.md` (sekcje 41 do 47).

- Górny pasek to jeden wąski rząd (logo, lupa rozwijająca wyszukiwanie, zębatka z ustawieniami); dolna nawigacja ma cztery miejsca, chowa się podczas pisania i omija dolny pas bezpieczny telefonu. W panelu administratora te same cztery miejsca to ekrany panelu, a ekrany z własnym paskiem akcji (edytor, zaznaczone koktajle, sprawa w moderacji) zastępują nawigację swoim paskiem.
- Lista: przełącznik Odkrywaj / Wszystkie, jeden rząd „Filtry, Sortuj, liczba”, filtry w arkuszu od dołu z liczbą wyników na żywo, dwie kolumny kart, rzędy („Na topie” i tematy) przewijane palcem, zwarta paginacja. Konto to „centrum” z listą sekcji, panel administratora ma karty kont, listę koktajli z paskiem zaznaczenia i moderację jako kolejkę z osobnym ekranem sprawy.
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

Przycisk „Tryb demo” na pasku (i na stronie logowania) włącza przykładowy profil `kasia_mixuje`: aplikacja udaje zalogowaną osobę bez backendu i bez logowania. Włączone demo to biała pigułka „Tryb demo · rola” na górnym pasku (od 1024 px z rolą, niżej samo „Demo”), która otwiera panel z wyborem roli (user, admin, staff, owner), przyciskiem „Przywróć dane” i „Wyłącz demo”; na telefonie to samo robi wąski pasek pod górnym paskiem. Zmiany zapisują się tylko w `localStorage` tej przeglądarki, więc nic nie trafia do prawdziwej bazy. Wyłączone demo = prawdziwe logowanie i prawdziwy backend. Strony nie wiedzą, w którym trybie są: wybiera to warstwa danych (hooki), a nie komponenty. Magazyn danych demo to `src/lib/demo/store.ts` (z testami), stan trybu to `src/lib/demo/mode.ts`. Tryb demo daje sesję oraz przykładowe przepisy, opinie, statystyki i dane panelu administratora (`src/lib/demo/fixtures.ts`, `src/lib/admin/demo.ts`); lista główna w demo czyta API Solvro.

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

**Tryb demo.** Panel działa w całości bez backendu: `src/lib/admin/demo.ts` to czyste funkcje, które liczą to samo, co API (katalog z importu i przepisów użytkowników, kolejka zgłoszeń, konta, role, pulpit), a dane leżą w `localStorage` (`demo-admin` i `demo-data`; „Przywróć dane” w panelu pigułki demo je resetuje). Rolę demo ustawia się w tym panelu (user, admin, staff, owner), więc można obejrzeć uprawnienia każdej roli. W demo „Edytuj” działa tylko dla przepisów demo (import Solvro da się edytować tylko z prawdziwym backendem).

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
- `src/app/page.tsx` — lista: przełącznik Odkrywaj / Wszystkie, filtry, siatka
- `src/components/` Odkrywaj: `Discover` (chipy kategorii i rzędy), `Rail` (przewijany rząd), `Featured` (Na topie), `ThemeRail` (rząd tematyczny, ładowany leniwie), `Pager`; `src/lib/themes.ts` (tematy), `src/lib/pager.ts` (numery stron), `src/lib/useInView.ts`
- `src/app/cocktails/[id]/page.tsx` — szczegóły koktajlu
- `src/lib/pl.ts` — polskie nazwy kategorii i szklanek
- `src/components/` — `CocktailCard`, `FavoriteButton`, `SourceSwitch`, `Badges` (znaczki i gwiazdki), `TopBar` (szklany pasek)
- `public/solvro/` — oficjalne logo Solvro bez zmian

## Znane ograniczenia
- **Własny backend działa na darmowych planach** (Vercel i Neon), więc pierwsze zapytanie po dłuższej przerwie może trwać dłużej. Gdy backend jest niedostępny, a wybrano go jako źródło, strona pokazuje zwykły komunikat o błędzie pobierania.
- Zdjęcia z własnego backendu pokazujemy tylko z adresów `https://cocktails.solvro.pl` (inne hosty `next/image` odrzuca, a pozwolenie na wszystkie otworzyłoby optymalizator dla obcych). Własne koktajle z innym adresem zdjęcia dostają puste miejsce.
- Własny backend ma 9 kategorii (tylko te w użyciu), a Solvro 10 (jedna pusta). Kolejność nazw z interpunkcją (spacja i myślnik) może się minimalnie różnić, bo bazy mają inne reguły sortowania. W obrębie jednej kategorii Solvro nie gwarantuje żadnej kolejności, nasz backend sortuje alfabetycznie.
- Opinie można w interfejsie tylko czytać i usuwać swoje: formularza dodawania opinii nie ma (backend to obsługuje: Swagger i panel CMS).
- Dopóki nikt nie doda opinii ani nie otworzy koktajli, oceny i etykiety popularności są puste, więc znaczki widać tylko przy „zweryfikowany”.
- Testy automatyczne to Vitest (`npm test`, 138 testów: czyste funkcje, adapter, tryb demo, reguły ról, formularz, tematy, paginacja); **nie ma** testów całej aplikacji w przeglądarce. Wygląd i zachowanie sprawdzano skryptami w bezgłowym Edge (motyw jasny i ciemny, szerokości od 360 do 1920 px), ale obsługa samą klawiaturą, czytnik ekranu, prawdziwy telefon i ograniczenie animacji w przeglądarce nie były sprawdzane.
- Rzędy w „Odkrywaj” z jednym lub dwoma wynikami (np. „Na topie” przy prawie pustej bazie) pokazują się bez strzałek; tematy to rodziny nazw, nie dane o smaku (patrz wyżej).
- Nie użyto biblioteki komponentów (shadcn/ui, decyzja D16 i F4): przy krótkim czasie wystarczył Tailwind z własnymi zmiennymi, bez nowych zależności.
- Treści przepisów (nazwy, instrukcje, opisy składników) pochodzą z API w języku angielskim i nie są tłumaczone; przetłumaczone są tylko kategorie i rodzaje szklanek.
- Dla nieistniejącego id strona szczegółów zwraca HTTP 200 z komunikatem (renderowanie po stronie klienta).
- Widok „Tylko ulubione” wysyła wszystkie ulubione id w URL-u zapytania do API — przy setkach ulubionych URL będzie długi.
