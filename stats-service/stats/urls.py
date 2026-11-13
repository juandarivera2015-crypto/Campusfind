from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.SummaryView.as_view(), name="stats-summary"),
    path("by-category/", views.ByCategoryView.as_view(), name="stats-by-category"),
    path("top-locations/", views.TopLocationsView.as_view(), name="stats-top-locations"),
    path("timeline/", views.TimelineView.as_view(), name="stats-timeline"),
    path("me/", views.MeView.as_view(), name="stats-me"),
]
