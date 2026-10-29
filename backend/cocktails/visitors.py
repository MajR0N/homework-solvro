import hmac
import ipaddress

from django.conf import settings
from rest_framework.throttling import BaseThrottle


def visitor_id(request, cocktail_id, day):
    """Skrót identyfikujący odwiedzającego tylko po sieci IP (nigdy po ciasteczkach ani przeglądarce).

    - IPv6 liczymy po prefiksie /64: jedna osoba ma zwykle całą taką sieć i inaczej mogłaby zmieniać adres bez końca.
    - Skrót zawiera dzień i koktajl, więc nie da się nim śledzić ani odwrócić go do adresu.
    - Adres bierze DRF z REMOTE_ADDR albo (przy NUM_PROXIES > 0) z odpowiedniego miejsca w X-Forwarded-For.
    """
    raw = BaseThrottle().get_ident(request)
    try:
        ip = ipaddress.ip_address(raw)
        if ip.version == 6 and ip.ipv4_mapped:
            ip = ip.ipv4_mapped  # ::ffff:1.2.3.4 to ten sam odwiedzający co 1.2.3.4
        network = ipaddress.ip_network(f"{ip}/64", strict=False) if ip.version == 6 else ip
    except ValueError:
        network = raw  # brak adresu ("unknown"): wszyscy bez adresu liczą się jako jeden odwiedzający
    message = f"{day}|{cocktail_id}|{network}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), message, "sha256").hexdigest()
