import logging

from django.conf import settings
from django.core.cache import cache
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle, ScopedRateThrottle
from rest_framework_simplejwt.views import TokenBlacklistView, TokenObtainPairView, TokenRefreshView

from .models import User
from .serializers import MeSerializer, RegisterSerializer

security_log = logging.getLogger("security")


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"  # limit prób na IP (stawka w settings.py), przeciw zgadywaniu haseł i masowym kontom


class LoginView(TokenObtainPairView):
    """Logowanie z blokadą po serii błędów.

    Po LOGIN_MAX_FAILURES nieudanych próbach dla danej nazwy użytkownika (z dowolnego IP) kolejne logowania dostają 429
    na LOGIN_LOCKOUT_SECONDS, nawet z poprawnym hasłem. Dotyczy też nazw, które nie istnieją, więc blokada nie zdradza,
    które konta są prawdziwe. Limit na IP (10 na minutę) nie wystarcza, bo botnet może zgadywać hasło jednego konta z wielu adresów.
    Cena: ktoś może celowo zablokować cudze konto na kilkanaście minut (tak działa każda blokada).
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @staticmethod
    def _key(request):
        try:
            name = str(request.data.get("username", ""))
        except Exception:  # np. ciało żądania nie jest obiektem JSON
            name = ""
        return "login-fail:" + name[:150].casefold()  # wielkość liter nie może pozwolić na obejście licznika

    def post(self, request, *args, **kwargs):
        if cache.get(self._key(request), 0) >= settings.LOGIN_MAX_FAILURES:
            security_log.warning("logowanie zablokowane: za duzo nieudanych prob ip=%s", BaseThrottle().get_ident(request))
            minutes = settings.LOGIN_LOCKOUT_SECONDS // 60
            return Response(
                {"detail": f"Zbyt wiele nieudanych prób logowania. Spróbuj za {minutes} minut."},
                status=429,
                headers={"Retry-After": str(settings.LOGIN_LOCKOUT_SECONDS)},
            )
        return super().post(request, *args, **kwargs)

    def finalize_response(self, request, response, *args, **kwargs):
        # tu trafia ostateczna odpowiedź także wtedy, gdy logowanie rzuciło wyjątek (zła nazwa lub hasło = 401)
        response = super().finalize_response(request, response, *args, **kwargs)
        key = self._key(request)
        ip = BaseThrottle().get_ident(request)
        if response.status_code == 200:
            cache.delete(key)  # udane logowanie zeruje licznik
            security_log.info("logowanie udane konto=%s ip=%s", User.objects.filter(username__iexact=key.removeprefix("login-fail:")).values_list("pk", flat=True).first(), ip)
        elif response.status_code == 401:
            cache.add(key, 0, settings.LOGIN_LOCKOUT_SECONDS)  # okno liczymy od pierwszego błędu
            cache.incr(key)
            # Nie zapisujemy wpisanej nazwy ani hasła: pomyłkowo wklejone hasło wylądowałoby w logach
            security_log.warning("logowanie nieudane ip=%s", ip)
        return response


class MeView(generics.RetrieveAPIView):
    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class RefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refresh"


class LogoutView(TokenBlacklistView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refresh"
