from datetime import timedelta

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex, OpClass
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Case, Count, ExpressionWrapper, F, FloatField, OuterRef, Q, Subquery, Value, When
from django.db.models.functions import Coalesce, Upper
from django.utils import timezone


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
    def with_stats(self):
        """Oceny, wyświetlenia i etykieta popularności, wszystko liczone w bazie na każde zapytanie (bez zapisanych wyników)."""
        today = timezone.localdate()
        thresholds = settings.LABEL_THRESHOLDS

        # Oceny przez podzapytania, a nie join: join z wyświetleniami pomnożyłby wiersze i zafałszował liczby.
        reviews = Review.objects.filter(cocktail=OuterRef("pk")).order_by().values("cocktail")
        site_avg = Coalesce(
            Subquery(Review.objects.annotate(k=Value(1)).values("k").annotate(v=Avg("rating")).values("v")),
            Value(3.0, output_field=FloatField()),
        )
        prior = Value(float(settings.TOP_RATED_PRIOR_REVIEWS), output_field=FloatField())

        def seen(newer_than_days, older_than_days=None):
            condition = Q(views__day__gt=today - timedelta(days=newer_than_days))
            if older_than_days:
                condition &= Q(views__day__lte=today - timedelta(days=older_than_days))
            return Count("views", filter=condition)

        return (
            self.annotate(
                rating_avg=Subquery(reviews.annotate(v=Avg("rating")).values("v")),
                rating_count=Coalesce(Subquery(reviews.annotate(v=Count("pk")).values("v")), 0),
                views_7d=seen(7),
                views_prev_7d=seen(14, 7),
                views_14d=seen(14),
                views_30d=seen(30),
            )
            .annotate(
                trend=F("views_7d") - F("views_prev_7d"),
                # Średnia ważona: mało opinii = bliżej średniej wszystkich ocen, żeby jedna piątka nie wygrywała z setką czwórek
                # Bez żadnej opinii: -1, czyli poniżej każdej prawdziwej oceny (1 do 5), więc "najlepiej oceniane" kończą się
                # nieocenionymi, a nie mieszają się z nimi (inaczej dostawałyby średnią wszystkich ocen i lądowały w środku).
                top_rated_score=Case(
                    When(rating_count=0, then=Value(-1.0)),
                    default=ExpressionWrapper(
                        (site_avg * prior + Coalesce(F("rating_avg"), 0.0) * F("rating_count")) / (prior + F("rating_count")),
                        output_field=FloatField(),
                    ),
                    output_field=FloatField(),
                ),
                status=Case(
                    When(
                        Q(views_14d__gte=thresholds["trending_views_14d"], views_7d__gt=F("views_prev_7d")),
                        then=Value("trending"),
                    ),
                    When(views_30d__gte=thresholds["most_popular_views_30d"], then=Value("most_popular")),
                    When(views_30d__gte=thresholds["popular_views_30d"], then=Value("popular")),
                    default=Value(None),
                    output_field=models.CharField(),
                ),
            )
        )


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


class CocktailView(models.Model):
    """Jedno wyświetlenie = jeden odwiedzający, jeden koktajl, jeden dzień. Adresu IP tu nie ma, tylko jego skrót."""

    cocktail = models.ForeignKey(Cocktail, on_delete=models.CASCADE, related_name="views")
    day = models.DateField()
    visitor = models.CharField(max_length=64)  # HMAC(sekret, dzień + koktajl + sieć IP): nie da się cofnąć do adresu

    class Meta:
        constraints = [models.UniqueConstraint(fields=["cocktail", "day", "visitor"], name="one_view_per_visitor_per_day")]
        # ponytail: wiersze starsze niż 30 dni nie są potrzebne do etykiet; kasowanie ich to osobne zadanie, gdy tabela urośnie
