"""API panelu administratora (/api/v1/admin/...). Dostęp: admin, staff i owner (accounts.policy.is_admin_level).

Zasady ról są w accounts/policy.py i tych samych używa panel /admin/ (CMS), więc oba wejścia zachowują się tak samo.
Tu jest tylko to, czego CMS nie ma w wygodnej postaci dla frontendu: lista kont ze zmianą roli, kolejka zgłoszonych opinii,
masowe nadawanie znaczka i liczby na pulpit.
"""
from datetime import timedelta

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, mixins, serializers, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts import policy
from accounts.models import Role, User

from .filters import MAX_IDS
from .models import Cocktail, CocktailView, Review, ReviewReport
from .pagination import Pagination
from .serializers import CocktailRefSerializer
from .services import set_verified


class IsAdminLevel(BasePermission):
    message = "Ta część jest tylko dla administratorów."

    def has_permission(self, request, view):
        return policy.is_admin_level(request.user)


# ---------- konta i role ----------

class AdminUserSerializer(serializers.ModelSerializer):
    recipes = serializers.IntegerField(source="n_recipes", read_only=True, help_text="Ile koktajli dodało konto.")
    reviews = serializers.IntegerField(source="n_reviews", read_only=True, help_text="Ile opinii wystawiło konto.")
    reports = serializers.IntegerField(source="n_reports", read_only=True, help_text="Ile zgłoszeń dotyczy opinii tego konta.")
    can_edit = serializers.SerializerMethodField(help_text="Czy ja mogę zmieniać to konto (reguła: tylko konta niższe od mojego).")
    assignable_roles = serializers.SerializerMethodField(help_text="Role, które ja mogę temu kontu nadać (puste, gdy can_edit = false).")

    class Meta:
        model = User
        fields = ["id", "username", "role", "is_active", "date_joined", "recipes", "reviews", "reports", "can_edit", "assignable_roles"]
        read_only_fields = [f for f in fields if f != "role"]  # przez API zmienia się wyłącznie rola

    def get_can_edit(self, user) -> bool:
        return policy.can_manage(self.context["request"].user, user)

    def get_assignable_roles(self, user) -> list[str]:
        actor = self.context["request"].user
        return policy.grantable_roles(actor) if policy.can_manage(actor, user) else []


class AdminUserViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Lista kont (najnowsze pierwsze) i zmiana roli. Parametry: `search` (fragment nazwy), `role`."""

    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminLevel]
    pagination_class = Pagination
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # generator dokumentacji nie ma żądania z parametrami
            return User.objects.none()
        qs = User.objects.annotate(
            # nazwy n_*: "reviews" i "cocktails" to już nazwy relacji w modelu, więc adnotacja o takiej nazwie by się z nimi zderzyła
            n_recipes=Count("cocktails", distinct=True),
            n_reviews=Count("reviews", distinct=True),
            n_reports=Count("reviews__reports", distinct=True),
        ).order_by("-date_joined", "-id")
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(username__icontains=search[:150])
        role = self.request.query_params.get("role")
        if role:
            if role not in Role.values:
                raise ValidationError({"role": ["Nieznana rola."]})
            qs = qs.filter(role=role)
        return qs

    def perform_update(self, serializer):
        actor, target = self.request.user, serializer.instance
        if not policy.can_manage(actor, target):
            raise PermissionDenied("Możesz zmieniać tylko konta o niższej randze niż twoja (nie swoje i nie równe tobie).")
        role = serializer.validated_data.get("role")
        if role is not None and not policy.can_assign_role(actor, target, role):
            raise PermissionDenied("Możesz nadać tylko rolę niższą od własnej.")
        serializer.save()


# ---------- zgłoszone opinie ----------

class ReportSerializer(serializers.ModelSerializer):
    reporter = serializers.SerializerMethodField()

    class Meta:
        model = ReviewReport
        fields = ["reporter", "reason", "created_at"]

    def get_reporter(self, report) -> str | None:
        return report.reporter.username if report.reporter_id else None


class ReportedReviewSerializer(serializers.ModelSerializer):
    author_username = serializers.SerializerMethodField()
    cocktail = CocktailRefSerializer(read_only=True)
    report_count = serializers.IntegerField(read_only=True)
    reports = ReportSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = ["id", "rating", "text", "created_at", "author_username", "cocktail", "report_count", "reports"]

    def get_author_username(self, review) -> str | None:
        return review.author.username if review.author_id else None


class ReportedReviews(generics.ListAPIView):
    """Opinie, które ktoś zgłosił: najwięcej zgłoszeń pierwsze. Rozpatrzenie: usuń opinię (DELETE /reviews/{id}/) albo odrzuć zgłoszenia."""

    serializer_class = ReportedReviewSerializer
    permission_classes = [IsAdminLevel]
    pagination_class = Pagination

    def get_queryset(self):
        return (
            Review.objects.annotate(report_count=Count("reports"))
            .filter(report_count__gt=0)
            .select_related("cocktail", "author")
            .prefetch_related("reports__reporter")
            .order_by("-report_count", "-created_at", "-id")
        )


class DismissReports(APIView):
    """Odrzucenie zgłoszeń: zgłoszenia znikają, opinia zostaje."""

    permission_classes = [IsAdminLevel]

    @extend_schema(request=None, responses={204: None})
    def post(self, request, review_id):
        review = get_object_or_404(Review, pk=review_id)
        ReviewReport.objects.filter(review=review).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------- znaczek ----------

class VerifySerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(min_value=1), min_length=1, max_length=MAX_IDS, help_text=f"Id koktajli (najwyżej {MAX_IDS}).")
    verified = serializers.BooleanField(help_text="true = nadaj znaczek, false = zdejmij.")


class VerifyCocktails(APIView):
    """Masowe nadawanie i zdejmowanie znaczka "zweryfikowany" (jak akcje w CMS). Nieistniejące id są pomijane."""

    permission_classes = [IsAdminLevel]

    @extend_schema(request=VerifySerializer, responses={200: {"type": "object", "properties": {"updated": {"type": "integer"}}}})
    def post(self, request):
        body = VerifySerializer(data=request.data)
        body.is_valid(raise_exception=True)
        updated = set_verified(Cocktail.objects.filter(pk__in=body.validated_data["ids"]), body.validated_data["verified"])
        return Response({"updated": updated})


# ---------- pulpit ----------

class StatsSerializer(serializers.Serializer):
    cocktails = serializers.IntegerField()
    unverified = serializers.IntegerField(help_text="Koktajle bez znaczka (także z importu).")
    pending_recipes = serializers.IntegerField(help_text="Przepisy użytkowników bez znaczka: to czeka na decyzję.")
    without_image = serializers.IntegerField()
    users = serializers.IntegerField()
    reported_reviews = serializers.IntegerField(help_text="Opinie z co najmniej jednym zgłoszeniem.")
    views_7d = serializers.IntegerField()
    views_by_day = serializers.ListField(child=serializers.DictField(), help_text="7 dni od najstarszego: {day, views}.")
    top_cocktail = serializers.DictField(allow_null=True, help_text="Najczęściej oglądany z 30 dni: {id, name, image_url, views_30d}.")
    new_users = serializers.ListField(child=serializers.DictField(), help_text="4 najnowsze konta: {username, role, date_joined}.")


class AdminStats(APIView):
    permission_classes = [IsAdminLevel]

    @extend_schema(responses=StatsSerializer)
    def get(self, request):
        today = timezone.localdate()
        first = today - timedelta(days=6)
        per_day = dict(CocktailView.objects.filter(day__gte=first).values("day").annotate(n=Count("id")).values_list("day", "n"))
        by_day = [{"day": first + timedelta(days=i), "views": per_day.get(first + timedelta(days=i), 0)} for i in range(7)]
        top = Cocktail.objects.with_stats().order_by("-views_30d", "name", "id").first()
        user_made = Cocktail.objects.exclude(author__isnull=True, author_name="")
        data = {
            "cocktails": Cocktail.objects.count(),
            "unverified": Cocktail.objects.filter(verified=False).count(),
            "pending_recipes": user_made.filter(verified=False).count(),
            "without_image": Cocktail.objects.filter(image_url="").count(),
            "users": User.objects.count(),
            "reported_reviews": Review.objects.annotate(n=Count("reports")).filter(n__gt=0).count(),
            "views_7d": sum(d["views"] for d in by_day),
            "views_by_day": by_day,
            "top_cocktail": None if top is None else {"id": top.id, "name": top.name, "image_url": top.image_url, "views_30d": top.views_30d},
            "new_users": [{"username": u.username, "role": u.role, "date_joined": u.date_joined} for u in User.objects.order_by("-date_joined", "-id")[:4]],
        }
        return Response(data)
