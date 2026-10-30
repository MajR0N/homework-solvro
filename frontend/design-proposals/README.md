# Propozycje przeprojektowania interfejsu

Ten folder to **makiety, nie kod aplikacji**. Powstał w trakcie pracy nad frontendem, kiedy po obejrzeniu działającej aplikacji zauważyliśmy konkretne problemy z układem i zamiast poprawiać je "na oko", spisaliśmy po trzy pomysły na każdy z nich. Dzięki temu widać, jakie rozwiązania rozważaliśmy i dlaczego wybraliśmy jedno z nich.

## Co otworzyć

Wystarczy otworzyć plik w przeglądarce (dwuklik). Potrzebne jest połączenie z internetem, bo makiety pobierają zdjęcia z API Solvro i krój Space Grotesk z Google Fonts. Kolory przełączają się według ustawienia jasny/ciemny w systemie.

| Plik | Czego dotyczy | Problem, który rozwiązuje |
|---|---|---|
| [`lista.html`](lista.html) | strona z listą koktajli | wąska kolumna (około 1000 px) na szerokim ekranie, filtry w jednym rzędzie z pustym miejscem, pole "Tylko zweryfikowane" w osobnej linii z systemowym, białym checkboxem |
| [`szczegoly.html`](szczegoly.html) | strona jednego koktajlu | puste miejsce pod zdjęciem, fakty w osobnych pudełkach, składniki wciśnięte w wąski pas |
| [`karta.html`](karta.html) | pojedyncza karta na liście | szklany panel zasłania około połowy zdjęcia, a znaczki "Zweryfikowany" i ocena zawijają się do osobnych linii |
| [`proposals.css`](proposals.css) | wspólne style makiet | kopia kolorów i kształtów z `src/app/globals.css` |

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

Każda makieta ma przy sobie listę zalet i wad. Karty w `lista.html` używają karty A z `karta.html`, żeby układy listy były pokazane w najlepszej formie.

## Jak dobieraliśmy rozwiązania

- Wszystkie warianty trzymają się identyfikacji Solvro: paleta z oficjalnego pliku, krój Space Grotesk, oficjalne logo bez zmian, ciemne szkło (pasek, panele na zdjęciach).
- **Zasada kształtów:** kontrolki (pola, listy, przyciski, tagi) są pigułkami, kontenery (karty, panele, listy) mają zaokrąglenie `rounded-xl`.
- Dostępność: stan nie zależy od samego koloru (ikona i tekst), ikony niosące znaczenie mają opis dla czytnika ekranu, rozwijanie karty działa też z klawiatury, a przy ograniczeniu animacji nie ma przejść.
- Pole wyboru "Tylko zweryfikowane" w makietach jest przełącznikiem w tej samej linii co reszta filtrów, a nie systemowym checkboxem.

## Czego te makiety nie są

- Nazwy koktajli, zdjęcia, składniki i ilości to **prawdziwe dane z API Solvro**. Etykiety popularności, oceny i opinia są **przykładowe**, bo własny backend nie ma jeszcze danych demonstracyjnych.
- Makiety nie są podłączone do aplikacji i nie były sprawdzane czytnikiem ekranu ani na prawdziwym telefonie (tylko na zrzutach z przeglądarki Edge przy szerokości 1500 px).
- Żaden z wariantów nie jest jeszcze wdrożony w `src/`. Po wyborze wariantów zmiana trafi do aplikacji w osobnym kroku i zostanie opisana w `STEPS.md`.
