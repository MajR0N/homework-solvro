from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, CocktailViewSet

router = DefaultRouter()
router.register("cocktails", CocktailViewSet, basename="cocktail")
router.register("categories", CategoryViewSet, basename="category")

urlpatterns = router.urls
