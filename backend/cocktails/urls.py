from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, CocktailViewSet, IngredientViewSet

router = DefaultRouter()
router.register("cocktails", CocktailViewSet, basename="cocktail")
router.register("ingredients", IngredientViewSet, basename="ingredient")
router.register("categories", CategoryViewSet, basename="category")

urlpatterns = router.urls
