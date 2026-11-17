from django.db import connection
from django.http import JsonResponse
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def live(_request):
    return JsonResponse({"status": "ok"})


def ready(_request):
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
        return JsonResponse({"status": "ready", "db": "up"})
    except Exception:  # noqa: BLE001
        return JsonResponse({"status": "unavailable", "db": "down"}, status=503)


urlpatterns = [
    re_path(r"^api/stats/schema/?$", SpectacularAPIView.as_view(), name="schema"),
    re_path(r"^api/stats/docs/?$", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/stats/", include("stats.urls")),
    path("health/live", live),
    path("health/ready", ready),
    path("", include("django_prometheus.urls")),  # exposes /metrics
]
