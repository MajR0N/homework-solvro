from rest_framework.routers import DefaultRouter

from .views import CocktailViewSet

router = DefaultRouter()
router.register("cocktails", CocktailViewSet, basename="cocktail")

urlpatterns = router.urls
