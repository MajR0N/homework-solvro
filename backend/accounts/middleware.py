from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse
from rest_framework.throttling import BaseThrottle

LOGIN_PATH = "/admin/login/"


class AdminLoginLimit:
    """Limit prób logowania do panelu /admin/ na adres IP (panel jest poza DRF, więc nie obejmują go jego limity).

    Okno stałe: pierwsza próba otwiera minutę, a po przekroczeniu limitu odpowiadamy 429 do końca tej minuty.
    Liczymy każdą próbę (POST), także udaną, bo odróżnienie ich wymagałoby czytania odpowiedzi logowania.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "POST" and request.path == LOGIN_PATH:
            key = f"admin-login:{BaseThrottle().get_ident(request)}"
            cache.add(key, 0, 60)  # tworzy licznik tylko, jeśli go nie ma (i ustawia 60 s)
            if cache.incr(key) > settings.ADMIN_LOGIN_ATTEMPTS_PER_MINUTE:
                return HttpResponse("Zbyt wiele prób logowania. Spróbuj za minutę.", status=429, headers={"Retry-After": "60"})
        return self.get_response(request)
