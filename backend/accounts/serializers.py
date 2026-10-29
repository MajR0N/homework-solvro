from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, max_length=128, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["id", "username", "password"]  # bez "role": rejestracja zawsze tworzy zwykłego użytkownika

    def validate_username(self, value):
        # "Anna" i "anna" wyglądałyby jak ta sama osoba (nazwa jest publiczna), więc traktujemy je jako zajęte
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ta nazwa użytkownika jest zajęta.")
        return value

    def validate(self, attrs):
        # reguły z AUTH_PASSWORD_VALIDATORS (długość, popularne hasła, same cyfry, podobieństwo do nazwy użytkownika);
        # podobieństwo da się sprawdzić tylko z obiektem użytkownika, dlatego walidujemy tu, a nie w polu
        try:
            validate_password(attrs["password"], user=User(username=attrs["username"]))
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)  # create_user hashuje hasło


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "role"]
