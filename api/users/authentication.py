from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None
            try:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token
            except (InvalidToken, TokenError):
                # Fallback to cookie-based auth when a stale/invalid Authorization
                # header is present (for compatibility during token-storage migration).
                pass

        cookie_names = [
            getattr(settings, "AUTH_ACCESS_COOKIE_NAME", "nm_access"),
            getattr(settings, "AUTH_ADMIN_ACCESS_COOKIE_NAME", "nm_admin_access"),
        ]
        raw_token = None
        for name in cookie_names:
            raw_token = request.COOKIES.get(name)
            if raw_token:
                break

        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
