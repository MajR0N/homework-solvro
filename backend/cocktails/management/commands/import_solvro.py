import json
import urllib.request

from django.core.management.base import BaseCommand
from django.core.management.color import no_style
from django.db import connection, transaction

from cocktails.models import Category, Cocktail, CocktailIngredient, Ingredient

API = "https://cocktails.solvro.pl/api/v1"


def get(path):
    with urllib.request.urlopen(f"{API}{path}", timeout=30) as response:
        return json.load(response)


class Command(BaseCommand):
    help = "Kopiuje koktajle i składniki z API Solvro (z ich id). Można uruchamiać wielokrotnie."

    def handle(self, *args, **options):
        # Najpierw pobieramy wszystko, dopiero potem zapisujemy: błąd sieci nie zostawi połowy danych.
        self.stdout.write("Pobieranie danych z API Solvro...")
        ingredients = get("/ingredients?perPage=1000")["data"]
        cocktails = get("/cocktails?perPage=1000")["data"]
        details = []
        for number, cocktail in enumerate(cocktails, 1):
            details.append(get(f"/cocktails/{cocktail['id']}")["data"])
            if number % 50 == 0:
                self.stdout.write(f"  pobrano {number} z {len(cocktails)} koktajli")

        # Zapisujemy zbiorczo: kilka zapytań zamiast tysięcy. Przy bazie na drugim końcu internetu każde zapytanie
        # to osobna podróż w obie strony, więc zapis wiersz po wierszu trwałby minuty i wyglądał na zawieszony.
        self.stdout.write("Zapis do bazy (jedna transakcja)...")
        with transaction.atomic():
            Ingredient.objects.bulk_create(
                [
                    Ingredient(
                        id=i["id"],
                        name=i["name"],
                        description=i["description"] or "",
                        alcoholic=i["alcohol"],  # w API Solvro pole nazywa się "alcohol"
                        type=i["type"] or "",
                        percentage=i["percentage"],
                        image_url=i["imageUrl"] or "",
                    )
                    for i in ingredients
                ],
                # id już istnieje = aktualizuj te pola (autor zostaje, bo go tu nie ma); id nowe = wstaw
                update_conflicts=True,
                unique_fields=["id"],
                update_fields=["name", "description", "alcoholic", "type", "percentage", "image_url"],
            )

            names = {d["category"] for d in details}
            known = set(Category.objects.filter(name__in=names).values_list("name", flat=True))
            Category.objects.bulk_create([Category(name=name) for name in names - known])
            categories = {c.name: c for c in Category.objects.filter(name__in=names)}

            Cocktail.objects.bulk_create(
                [
                    Cocktail(
                        id=d["id"],
                        name=d["name"],
                        instructions=d["instructions"] or "",
                        glass=d["glass"] or "",
                        alcoholic=d["alcoholic"],
                        image_url=d["imageUrl"] or "",
                        category=categories[d["category"]],
                        verified=True,
                    )
                    for d in details
                ],
                update_conflicts=True,
                unique_fields=["id"],
                # "verified" jest celowo pominięte: nowe koktajle dostają True, a przy ponownym imporcie decyzja admina z CMS zostaje
                update_fields=["name", "instructions", "glass", "alcoholic", "image_url", "category"],
            )

            # powiązania zawsze odtwarzamy od zera, żeby ponowny import nie zostawiał starych wierszy
            CocktailIngredient.objects.filter(cocktail_id__in=[d["id"] for d in details]).delete()
            CocktailIngredient.objects.bulk_create(
                [
                    # część składników (np. sól do ozdoby) nie ma w API w ogóle klucza "measure"
                    CocktailIngredient(cocktail_id=d["id"], ingredient_id=i["id"], measure=i.get("measure") or "")
                    for d in details
                    for i in d["ingredients"]
                ],
                batch_size=1000,
            )

            # Id wstawiliśmy ręcznie, więc licznik w bazie został w tyle: bez tego nowy rekord dostałby zajęte id.
            for sql in connection.ops.sequence_reset_sql(no_style(), [Category, Ingredient, Cocktail, CocktailIngredient]):
                with connection.cursor() as cursor:
                    cursor.execute(sql)

        self.stdout.write(
            self.style.SUCCESS(
                f"Zaimportowano: {Cocktail.objects.count()} koktajli, "
                f"{Ingredient.objects.count()} składników, {CocktailIngredient.objects.count()} powiązań."
            )
        )
