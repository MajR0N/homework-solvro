import logging

from rest_framework.throttling import BaseThrottle
from rest_framework.views import exception_handler

security_log = logging.getLogger("security")


def security_exception_handler(exc, context):
    """Domyślna obsługa błędów DRF plus wpis w logu bezpieczeństwa dla odmów (403) i przekroczonych limitów (429).

    401 (brak logowania) pomijamy, bo to codzienność i zalałoby log. Nigdy nie logujemy treści żądania.
    """
    response = exception_handler(exc, context)
    if response is not None and response.status_code in (403, 429):
        request = context["request"]
        user = request.user.pk if request.user and request.user.is_authenticated else "anonim"
        security_log.warning(
            "%s %s %s konto=%s ip=%s", response.status_code, request.method, request.path, user, BaseThrottle().get_ident(request)
        )
    return response
