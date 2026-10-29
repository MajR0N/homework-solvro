from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from cocktails.models import Cocktail, CocktailView, Review

# Wszystko, co tworzy to polecenie, ma rozpoznawalny znacznik, żeby `--remove` usuwał tylko to:
# konta zaczynają się od "demo_", wyświetlenia od "demo-", a teksty opinii są na poniższej liście.
USER_PREFIX = "demo_"
VIEW_PREFIX = "demo-"
USERNAMES = ["demo_anna", "demo_bartek", "demo_celina", "demo_darek", "demo_ewa"]
DELETED_USER = "demo_usuniety"
TEXTS = [
    "Świeży i orzeźwiający, robię go regularnie.",
    "Dobry przepis, dodałbym trochę więcej limonki.",
    "Klasyk, który zawsze się sprawdza.",
    "Za słodki jak na mój gust.",
    "Rewelacja na upalny dzień!",
    "Prosty i smaczny.",
]
DELETED_TEXT = "Opinia osoby, której konto zostało usunięte (pokazuje się jako „usunięty użytkownik”)."

# Plan dla kilku koktajli z danych Solvro. Nazwy, których brakuje w bazie, są pomijane.
# recent = wyświetlenia w ostatnich 7 dniach, previous = w 7 dniach wcześniej, old = sprzed 15 do 29 dni
# (z progami 10 / 20 / 100 wychodzi: trending, trending, najpopularniejszy, popularny, bez etykiety).
PLAN = {
    "Mojito": {"ratings": [5, 5, 4, 5, 5], "deleted_rating": 4, "recent": 14, "previous": 3},
    "Strawberry Margarita": {"ratings": [4], "recent": 11},
    "Margarita": {"ratings": [4, 5, 4], "old": 110},
    "Blue Margarita": {"ratings": [3, 4], "old": 25},
    "Absinthe #2": {"ratings": [2]},
}


def spread(count, first_day, last_day):
    """Dni (liczone wstecz od dziś) dla `count` wyświetleń rozłożonych równomiernie między dwiema granicami."""
    span = last_day - first_day + 1
    return [first_day + i % span for i in range(count)]


class Command(BaseCommand):
    help = "Tworzy dane demonstracyjne (konta demo_*, opinie i wyświetlenia), żeby oceny i etykiety popularności były widać. --remove usuwa je."

    def add_arguments(self, parser):
        parser.add_argument("--remove", action="store_true", help="usuń dane demonstracyjne zamiast je tworzyć")
        parser.add_argument("--yes", action="store_true", help="nie pytaj o potwierdzenie")

    def handle(self, *args, **options):
        host = settings.DATABASES["default"].get("HOST")
        action = "USUNĄĆ dane demonstracyjne z" if options["remove"] else "ZAPISAĆ dane demonstracyjne w"
        self.stdout.write(f"Baza danych: {host} ({settings.DATABASES['default'].get('NAME')})")
        if not options["yes"] and input(f"Czy na pewno {action} tej bazie? [t/N] ").strip().lower() not in ("t", "tak", "y", "yes"):
            raise CommandError("Przerwano, nic nie zapisano.")
        with transaction.atomic():
            self.remove() if options["remove"] else self.seed()

    def seed(self):
        today = timezone.localdate()
        users = [User.objects.get_or_create(username=name)[0] for name in USERNAMES]
        for user in users:
            if user.has_usable_password():  # konta demonstracyjne nie mogą służyć do logowania
                user.set_unusable_password()
                user.save()
        made_reviews = made_views = 0
        skipped = []
        for name, plan in PLAN.items():
            cocktail = Cocktail.objects.filter(name=name).first()
            if cocktail is None:
                skipped.append(name)
                continue
            for index, rating in enumerate(plan["ratings"]):
                _, created = Review.objects.get_or_create(
                    cocktail=cocktail, author=users[index], defaults={"rating": rating, "text": TEXTS[(index + len(name)) % len(TEXTS)]}
                )
                made_reviews += created
            if "deleted_rating" in plan and not Review.objects.filter(cocktail=cocktail, text=DELETED_TEXT).exists():
                ghost = User.objects.create_user(DELETED_USER)  # bez hasła
                Review.objects.create(cocktail=cocktail, author=ghost, rating=plan["deleted_rating"], text=DELETED_TEXT)
                ghost.delete()  # konto znika, opinia zostaje z pustym autorem
                made_reviews += 1
            days = (
                spread(plan.get("recent", 0), 0, 6) + spread(plan.get("previous", 0), 7, 13) + spread(plan.get("old", 0), 15, 29)
            )
            views = [
                CocktailView(cocktail=cocktail, day=today - timedelta(days=day), visitor=f"{VIEW_PREFIX}{cocktail.id}-{n}")
                for n, day in enumerate(days)
            ]
            before = CocktailView.objects.count()
            CocktailView.objects.bulk_create(views, ignore_conflicts=True)
            made_views += CocktailView.objects.count() - before
        self.stdout.write(self.style.SUCCESS(f"Dodano: {made_reviews} opinii, {made_views} wyświetleń. Pominięte (brak w bazie): {skipped or 'brak'}."))

    def remove(self):
        reviews = Review.objects.filter(author__username__startswith=USER_PREFIX).delete()[0]
        reviews += Review.objects.filter(author__isnull=True, text=DELETED_TEXT).delete()[0]
        views = CocktailView.objects.filter(visitor__startswith=VIEW_PREFIX).delete()[0]
        users = User.objects.filter(username__startswith=USER_PREFIX).delete()[0]
        self.stdout.write(self.style.SUCCESS(f"Usunięto: {reviews} opinii, {views} wyświetleń, {users} kont demonstracyjnych."))
