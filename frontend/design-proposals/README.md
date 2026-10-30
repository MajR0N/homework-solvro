# Propozycje przeprojektowania interfejsu

Ten folder to **makiety, nie kod aplikacji**. Powstał w trakcie pracy nad frontendem, kiedy po obejrzeniu działającej aplikacji zauważyliśmy konkretne problemy z układem i zamiast poprawiać je "na oko", spisaliśmy po trzy pomysły na każdy z nich. Dzięki temu widać, jakie rozwiązania rozważaliśmy i dlaczego wybraliśmy jedno z nich.

## Co otworzyć

Wystarczy otworzyć plik w przeglądarce (dwuklik). Potrzebne jest połączenie z internetem, bo makiety pobierają zdjęcia z API Solvro i krój Space Grotesk z Google Fonts. Kolory przełączają się według ustawienia jasny/ciemny w systemie.

| Plik | Czego dotyczy | Problem, który rozwiązuje |
|---|---|---|
| [`lista.html`](lista.html) | strona z listą koktajli | wąska kolumna (około 1000 px) na szerokim ekranie, filtry w jednym rzędzie z pustym miejscem, pole "Tylko zweryfikowane" w osobnej linii z systemowym, białym checkboxem |
| [`szczegoly.html`](szczegoly.html) | strona jednego koktajlu | puste miejsce pod zdjęciem, fakty w osobnych pudełkach, składniki wciśnięte w wąski pas |
| [`karta.html`](karta.html) | pojedyncza karta na liście | szklany panel zasłania około połowy zdjęcia, a znaczki "Zweryfikowany" i ocena zawijają się do osobnych linii |
| [`filtry.html`](filtry.html) | filtry listy (po wyborze układu C) | filtry ściśnięte w pasku, brak informacji, co jest włączone, brak "Wyczyść filtry" |
| [`profil.html`](profil.html) | strona zalogowanego użytkownika (pięć propozycji) | po zalogowaniu jest tylko przycisk z nazwą konta, nie ma gdzie zobaczyć własnych przepisów, ulubionych i opinii |
| [`przepis.html`](przepis.html) | formularz dodawania przepisu (pięć propozycji) | aplikacja nie pozwala jeszcze dodać własnego koktajlu |
| [`admin.html`](admin.html) | panel administratora we frontendzie (pięć propozycji) | administrator pracuje dziś w panelu Django (`/admin/`), który wygląda inaczej niż aplikacja |
| [`admin-sidebar.html`](admin-sidebar.html) i [`admin-topbar.html`](admin-topbar.html) | działający prototyp panelu administratora: ten sam kod, dwa układy (menu boczne i menu górne) | połączenie pięciu propozycji z `admin.html` w jedną całość |
| [`app.html`](app.html) | działający prototyp strony głównej i konta użytkownika w jednym układzie | połączenie pięciu propozycji z `profil.html`, z dolną nawigacją z propozycji E także na stronie głównej |
| [`proposals.css`](proposals.css) | wspólne style makiet | kopia kolorów i kształtów z `src/app/globals.css` |
| [`proposals.js`](proposals.js) | wspólny skrypt makiet | ikony, przykładowe karty i pasek (używa go `filtry.html`) |

## Trzy pomysły na każdy z nich

**Lista (`lista.html`)**
- **A: panel boczny.** Filtry w stałym panelu po lewej (chipy kategorii, przełącznik alkoholu, przełącznik "zweryfikowane"), siatka dostaje resztę szerokości.
- **B: pasek chipów.** Jeden rząd pod nagłówkiem, rzadziej używane filtry w przycisku "Filtry"; najwięcej koktajli na ekranie.
- **C: wyróżnione i pływający pasek.** Na górze kafelki "Na topie", niżej szklany pasek filtrów w kształcie pigułki, który przykleja się przy przewijaniu.

