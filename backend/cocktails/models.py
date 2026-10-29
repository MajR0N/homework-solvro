from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    # id nadajemy ręcznie przy imporcie (id z API Solvro); nowe składniki dostaną kolejne numery
    name = models.CharField(max_length=200, db_index=True)
    description = models.TextField(blank=True)
    alcoholic = models.BooleanField(default=False)
    type = models.CharField(max_length=100, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    image_url = models.URLField(max_length=500, blank=True)

    def __str__(self):
        return self.name


class Cocktail(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    instructions = models.TextField(blank=True)
    glass = models.CharField(max_length=100, blank=True, db_index=True)  # zwykły tekst, bez osobnej tabeli
    alcoholic = models.BooleanField(default=False)
    image_url = models.URLField(max_length=500, blank=True)
    # PROTECT: nie da się usunąć kategorii, która ma koktajle
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="cocktails")
    ingredients = models.ManyToManyField(Ingredient, through="CocktailIngredient", related_name="cocktails")

    def __str__(self):
        return self.name


class CocktailIngredient(models.Model):
    """Tabela pośrednia: składnik w koktajlu razem z ilością (np. "2 oz")."""

    # CASCADE: usunięcie koktajlu usuwa jego wiersze; PROTECT: nie usuniesz składnika, który jest w użyciu
    cocktail = models.ForeignKey(Cocktail, on_delete=models.CASCADE, related_name="links")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT, related_name="links")
    measure = models.CharField(max_length=200, blank=True)  # wolny tekst, np. "Juice of 1 "

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["cocktail", "ingredient"], name="unique_ingredient_per_cocktail"),
        ]

    def __str__(self):
        return f"{self.cocktail} / {self.ingredient}"
