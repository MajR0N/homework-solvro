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
| `djangorestframework-simplejwt` | logowanie tokenami JWT (access + refresh, lista unieważnionych tokenów) |
| `drf-spectacular` | generuje dokumentację OpenAPI i stronę Swagger (`/api/docs/`) |
| `pytest`, `pytest-django` | testy automatyczne na prawdziwym PostgreSQL |

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
| `verified` | `?verified=true` | tylko zweryfikowane (lub `false`) |
| `author` | `?author=anna` | koktajle dodane przez to konto (bez rozróżniania wielkości liter) |
| `alcoholic` | `?alcoholic=true` | tylko `true` lub `false` |
| `ingredient` | `?ingredient=mint,lime` | fragment nazwy składnika; po przecinku koktajl musi mieć wszystkie |
| `id` | `?id=11000,11007` | tylko te koktajle (ulubione); samo `?id=` = brak wyników |
| `ordering` | `?ordering=-name` | `name`, `id`, `verified` (minus = malejąco; `-verified` daje zweryfikowane na początku); przy remisie decyduje `id` |

Przykład z zadania („bezalkoholowe koktajle z miętą”): `GET /api/v1/cocktails/?alcoholic=false&ingredient=mint`.

### Zapis koktajli

| Metoda i adres | Działanie | Odpowiedź |
|---|---|---|
| `POST /api/v1/cocktails/` | utwórz | 201 + pełny koktajl |
| `PUT /api/v1/cocktails/{id}/` | zastąp (wymagane `name`, `category`) | 200 |
| `PATCH /api/v1/cocktails/{id}/` | zmień wybrane pola | 200 |
| `DELETE /api/v1/cocktails/{id}/` | usuń (razem z jego składnikami) | 204 |

```json
{
  "name": "Test", "category": "Cocktail", "glass": "Tumbler", "alcoholic": false,
  "instructions": "Stir.", "image_url": "",
  "ingredients": [{"ingredient": 312, "measure": "2 oz"}, {"ingredient": 337}]
}
```

- `category` to **nazwa** istniejącej kategorii; nieznana nazwa = 400 (kategoria nie powstaje „przy okazji”).
- `ingredients`: lista `{ingredient: id, measure}`; nieznane id lub ten sam składnik dwa razy = 400. Wysłana lista **zastępuje** starą, pominięta zostawia ją bez zmian.
- Nazwa jest przycinana z białych znaków, niepusta, do 200 znaków; `image_url` musi być poprawnym adresem.
- Koktajl i jego składniki zapisują się w jednej transakcji.
- Zapis wymaga zalogowania (nagłówek `Authorization: Bearer <access>`); zasady w sekcji „Uprawnienia”.

### Składniki

| Metoda i adres | Działanie | Odpowiedź |
|---|---|---|
| `GET /api/v1/ingredients/` | lista po 20 (`?page=`, `?page_size=` do 100) | 200 |
| `GET /api/v1/ingredients/{id}/` | jeden składnik | 200 |
| `POST /api/v1/ingredients/` | utwórz (wymagane `name`) | 201 |
| `PUT` / `PATCH /api/v1/ingredients/{id}/` | zastąp / zmień wybrane pola | 200 |
| `DELETE /api/v1/ingredients/{id}/` | usuń | 204; **409**, gdy składnik jest użyty w jakimś koktajlu |

Filtry listy: `?search=` (fragment nazwy), `?type=` (dokładny typ), `?alcoholic=true|false`, `?ordering=name|-name|id|-id`. Zła wartość daje 400.
Walidacja: `name` wymagane, do 200 znaków; `percentage` od 0 do 100; `image_url` musi być adresem.

### Znane ograniczenie: równoległa edycja

Wysłana lista `ingredients` zastępuje całą starą. Gdy dwie osoby edytują ten sam koktajl jednocześnie, wygrywa ostatni zapis (bez blokady optymistycznej). Ryzyko jest małe, bo po dodaniu autorów edytować będzie mógł tylko autor lub administrator. Rozwiązaniem „książkowym” byłoby pole `updated_at` i nagłówek `If-Match` (odpowiedź 412 przy nieaktualnej wersji).

## Dokumentacja API (Swagger / OpenAPI)

Po uruchomieniu serwera: <http://127.0.0.1:8000/api/docs/> (interaktywna, z przyciskiem „Try it out”) oraz surowy schemat OpenAPI pod `/api/schema/`. Generuje ją `drf-spectacular` z modeli, serializerów i filtrów; opisy parametrów pochodzą z `help_text` w `filters.py`. Strona Swaggera ładuje swój kod z CDN, więc wymaga internetu.

Sprawdzenie schematu: `python manage.py spectacular --validate --fail-on-warn`.

## Testy

```bash
python -m pytest              # 142 testy, ok. 2 s, bez internetu
python -m pytest -m network   # dodatkowo test na prawdziwym API Solvro (ok. 12 s, wymaga internetu)
```

Testy używają osobnej, tymczasowej bazy `test_cocktails` (tworzy ją i usuwa pytest-django), więc dane w bazie `cocktails` nie są ruszane. Zakres: filtry i paginacja, tworzenie/edycja/usuwanie koktajli i składników wraz z walidacją, reguła 409 przy usuwaniu używanego składnika, oraz import.

