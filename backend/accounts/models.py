from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.db import models


class Role(models.TextChoices):
    # kolejność = ranga: każdy może zarządzać tylko kontami niżej od siebie
    USER = "user"
    ADMIN = "admin"
    STAFF = "staff"
    OWNER = "owner"


RANK = {role: rank for rank, role in enumerate(Role.values)}


class UserManager(DjangoUserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        # konto z `manage.py createsuperuser` jest właścicielem
        extra_fields.setdefault("role", Role.OWNER)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)

    objects = UserManager()

    @property
    def rank(self):
        return RANK[self.role]

    def save(self, *args, **kwargs):
        # Rola jest jedynym źródłem prawdy; flagi Django wynikają z niej, więc nie mogą się rozjechać.
        # is_staff = wejście do panelu /admin/ (CMS); is_superuser = tylko właściciel.
        self.is_staff = self.rank >= RANK[Role.ADMIN]
        self.is_superuser = self.role == Role.OWNER
        super().save(*args, **kwargs)
