import os

from django.contrib.auth.hashers import Argon2PasswordHasher
from django.core.exceptions import ImproperlyConfigured

# Dolne granice: żeby literówka w zmiennej środowiskowej nie osłabiła po cichu hashowania haseł.
# Wartości z zaleceń OWASP dla Argon2id (najmniejsza dopuszczona kombinacja to 19 MiB pamięci i 2 przebiegi przy 1 wątku).
MIN_MEMORY_KIB = 19 * 1024
MIN_TIME_COST = 1
MIN_PARALLELISM = 1


def _setting(name, default, minimum):
    try:
        value = int(os.environ.get(name, default))
    except ValueError:
        raise ImproperlyConfigured(f"{name} musi być liczbą całkowitą")
    if value < minimum:
        raise ImproperlyConfigured(f"{name} nie może być mniejsze niż {minimum}")
    return value


class TunedArgon2PasswordHasher(Argon2PasswordHasher):
    """Argon2id z parametrami zależnymi od hosta (domyślne Django: 100 MiB, 8 wątków, to dużo dla małego serwera).

    Dobór: jedno hashowanie powinno trwać ok. 0,25 do 0,5 s, a (liczba procesów serwera) x (pamięć) mieści się w RAM.
    Zmiana parametrów nie psuje istniejących haseł: hash zawiera swoje parametry, więc stare nadal się weryfikują,
    a przy następnym logowaniu są przeliczane na nowe (Django sprawdza to samo przez must_update).
    """

    time_cost = _setting("ARGON2_TIME_COST", 3, MIN_TIME_COST)
    memory_cost = _setting("ARGON2_MEMORY_KIB", 64 * 1024, MIN_MEMORY_KIB)  # w KiB: 65536 = 64 MiB
    parallelism = _setting("ARGON2_PARALLELISM", 2, MIN_PARALLELISM)