Import jest sprawdzany dwojako, z różnych powodów:

| Test | Co sprawdza | Kiedy |
|---|---|---|
| na atrapie API | **naszą logikę**: te same id co w Solvro, ponowny import nic nie zmienia, licznik id, składnik bez `measure`, brak połowicznych danych przy błędzie | zawsze |
| na prawdziwym API | **świat zewnętrzny**: dane Solvro nadal mają kształt, jakiego oczekuje import | tylko na życzenie (`-m network`) |

## Konta i logowanie

Własny model użytkownika (`accounts.User`) z polem `role`: **user < admin < staff < owner**. Flagi Django (`is_staff` = wejście do panelu `/admin/`, `is_superuser` = tylko owner) są zawsze wyliczane z roli przy zapisie, więc nie mogą się z nią rozjechać. Konto z `createsuperuser` jest ownerem. Rejestracja zawsze tworzy zwykłego użytkownika; roli nie da się podać w żądaniu.

| Metoda i adres | Działanie |
|---|---|
| `POST /api/v1/auth/register/` | `username` + `password` (hasło sprawdzane regułami Django; nazwy bez rozróżniania wielkości liter są unikalne) |
| `POST /api/v1/auth/login/` | zwraca `access` (ważny 10 minut) i `refresh` (7 dni) |
| `POST /api/v1/auth/refresh/` | nowy `access` i **nowy** `refresh`; stary przestaje działać |
| `POST /api/v1/auth/logout/` | unieważnia `refresh` |
| `GET /api/v1/auth/me/` | `id`, `username`, `role` (wymaga nagłówka `Authorization: Bearer <access>`) |

Rejestracja i logowanie mają wspólny limit 10 prób na minutę z jednego IP. Limit liczy adres z `REMOTE_ADDR`; za serwerem pośredniczącym (np. Cloud Run) trzeba ustawić zmienną `NUM_PROXIES`, inaczej limit będzie liczony po adresie pośrednika.

Brak pola e-mail (mniej danych osobowych). Weryfikacji e-mail też nie ma, więc skrypt może powoli zakładać wiele kont; to znane ograniczenie.

**Zmiana modelu użytkownika wymaga świeżej bazy:** po pobraniu tej zmiany na istniejącej bazie `migrate` zgłosi niespójną historię migracji. Lokalnie: `DROP DATABASE cocktails; CREATE DATABASE cocktails;`, potem `migrate` i `import_solvro`.

## Uprawnienia i autorzy

| Kto | Koktajle i składniki |
|---|---|
| każdy, także niezalogowany | czyta |
| zalogowany (`user`) | dodaje; zmienia i usuwa **tylko swoje** |
| `admin`, `staff`, `owner` | zmieniają i usuwają **wszystko**, także dane zaimportowane |

- Dane z importu Solvro nie mają autora (`author: null`, `author_name: ""`), więc zwykły użytkownik nie może ich zmienić.
- Autora ustawia serwer z konta w tokenie (`author` = id, `author_name` = kopia nazwy). Klient nie może go podać ani zmienić później; test pilnuje, żeby nie dało się „przejąć” cudzego wpisu przez PATCH.
- Po usunięciu konta treść zostaje: `author` staje się `null`, a `author_name` zachowuje starą nazwę. Taki wpis może już zmienić tylko admin wzwyż.
- Niezalogowany zapis daje 401, brak uprawnień 403.

## CMS (panel `/admin/`)

Panel administracyjny Django, ograniczony rolami. Wchodzą do niego tylko `admin`, `staff` i `owner` (zwykły użytkownik jest odsyłany do logowania). Pierwsze konto ownera: `python manage.py createsuperuser`.

| Co | Zasada |
|---|---|
| koktajle, składniki, kategorie | admin, staff i owner dodają, zmieniają i usuwają wszystko (składnik w użyciu jest chroniony) |
| konta użytkowników | zmieniać i usuwać można **tylko konta o niższej randze** niż własna; siebie ani równych sobie nie |
| nadawanie ról | **tylko rolę niższą od własnej**: admin tworzy zwykłych użytkowników, staff także adminów, owner także staff. Ownera nie da się nadać w panelu (tylko `createsuperuser`). |
| flagi `is_staff` / `is_superuser` | nie ma ich w formularzu; wynikają z roli przy zapisie |
| wpis dodany w panelu | dostaje autora z zalogowanego konta, tak jak przez API |

Rangi: user < admin < staff < owner. Nikt nie może edytować własnego konta w panelu ani innego ownera, żeby nie dało się wszystkich zablokować.

## Znaczek „zweryfikowany”

Koktajl ma pole `verified`. To znaczek i filtr, nie bramka: **nic nie jest ukrywane**. Ustawia go ręcznie admin wzwyż w CMS (akcje „Mark selected cocktails as verified” i „Remove the verified mark”). Przez API nie da się go zmienić (nawet właścicielowi), więc autor nie może sam sobie go nadać. Dane z importu Solvro startują jako zweryfikowane, a ponowny import nie cofa decyzji admina.
