"""
CampusFind statistics microservice (Django + Django ORM).

Reads the same relational database the Express API writes to, through
unmanaged models (the schema is owned by the Sequelize migrations).
"""
import os
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from .secrets import read_secret

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() == "true"
SECRET_KEY = read_secret("DJANGO_SECRET_KEY") or ("dev-insecure-key" if DEBUG else None)
if not SECRET_KEY:
    raise RuntimeError("DJANGO_SECRET_KEY (or DJANGO_SECRET_KEY_FILE) must be set")

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,stats").split(",") if h.strip()]
if os.environ.get("VERCEL"):
    ALLOWED_HOSTS.append(".vercel.app")  # *.vercel.app deployment URLs

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "django_prometheus",
    "stats",
]

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
}]

# ── Database (Django ORM) ──
def _database_from_url(url: str) -> dict:
    """Parses DATABASE_URL (Neon Postgres on Vercel, or mysql://) into Django settings."""
    u = urlparse(url)
    query = {k: v[0] for k, v in parse_qs(u.query).items()}
    is_pg = u.scheme.startswith("postg")
    db = {
        "ENGINE": "django_prometheus.db.backends.postgresql" if is_pg else "django_prometheus.db.backends.mysql",
        "NAME": u.path.lstrip("/"),
        "USER": unquote(u.username or ""),
        "PASSWORD": unquote(u.password or ""),
        "HOST": u.hostname or "",
        "PORT": str(u.port or (5432 if is_pg else 3306)),
        # Serverless (Vercel): don't keep connections between invocations
        "CONN_MAX_AGE": 0 if os.environ.get("VERCEL") else 60,
        "OPTIONS": {},
    }
    if is_pg:
        # Neon's pooled endpoint (PgBouncer, transaction mode) does not support server-side cursors
        db["DISABLE_SERVER_SIDE_CURSORS"] = True
        if query.get("sslmode"):
            db["OPTIONS"]["sslmode"] = query["sslmode"]
    return db


if os.environ.get("DATABASE_URL"):
    DATABASES = {"default": _database_from_url(os.environ["DATABASE_URL"])}
elif os.environ.get("DB_ENGINE", "mysql") == "sqlite":
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "test.sqlite3"}}
else:
    DATABASES = {
        "default": {
            # Wraps the MySQL backend to export query metrics to Prometheus
            "ENGINE": "django_prometheus.db.backends.mysql",
            "NAME": os.environ.get("DB_NAME", "campusfind"),
            "USER": os.environ.get("DB_USER", "root"),
            "PASSWORD": read_secret("DB_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
            "PORT": os.environ.get("DB_PORT", "3306"),
            "OPTIONS": {"charset": "utf8mb4", **({"ssl_mode": "REQUIRED"} if os.environ.get("DB_SSL") == "true" else {})},
            "CONN_MAX_AGE": 60,
        }
    }

TEST_RUNNER = "stats.test_runner.UnmanagedModelTestRunner"
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
USE_TZ = False
TIME_ZONE = "UTC"
LANGUAGE_CODE = "es"  # DRF/Django error messages in Spanish
STATIC_URL = "static/"
APPEND_SLASH = False  # see stats/urls.py
STATIC_ROOT = BASE_DIR / "staticfiles"

# ── JWT issued by the Express OAuth 2.1 server ──
JWT = {
    "SECRET": read_secret("JWT_SECRET", "dev-only-insecure-secret-change-me-please-0000"),
    "ISSUER": os.environ.get("JWT_ISSUER", "campusfind-auth"),
    "AUDIENCE": os.environ.get("JWT_AUDIENCE", "campusfind-api"),
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["stats.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle", "rest_framework.throttling.UserRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": "120/min", "user": "300/min"},
    "UNAUTHENTICATED_USER": None,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "CampusFind Stats API",
    "DESCRIPTION": "Statistics microservice (Django). Authenticated endpoints accept the JWT issued by /oauth/token.",
    "VERSION": "1.0.0",
    "OAS_VERSION": "3.0.3",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ── Security hardening ──
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
}
