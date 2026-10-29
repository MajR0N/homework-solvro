from rest_framework.permissions import SAFE_METHODS
from rest_framework.throttling import SimpleRateThrottle


class WriteRateThrottle(SimpleRateThrottle):
    """Ostrzejszy limit tylko dla zapisów (POST, PUT, PATCH, DELETE), wspólny dla wszystkich endpointów.

    Zalogowany jest liczony po koncie, a niezalogowany po adresie IP. Odczyty (GET) przechodzą bez liczenia.
    """

    scope = "write"

    def allow_request(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user and request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
