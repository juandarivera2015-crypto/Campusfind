"""
DRF authentication backend that validates the JWT access tokens issued by the
Express OAuth 2.1 server (resource-server role). Only HS256 is accepted and the
issuer/audience/expiry claims are enforced.
"""
from dataclasses import dataclass, field

import jwt
from django.conf import settings
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication, get_authorization_header


@dataclass
class TokenUser:
    id: int
    name: str = ""
    email: str = ""
    scopes: list[str] = field(default_factory=list)
    is_authenticated: bool = True
    is_anonymous: bool = False

    @property
    def pk(self) -> int:  # used by DRF's UserRateThrottle cache key
        return self.id

    def has_scope(self, scope: str) -> bool:
        return scope in self.scopes


class JWTAuthentication(BaseAuthentication):
    keyword = b"bearer"

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts or parts[0].lower() != self.keyword:
            return None
        if len(parts) != 2:
            raise exceptions.AuthenticationFailed("Cabecera Authorization no válida")
        token = parts[1].decode("ascii", errors="ignore")
        cfg = settings.JWT
        try:
            claims = jwt.decode(
                token,
                cfg["SECRET"],
                algorithms=["HS256"],
                issuer=cfg["ISSUER"],
                audience=cfg["AUDIENCE"],
                options={"require": ["exp", "sub", "iss", "aud"]},
            )
        except jwt.PyJWTError as exc:
            raise exceptions.AuthenticationFailed("Tu sesión expiró o no es válida. Inicia sesión de nuevo.") from exc
        user = TokenUser(
            id=int(claims["sub"]),
            name=claims.get("name", ""),
            email=claims.get("email", ""),
            scopes=str(claims.get("scope", "")).split(),
        )
        return user, claims

    def authenticate_header(self, request):
        return 'Bearer realm="campusfind-stats"'
