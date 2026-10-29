# Backend

**Ze względu na to, że w naszych projektach pracujemy na trzech głównych technologiach, akceptujemy zadania w [NestJS](https://docs.nestjs.com/) (TypeScript), [Django](https://www.djangoproject.com/) (Python) lub [adonis](https://adonisjs.com/) (TypeScript). Nie przejmuj się, jeśli ich dobrze nie znasz – nauczysz się ich z nami w pierwszych tygodniach, chociaż zachęcamy do podjęcia rękawic i spróbowania swoich sił w jednym z nich już podczas rekrutacji😉**

### Opis zadania

Twoim zadaniem jest przygotowanie REST API do zarządzania koktajlami i jego składnikami. Każdy koktajl posiada składniki z których się go robi. Z pomocą aplikacji mamy być w stanie utworzyć, edytować, wyświetlić i usunąć koktajle i składniki. W skrócie powinniśmy zaimplementować pełnego CRUDa koktajli i składników.

### Koktajl

Każdy koktajl zawiera minimum:

- id
- nazwę
- kategorię
- instrukcję przygotowania
- składniki wraz z dokładnymi ilościami/proporcjami potrzebnymi do utworzenia

### Składnik

Każdy składnik posiada minimum:

- id
- nazwę
- opis
- czy jest drinkiem alkoholowym
- zdjęcie (np. URL do zdjęcia lub upload pliku)

### Wymagania i ograniczenia

- Stworzenie relacyjnej bazy danych (np. PostgreSQL) z odpowiednim wymodelowaniem relacji.
- Implementacja **paginacji** przy listowaniu koktajli i składników.
- Zadbaj o walidację danych wejściowych (zarówno przy tworzeniu jak i wywoływaniu endpointów z filtrami).

### Nice to have

- **Autoryzacja i użytkownicy (Opcjonalne)**:
  - Rejestracja i logowanie (np. przy użyciu JWT/session lub mechanizmów wbudowanych we framework).
  - Różne role użytkowników: np. _User_ oraz _Admin_.
  - Uprawnienia: każdy może przeglądać koktajle, ale tylko zalogowany użytkownik może dodać nowy przepis lub zostawić ocenę z recenzją.
  - Edycja/usuwanie koktajlu jest dozwolona tylko dla osoby, która go dodała, lub dla Administratora.
  - Powiązanie koktajlu z jego autorem (użytkownikiem, który go dodał).

- screen schematu/projektu bazy danych
- staranne zastosowanie zasad REST
- testy automatyczne (jednostkowe, integracyjne lub e2e)
- wygenerowana dokumentacja API (np. Swagger / OpenAPI)
- wsparcie dla złożonego filtrowania i sortowania (np. szukanie bezalkoholowych koktajli zawierających miętę, sortowanie po nazwie, filtrowanie koktajli stworzonych przez danego użytkownika).

**W razie problemów zapraszamy do kontaktu i powodzenia!**

---

## Uruchomienie lokalne

```bash
python -m venv .venv
.venv/Scripts/activate            # Windows (Git Bash: source .venv/Scripts/activate)
pip install -r requirements.txt
cp .env.example .env              # uzupełnij SECRET_KEY i DB_PASSWORD
# w psql: CREATE DATABASE cocktails;
python manage.py migrate
python manage.py runserver        # http://127.0.0.1:8000
```

## Pakiety

| Pakiet | Do czego |
|---|---|
| `django` | framework: modele, migracje, panel admina, URL-e |
| `djangorestframework` | zamienia modele w REST API (serializery, widoki, paginacja) |
| `django-filter` | filtrowanie list przez parametry URL-a (`?category=...`) |
| `psycopg` | sterownik PostgreSQL dla Django |
| `python-dotenv` | wczytuje sekrety z pliku `.env` (poza gitem) |

## Indeksy

| Indeks | Po co |
|---|---|
| klucze obce (automatyczne) | szybkie łączenie koktajli z kategorią i składnikami |
| B-tree na `Cocktail.name`, `Cocktail.glass`, `Ingredient.name` | sortowanie i filtrowanie po tych polach |
| unikalne `(cocktail, ingredient)` | brak duplikatów składnika w koktajlu; służy też jako indeks po koktajlu |
| trigramowy GIN na `UPPER(Cocktail.name)` | wyszukiwanie po fragmencie nazwy |

Django zamienia `name__icontains="marg"` na `UPPER(name) LIKE UPPER('%marg%')`, dlatego indeks trigramowy jest zbudowany na `UPPER(name)` (rozszerzenie `pg_trgm`, migracja `0002`). Zwykły indeks B-tree nie pomaga przy `LIKE '%fragment%'`.

Plan zapytania (`Cocktail.objects.filter(name__icontains="marg").explain(analyze=True)`):

```
Bitmap Heap Scan on cocktails_cocktail  (actual time=0.069..0.075 rows=3 loops=1)
  Recheck Cond: (upper((name)::text) ~~ '%MARG%'::text)
  ->  Bitmap Index Scan on cocktail_name_trgm  (actual time=0.038..0.038 rows=3 loops=1)
        Index Cond: (upper((name)::text) ~~ '%MARG%'::text)
Execution Time: 0.581 ms
```

Przy 220 koktajlach to tylko demonstracja: tabela mieści się w kilku stronach pamięci, więc nawet przeszukanie całej tabeli byłoby równie szybkie. Zysk byłby widoczny dopiero przy dziesiątkach tysięcy wierszy.

## Endpointy (tylko odczyt)

| Metoda i adres | Zwraca |
|---|---|
| `GET /api/v1/cocktails/` | lista po 20 (`?page=2`, `?page_size=50`, maks. 100) |
| `GET /api/v1/cocktails/{id}/` | jeden koktajl z instrukcją i listą `ingredients[]` (każdy z polem `measure`) |

| `GET /api/v1/categories/` | wszystkie kategorie (bez paginacji) |

Parametry listy koktajli (łączą się ze sobą i z paginacją; zła wartość daje 400):

| Parametr | Przykład | Znaczenie |
|---|---|---|
| `search` | `?search=marg` | fragment nazwy, bez rozróżniania wielkości liter |
| `category` | `?category=Shot` | dokładna nazwa kategorii |
| `glass` | `?glass=Jar` | dokładna nazwa szklanki |
| `alcoholic` | `?alcoholic=true` | tylko `true` lub `false` |
| `ingredient` | `?ingredient=mint,lime` | fragment nazwy składnika; po przecinku koktajl musi mieć wszystkie |
| `id` | `?id=11000,11007` | tylko te koktajle (ulubione); samo `?id=` = brak wyników |
| `ordering` | `?ordering=-name` | `name`, `-name`, `id`, `-id`; przy remisie decyduje `id` |

Przykład z zadania („bezalkoholowe koktajle z miętą”): `GET /api/v1/cocktails/?alcoholic=false&ingredient=mint`.

Zapis (POST/PUT/DELETE) odpowiada 405, bo dodamy go w kolejnym kroku.