**Strona koktajlu (`szczegoly.html`)**
- **A: baner.** Duży panel z rozmytym zdjęciem w tle, fakty w jednym rzędzie, niżej składniki jako siatka i przygotowanie obok.
- **B: karta przepisu.** Trzy kolumny: zdjęcie i fakty | opis | składniki jako lista z ilościami po prawej; zdjęcie i składniki są przyklejone.
- **C: galeria składników.** Duże zdjęcie ze szkłem jak na karcie, a składniki jako kafle ze zdjęciami.

**Karta (`karta.html`)**
- **A: wąskie szkło.** Status na zdjęciu, weryfikacja jako ikona przy nazwie, ocena po prawej; panel ma stałą, niską wysokość.
- **B: zdjęcie i opis pod nim.** Zdjęcie bez nakładki, opis na zwykłym tle.
- **C: szkło rozwijane.** W spoczynku tylko nazwa i ocena; po najechaniu lub fokusie klawiaturą rozwija się reszta (na telefonie zawsze rozwinięte).

**Filtry (`filtry.html`)**: wszystkie trzy pokazują, co jest włączone (wartość w przycisku i chipy z krzyżykiem), mają "Wyczyść filtry" i działają od razu.
- **A: przyciski z oknami.** Kategoria otwiera okno z chipami, alkohol jest przełącznikiem w pasku, rzadkie filtry w przycisku "Filtry" z licznikiem.
- **B: kategorie jako osobny rząd chipów.** Pasek ma filtry krótkie i binarne (alkohol, składnik, przełącznik "zweryfikowane", sortowanie).
- **C: szuflada filtrów.** Pasek ma tylko przycisk "Filtry" i sortowanie; wszystkie filtry są razem w panelu ze szkła.

Każda makieta ma przy sobie listę zalet i wad. Karty w `lista.html` używają karty A z `karta.html`, żeby układy listy były pokazane w najlepszej formie.

## Jak dobieraliśmy rozwiązania

- Wszystkie warianty trzymają się identyfikacji Solvro: paleta z oficjalnego pliku, krój Space Grotesk, oficjalne logo bez zmian, ciemne szkło (pasek, panele na zdjęciach).
- **Zasada kształtów:** kontrolki (pola, listy, przyciski, tagi) są pigułkami, kontenery (karty, panele, listy) mają zaokrąglenie `rounded-xl`.
- Dostępność: stan nie zależy od samego koloru (ikona i tekst), ikony niosące znaczenie mają opis dla czytnika ekranu, rozwijanie karty działa też z klawiatury, a przy ograniczeniu animacji nie ma przejść.
- Pole wyboru "Tylko zweryfikowane" w makietach jest przełącznikiem w tej samej linii co reszta filtrów, a nie systemowym checkboxem.

## Czego te makiety nie są

- Nazwy koktajli, zdjęcia, składniki i ilości to **prawdziwe dane z API Solvro**. Etykiety popularności, oceny i opinia są **przykładowe**, bo własny backend nie ma jeszcze danych demonstracyjnych.
- Makiety nie są podłączone do aplikacji i nie były sprawdzane czytnikiem ekranu ani na prawdziwym telefonie (tylko na zrzutach z przeglądarki Edge przy szerokości 1500 px).
- Wdrożone w aplikacji (`src/`) są karta A i strona koktajlu A (opisane w `STEPS.md`, sekcja 28). Układ listy C i filtry czekają na wybór jednego z trzech wariantów filtrów.

## Pięć pomysłów na konto, formularz i panel admina (dodane później)

Te trzy pliki mają po **pięć** propozycji. Potrzebują internetu także do ikon (Phosphor, z `unpkg.com`). Liczby, konta, opinie i zgłoszenia są **przykładowe**; nazwy koktajli, składników i zdjęcia pochodzą z API Solvro (przepisy "kasia_mixuje" mają własne nazwy, ale zdjęcia podobnych drinków z Solvro).

