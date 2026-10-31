# Zadanie rekrutacyjne Solvro — koktajle

To repozytorium zawiera moje zadanie rekrutacyjne do koła naukowego **KN Solvro**.
Zadanie (<https://github.com/Solvro/rekrutacja>) ma motyw koktajli: miejsce do przechowywania i przeglądania przepisów (składniki z ilościami + instrukcja).

**Wersja online:** frontend <https://homework-solvro.vercel.app/> · backend (API z dokumentacją Swagger) <https://homework-solvro-backend-fsuaihda.vercel.app/api/docs/>

## Co jest w repozytorium

| Folder | Co to jest | Stan |
|---|---|---|
| `frontend/` | Strona do przeglądania koktajli: widoki „Odkrywaj” (rzędy tematyczne) i „Wszystkie” (siatka, numerowana paginacja), wyszukiwanie, filtry, ulubione, szczegóły, a po zalogowaniu konto, edytor przepisów i panel administratora. Osobny układ na telefon. Next.js, TypeScript, Tailwind CSS, TanStack Query. | Działa i jest wdrożona na Vercelu. Domyślnie czyta publiczne API Solvro, a przełącznik „Źródło danych” pozwala wybrać mój własny backend. Opis: [`frontend/README.md`](frontend/README.md). |
| `backend/` | Własne REST API koktajli i składników. Django, Django REST Framework, PostgreSQL. Konta i role, opinie, CMS, etykiety popularności, Swagger, testy. | Gotowe, przetestowane i **wdrożone** na Vercelu (baza Neon). Opis w [`backend/README.md`](backend/README.md). |

## Pomysł

Frontend korzysta z dwóch źródeł danych: gotowego API Solvro albo mojego własnego API w Django, z przełącznikiem w interfejsie, żeby obie części zadania działały razem jako jeden projekt. Przełącznik jest widoczny także na wersji online (adres backendu ustawia zmienna środowiskowa, patrz [`frontend/README.md`](frontend/README.md)); domyślnym źródłem zostaje API Solvro. Z własnym backendem frontend ma logowanie (tokeny w ciasteczkach `httpOnly` przez serwer Next.js), stronę konta, edytor przepisów i panel administratora; tryb demo pozwala to wszystko obejrzeć bez backendu i bez konta. Tematy w „Odkrywaj” to zapisane zapytania (rodziny nazw, np. „sour”), a nie dane o smaku. Nie ma formularza dodawania opinii (backend to umie).

## Jak korzystałem z AI

Korzystałem z asystenta AI (Claude Code) jako nauczyciela i partnera do programowania w parze. Napisał dużą część kodu. Decyzje podejmowałem ja.

- **Projekt aplikacji to moje decyzje.** Przed każdym krokiem AI proponowało opcje z rekomendacją, a ja wybierałem. 26 decyzji architektonicznych i dotyczących bezpieczeństwa jest zapisanych w `STEPS.md` (sekcja 11). Przykłady: tokeny JWT w ciasteczkach `HttpOnly` zamiast w `localStorage`, przełącznik między API Solvro a moim API, TanStack Query zamiast SWR.
- **Jeden krok naraz.** Każdy krok był zbudowany, sprawdzony (typy, lint, build, testy) i zapisany w osobnym commicie, a potem wyjaśniony, zanim poprosiłem o następny. Zasady pracy są w `CLAUDE.md`.
- **Uczyłem się, jak to działa.** `STEPS.md` (sekcja 4) zawiera, czego się nauczyłem: jak działa `useSyncExternalStore`, jak cache TanStack Query decyduje, że dane są nieaktualne, dlaczego `localStorage` to ryzykowne miejsce na tokeny i tak dalej.
- **Wynik AI i pliki zadania traktowałem jako niezaufane.** W pliku zadania `backend.md` jest ukryta instrukcja skierowana do narzędzi AI. Znaleźliśmy ją, nie wykonaliśmy jej i opisaliśmy to w `STEPS.md` (sekcja 8).

Potrafię wyjaśnić większość wybranego projektu aplikacji, ale nie każdą linijkę kodu.

**Co to znaczy.** Potrafię wyjaśnić, co robi aplikacja, jakie technologie wybrałem i dlaczego, oraz jak części ze sobą współpracują: jak frontend rozmawia z API, czym jest stan serwera i jak TanStack Query go przechowuje, dlaczego tokeny nie powinny leżeć w `localStorage` i jakie są znane ograniczenia. Nie obiecuję, że wyjaśnię każdą linijkę, na przykład dokładną składnię typu generycznego w TypeScripcie albo dlaczego użyto jednej klasy Tailwinda zamiast innej. Przy takich rzeczach musiałbym ponownie przeczytać kod.

**Dlaczego tak piszę.** AI napisało dużą część kodu, więc twierdzenie, że rozumiem każdą linijkę, nie byłoby uczciwe. Moim celem w tym zadaniu było przećwiczenie części, którą mogę w pełni objąć: decydowania, jak system ma być zbudowany, sprawdzania, że działa, i rozumienia głównych idei na tyle dobrze, żeby ich bronić. Decyzje i wnioski są zapisane w `STEPS.md`, więc można je sprawdzić.

## Więcej szczegółów

- [`STEPS.md`](STEPS.md) — pełny dziennik pracy (po angielsku): co zdecydowano, co zbudowano, dlaczego i jakie były problemy.
- [`frontend/README.md`](frontend/README.md) — jak uruchomić frontend, funkcje, ograniczenia.
- [`backend/README.md`](backend/README.md) — jak uruchomić backend, schemat bazy danych, endpointy, role, testy, ograniczenia.
- [`CLAUDE.md`](CLAUDE.md) — zasady dla asystenta AI, który pomaga mi się uczyć podczas pracy nad tym zadaniem.
