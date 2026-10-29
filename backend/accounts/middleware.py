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
                return HttpResponse("Zbyt wiele prób logowania. Spróbuj za minutę.", status=429, content_type="text/plain; charset=utf-8", headers={"Retry-After": "60"})
        return self.get_response(request)


class BodySizeLimit:
    """Odrzuca zbyt duże żądania (413) zanim ktokolwiek zacznie je czytać.

    Wbudowany DATA_UPLOAD_MAX_MEMORY_SIZE nie chroni tu wystarczająco: DRF czyta ciało żądania własną drogą.
    Sprawdzamy nagłówek Content-Length; żądanie bez niego (np. chunked) przepuszcza serwer aplikacji, który ma własne limity.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            size = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            size = 0
        if size > settings.MAX_REQUEST_BODY_BYTES:
            return HttpResponse("Żądanie jest za duże.", status=413, content_type="text/plain; charset=utf-8")
        return self.get_response(request)
