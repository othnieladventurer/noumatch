from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.http import JsonResponse
from users.models import User


class APIRateLimitMiddleware(MiddlewareMixin):
    """
    Lightweight global API backstop.

    DRF throttles still handle endpoint-specific limits, but this protects any
    API view that does not declare a throttle explicitly and keeps anonymous
    traffic under control.
    """

    DEFAULT_ANON_LIMIT = (60, 60)  # 60 requests per 60 seconds
    DEFAULT_AUTH_LIMIT = (240, 60)  # 240 requests per 60 seconds

    PATH_LIMITS = (
        ("/api/users/login/", (10, 60)),
        ("/api/users/register/", (5, 60)),
        ("/api/users/resend-otp/", (10, 3600)),
        ("/api/users/verify-otp/", (20, 3600)),
        ("/api/users/forgot-password/", (5, 3600)),
        ("/api/users/reset-password/", (5, 3600)),
        ("/api/users/check-email/", (30, 60)),
        ("/api/users/check-can-register/", (30, 60)),
        ("/api/waitlist/join/", (10, 3600)),
        ("/api/noumatch-admin/admin_login/", (10, 60)),
        ("/api/noumatch-admin/login/", (10, 60)),
        ("/api/chat/messages/", (90, 60)),
        ("/api/chat/conversations/", (120, 60)),
        ("/api/users/heartbeat/", (120, 60)),
    )

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")

    def _resolve_limit(self, path, is_authenticated):
        for prefix, limit in self.PATH_LIMITS:
            if path.startswith(prefix):
                return limit
        return self.DEFAULT_AUTH_LIMIT if is_authenticated else self.DEFAULT_ANON_LIMIT

    def process_request(self, request):
        path = request.path or ""
        if not path.startswith("/api/"):
            return None

        if request.method == "OPTIONS":
            return None

        if request.method in {"GET", "HEAD"} and path.startswith("/api/static/"):
            return None

        limit, window_seconds = self._resolve_limit(path, bool(getattr(request, "user", None) and request.user.is_authenticated))
        if limit <= 0:
            return None

        identifier = f"user:{request.user.id}" if getattr(request, "user", None) and request.user.is_authenticated else f"ip:{self._get_client_ip(request)}"
        bucket = int(timezone.now().timestamp() // window_seconds)
        cache_key = f"api_rate_limit:{path}:{identifier}:{bucket}"

        current = cache.get(cache_key)
        if current is None:
            cache.set(cache_key, 1, timeout=window_seconds + 5)
            return None

        if current >= limit:
            response = JsonResponse(
                {"detail": "Rate limit exceeded. Please slow down and try again shortly."},
                status=429,
            )
            response["Retry-After"] = str(window_seconds)
            return response

        cache.incr(cache_key)
        return None

class UserActivityMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        try:
            if request.user.is_authenticated:
                # Only update if it's been more than 1 minute since last update
                if not request.user.last_activity or \
                   (timezone.now() - request.user.last_activity).seconds > 60:
                    try:
                        User.objects.filter(id=request.user.id).update(
                            last_activity=timezone.now(),
                            is_online=True
                        )
                    except Exception:
                        # Never break request/response flow because of a best-effort activity heartbeat.
                        pass
        except Exception:
            # Middleware should be transparent even if auth/db layers are unstable.
            pass
        return response