**Strona użytkownika (`profil.html`)**
- **A: wizytówka i zakładki.** Szklany panel z nazwą, rolą i liczbami, pod nim zakładki przepisy, ulubione, opinie, konto.
- **B: menu boczne konta.** Osobny obszar z menu i stroną "Przegląd" (liczby i ostatnia aktywność).
- **C: półki.** Jedna strona z poziomymi półkami; pierwszy kafelek "Moje przepisy" to "Dodaj przepis".
- **D: panel autora.** Tabela własnych przepisów z wyświetleniami, oceną, etykietą i akcjami.
- **E: telefon.** Dolna szklana nawigacja, przepisy jako wiersze, stan pusty dla nowego użytkownika.

**Dodawanie przepisu (`przepis.html`)**
- **A: jeden formularz i podgląd.** Trzy bloki i przyklejony podgląd karty; pokazany błąd powtórzonego składnika.
- **B: kreator w krokach.** Podstawy, składniki, przygotowanie, podgląd.
- **C: edycja na stronie koktajlu.** Układ strony koktajlu z edytowalnymi polami i szklanym paskiem zapisu.
- **D: składniki najpierw.** Wybór składników z kafelków ze zdjęciami, ilości w panelu obok.
- **E: szybkie okno.** Okno z minimum pól i składnikami jako znacznikami; pokazany błąd pustej nazwy.

**Panel administratora (`admin.html`)**: każda propozycja pokazuje inny ekran główny.
- **A: menu boczne i tabela.** Tabela koktajli z filtrami i akcją grupową "oznacz jako zweryfikowane".
- **B: kolejka moderacji.** Lista spraw po lewej, szczegóły i decyzja po prawej (zgłoszone opinie, przepisy bez znaczka).
- **C: pulpit.** Cztery liczby i cztery kafelki (do zrobienia, wyświetlenia, najpopularniejszy koktajl, nowi użytkownicy).
- **D: użytkownicy i role.** Zmiana roli tylko na niższą od własnej, zablokowane konto własne i ownera, tabela "kto co może".
- **E: galeria weryfikacji.** Siatka zdjęć z polami wyboru i paskiem akcji grupowej.

**Zasady zgodne z backendem:** autor nie ustawia znaczka "zweryfikowany" (robi to administrator), zdjęcie musi mieć adres `https`, składnik może wystąpić w przepisie raz, ilość jest zwykłym tekstem, administrator usuwa opinie, ale ich nie edytuje, a rolę można nadać tylko niższą od własnej.

**Czego nie sprawdzono:** makiety obejrzano tylko na zrzutach z przeglądarki Edge (szerokość 1500 px, **tylko motyw ciemny**; jasnego nie udało się wymusić, kolory mają jednak sprawdzone pary z `globals.css`). Nie sprawdzono ich na telefonie ani czytnikiem ekranu. Poziom 3:1 dla obwódek pól wyliczono, ale nie zmierzono narzędziem.

**Uwaga o gęstości:** panel admina jest gęstszy niż reszta aplikacji (małe odstępy, liczby tabelaryczne). Zasady Solvro (jedna paleta, kształty, szkło) zostały te same.

## Prototyp panelu administratora (dwa układy)

Otwórz [`admin-sidebar.html`](admin-sidebar.html) (menu boczne) albo [`admin-topbar.html`](admin-topbar.html) (menu górne). Oba pliki ładują ten sam `admin-panel.js` i `admin-panel.css`, różni je tylko atrybut `data-nav` w `<body>`. Przycisk w menu konta przełącza między układami.

