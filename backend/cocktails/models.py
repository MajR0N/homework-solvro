from django.conf import settings
from django.contrib.postgres.indexes import GinIndex, OpClass
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count, Q
from django.db.models.functions import Upper


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
    # Autor: link znika, gdy konto zostanie usunięte, a kopia nazwy zostaje. Puste = dane zaimportowane z Solvro.
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="%(class)ss"
    )
    author_name = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return self.name


class CocktailQuerySet(models.QuerySet):
    def with_ratings(self):
        # średnia ocen i liczba opinii liczone w bazie, jednym zapytaniem dla całej listy
        return self.annotate(rating_avg=Avg("reviews__rating"), rating_count=Count("reviews"))


class Cocktail(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    instructions = models.TextField(blank=True)
    glass = models.CharField(max_length=100, blank=True, db_index=True)  # zwykły tekst, bez osobnej tabeli
    alcoholic = models.BooleanField(default=False)
    image_url = models.URLField(max_length=500, blank=True)
    # Znaczek ustawiany ręcznie w CMS (przez API nie da się go zmienić). Dane z importu Solvro startują jako zweryfikowane.
    verified = models.BooleanField(default=False)
    # PROTECT: nie da się usunąć kategorii, która ma koktajle
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="cocktails")
    ingredients = models.ManyToManyField(Ingredient, through="CocktailIngredient", related_name="cocktails")

    objects = CocktailQuerySet.as_manager()
    # Autor: link znika, gdy konto zostanie usunięte, a kopia nazwy zostaje. Puste = dane zaimportowane z Solvro.
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="%(class)ss"
    )
    author_name = models.CharField(max_length=150, blank=True)

    class Meta:
        # Szybkie wyszukiwanie po fragmencie nazwy. Django zamienia icontains na UPPER(name) LIKE UPPER('%x%'),
        # więc indeks musi być zbudowany na UPPER(name), inaczej Postgres go nie użyje.
        indexes = [GinIndex(OpClass(Upper("name"), name="gin_trgm_ops"), name="cocktail_name_trgm")]

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


class Review(models.Model):
    cocktail = models.ForeignKey(Cocktail, on_delete=models.CASCADE, related_name="reviews")
    # Po usunięciu konta opinia zostaje (ocena nadal się liczy), a autor jest pusty: pokazujemy "usunięty użytkownik".
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # to samo co walidacja w API, ale pilnowane przez bazę, gdyby ktoś ominął API
            models.CheckConstraint(condition=Q(rating__gte=1, rating__lte=5), name="review_rating_1_to_5"),
            # jedna opinia na użytkownika i koktajl; puste (usunięte) konta się nie wykluczają, bo NULL != NULL
            models.UniqueConstraint(fields=["author", "cocktail"], name="one_review_per_user_per_cocktail"),
        ]

    def __str__(self):
        return f"{self.rating}/5 {self.cocktail}"


class ReviewReport(models.Model):
    """Zgłoszenie opinii do sprawdzenia przez admina. Rozpatrzenie = usunięcie opinii albo samego zgłoszenia."""

    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="review_reports"
    )
    reason = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["reporter", "review"], name="one_report_per_user_per_review")]
