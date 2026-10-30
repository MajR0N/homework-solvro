from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    CocktailReviews,
    CocktailViewCount,
    CocktailViewSet,
    GlassList,
    IngredientViewSet,
    MyActivity,
    MyReviews,
    MyStats,
    ReviewDetail,
    ReviewReportCreate,
)

router = DefaultRouter()
router.register("cocktails", CocktailViewSet, basename="cocktail")
router.register("ingredients", IngredientViewSet, basename="ingredient")
router.register("categories", CategoryViewSet, basename="category")

urlpatterns = router.urls + [
    path("cocktails/<int:cocktail_id>/reviews/", CocktailReviews.as_view(), name="cocktail-reviews"),
    path("cocktails/<int:cocktail_id>/views/", CocktailViewCount.as_view(), name="cocktail-views"),
    path("glasses/", GlassList.as_view(), name="glasses"),
    path("me/reviews/", MyReviews.as_view(), name="my-reviews"),
    path("me/activity/", MyActivity.as_view(), name="my-activity"),
    path("me/stats/", MyStats.as_view(), name="my-stats"),
    path("reviews/<int:pk>/", ReviewDetail.as_view(), name="review-detail"),
    path("reviews/<int:pk>/report/", ReviewReportCreate.as_view(), name="review-report"),
]
