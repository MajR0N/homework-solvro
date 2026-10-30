"""Reguły ról w jednym miejscu: używa ich i panel /admin/ (CMS), i API panelu administratora, więc nie mogą się rozjechać.

Rangi: user < admin < staff < owner (patrz accounts/models.py). Trzy zasady:
1. do panelu wchodzą admin, staff i owner,
2. zarządzać można tylko kontami o NIŻSZEJ randze niż własna (siebie i równych sobie nie),
3. nadać można tylko rolę NIŻSZĄ od własnej (więc nikt nie awansuje siebie ani nikogo na swój poziom, a ownera nie da się nadać wcale).

Funkcje nie dotykają bazy: biorą obiekty z polami `role`, `rank` i `is_active`.
"""
from .models import RANK, Role


def is_admin_level(user) -> bool:
    """Wejście do panelu: aktywne konto admin, staff albo owner."""
    return bool(getattr(user, "is_authenticated", False)) and user.is_active and user.rank >= RANK[Role.ADMIN]


def can_manage(actor, target) -> bool:
    """Czy `actor` może zmieniać to konto. Rzuca na bok siebie (ta sama ranga) i wyższych."""
    return target.rank < actor.rank


def grantable_roles(actor) -> list[str]:
    """Role, które `actor` może komuś nadać (od najniższej)."""
    return [role for role in Role.values if RANK[role] < actor.rank]


def can_assign_role(actor, target, role: str) -> bool:
    """Czy `actor` może ustawić `target` rolę `role`: konto musi być do zarządzania, a rola do nadania."""
    return can_manage(actor, target) and role in grantable_roles(actor)