Co działa (na danych przykładowych, bez backendu; zmiany zostają w `sessionStorage` do zamknięcia karty, przycisk "Przywróć dane" je kasuje):
- **Pulpit** (propozycja C): liczby i listy spraw do zrobienia liczone z aktualnych danych, kafelki prowadzą do właściwego filtru.
- **Koktajle** (A i E): wyszukiwanie, filtry, sortowanie, strony, tabela albo galeria, zaznaczanie, akcje grupowe (znaczek, usuń), dodawanie i edycja w oknie z walidacją (nazwa wymagana i unikalna, adres zdjęcia tylko `https`), usuwanie z potwierdzeniem.
- **Moderacja** (B): kolejka zgłoszonych opinii i nowych przepisów, skróty J i K, usuń opinię, odrzuć zgłoszenia, zweryfikuj albo usuń przepis.
- **Użytkownicy** (D): zmiana roli tylko na niższą od własnej, konto własne i ownera zablokowane, tabela "Kto co może". Lista "Zobacz panel jako" pokazuje, jak zmieniają się uprawnienia dla admin, staff i owner.

Czego brakuje: składniki i kategorie (nie były głównym ekranem żadnej propozycji), prawdziwe logowanie i zapytania do backendu, dzienne wyświetlenia (wykres to dane wymyślone, backend liczy tylko sumy), kolejka "przepisy do sprawdzenia" (backend ma tylko filtr bez znaczka).
Sprawdzone: skrypt w headless Edge (ciemny motyw, 1500 px i 420 px) przeszedł przez wyszukiwanie, filtry, akcje grupowe, formularz z błędami, kolejkę, role. Niesprawdzone: jasny motyw, czytnik ekranu, prawdziwy telefon.

## Prototyp strony głównej i konta (`app.html`)

Jedna strona, dwa układy, zależnie od szerokości okna. Od 48rem (komputer) na górze jest szklany pasek z szukajką, ulubionymi, przyciskiem "Dodaj przepis" i kontem. Poniżej 48rem (telefon) pasek zostaje tylko z logo i szukajką, a na dole pojawia się szklana nawigacja z propozycji E (Główna, Ulubione, Dodaj, Profil), na stronie głównej i na koncie. Pliki: `app.html`, `app.js`, `app.css` (dialog, komunikat i kilka klas bierze z `admin-panel.css`).

Z propozycji z `profil.html` wzięto:
- **A**: baner z nazwą, rolą i czterema liczbami oraz zakładki sekcji (na telefonie i w średnich oknach).
- **B**: te same sekcje jako menu boczne na szerokim ekranie (od 64rem), "Przegląd" z ostatnią aktywnością.
- **C**: na "Przeglądzie" poziome półki (Moje przepisy z kafelkiem "Dodaj przepis", Ulubione, Ostatnio oceniłam).
- **D**: sekcja "Moje przepisy" jako panel autora: wykres 30 dni, liczby, tabela z edycją i usuwaniem.
- **E**: dolna nawigacja, wiersze zamiast tabeli na telefonie, stany puste.

Co działa (dane przykładowe, bez backendu, zmiany w `sessionStorage`): szukanie, filtr kategorii i sortowanie na stronie głównej, serce (ulubione) z licznikiem, dodawanie i edycja przepisu w oknie (nazwa wymagana i unikalna, zdjęcie tylko `https`), usuwanie z potwierdzeniem, usuwanie własnych opinii (średnia ocen koktajlu liczy się na nowo), stany puste, przywracanie danych w ustawieniach.
Czego brakuje: strony szczegółów po kliknięciu karty (jest tylko makieta `szczegoly.html`), pełnego formularza przepisu z składnikami (wybrana propozycja C z `przepis.html` nie jest jeszcze zbudowana, okno ma tylko nazwę, kategorię i zdjęcie), wylogowania i zmiany hasła, wykresu z prawdziwych danych (backend liczy tylko sumy).
Sprawdzone: skrypt w headless Edge (ciemny motyw, 1500 px i 390 px): wyszukiwanie, filtry, ulubione, formularz z błędami, usuwanie do stanu pustego, dolna nawigacja, brak przewijania w poziomie na telefonie. Niesprawdzone: jasny motyw, czytnik ekranu, prawdziwy telefon.

