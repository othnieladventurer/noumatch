from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        is_admin_route = request.path.startswith("/api/noumatch-admin/")

        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None
            try:
                validated_token = self.get_validated_token(raw_token)
                user = self.get_user(validated_token)
                # Prevent non-staff bearer tokens from taking over admin routes.
                if is_admin_route and not getattr(user, "is_staff", False):
                    raise InvalidToken("Non-staff token cannot access admin route")
                return user, validated_token
            except (InvalidToken, TokenError):
                # Fallback to cookie-based auth when a stale/invalid Authorization
                # header is present (for compatibility during token-storage migration).
                pass

        if is_admin_route:
            cookie_names = [
                getattr(settings, "AUTH_ADMIN_ACCESS_COOKIE_NAME", "nm_admin_access"),
            ]
        else:
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
