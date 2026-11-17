from django.urls import re_path

from . import views

# Trailing slash optional: requests may arrive through proxies/rewrites (nginx, Vercel)
# that normalise it, and a 301 redirect would leave the gateway's origin.
urlpatterns = [
    re_path(r"^summary/?$", views.SummaryView.as_view(), name="stats-summary"),
    re_path(r"^by-category/?$", views.ByCategoryView.as_view(), name="stats-by-category"),
    re_path(r"^top-locations/?$", views.TopLocationsView.as_view(), name="stats-top-locations"),
    re_path(r"^timeline/?$", views.TimelineView.as_view(), name="stats-timeline"),
    re_path(r"^me/?$", views.MeView.as_view(), name="stats-me"),
]
