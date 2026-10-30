from .models import Cocktail


def set_verified(queryset, verified: bool) -> int:
    """Nadaje albo zdejmuje znaczek "zweryfikowany" i zwraca liczbę zmienionych koktajli.

    Znaczek nadaje wyłącznie admin wzwyż (CMS i API panelu), nigdy autor: zwykłe API koktajli go nie przyjmuje.
    """
    return queryset.update(verified=verified)
