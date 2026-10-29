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
        ingredients = get("/ingredients?perPage=1000")["data"]
        cocktails = get("/cocktails?perPage=1000")["data"]
        details = [get(f"/cocktails/{c['id']}")["data"] for c in cocktails]

        # Jedna transakcja: albo wszystko się zapisze, albo nic.
        with transaction.atomic():
            for i in ingredients:
                Ingredient.objects.update_or_create(
                    id=i["id"],
                    defaults={
                        "name": i["name"],
                        "description": i["description"] or "",
                        "alcoholic": i["alcohol"],  # w API Solvro pole nazywa się "alcohol"
                        "type": i["type"] or "",
                        "percentage": i["percentage"],
                        "image_url": i["imageUrl"] or "",
                    },
                )

            for d in details:
                category, _ = Category.objects.get_or_create(name=d["category"])
                cocktail, _ = Cocktail.objects.update_or_create(
                    id=d["id"],
                    defaults={
                        "name": d["name"],
                        "instructions": d["instructions"] or "",
                        "glass": d["glass"] or "",
                        "alcoholic": d["alcoholic"],
                        "image_url": d["imageUrl"] or "",
                        "category": category,
                    },
                )
                # powiązania zawsze odtwarzamy od zera, żeby ponowny import nie zostawiał starych wierszy
                cocktail.links.all().delete()
                CocktailIngredient.objects.bulk_create(
                    # część składników (np. sól do ozdoby) nie ma w API w ogóle klucza "measure"
                    CocktailIngredient(cocktail=cocktail, ingredient_id=i["id"], measure=i.get("measure") or "")
                    for i in d["ingredients"]
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
