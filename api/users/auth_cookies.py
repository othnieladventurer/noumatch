from django.conf import settings


def _cookie_options(max_age=None):
    options = {
        "httponly": getattr(settings, "AUTH_COOKIE_HTTPONLY", True),
        "secure": getattr(settings, "AUTH_COOKIE_SECURE", True),
        "samesite": getattr(settings, "AUTH_COOKIE_SAMESITE", "Lax"),
        "path": getattr(settings, "AUTH_COOKIE_PATH", "/"),
    }
    domain = getattr(settings, "AUTH_COOKIE_DOMAIN", None)
    if domain:
        options["domain"] = domain
    if max_age is not None:
        options["max_age"] = max_age
    return options


def _cookie_names(admin=False):
    if admin:
        return (
            getattr(settings, "AUTH_ADMIN_ACCESS_COOKIE_NAME", "nm_admin_access"),
            getattr(settings, "AUTH_ADMIN_REFRESH_COOKIE_NAME", "nm_admin_refresh"),
        )
    return (
        getattr(settings, "AUTH_ACCESS_COOKIE_NAME", "nm_access"),
        getattr(settings, "AUTH_REFRESH_COOKIE_NAME", "nm_refresh"),
    )


def set_auth_cookies(response, access_token, refresh_token=None, admin=False):
    access_name, refresh_name = _cookie_names(admin=admin)
    access_seconds = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_seconds = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    response.set_cookie(access_name, access_token, **_cookie_options(max_age=access_seconds))
    if refresh_token:
        response.set_cookie(refresh_name, refresh_token, **_cookie_options(max_age=refresh_seconds))
    return response


def clear_auth_cookies(response, admin=False):
    access_name, refresh_name = _cookie_names(admin=admin)
    kwargs = _cookie_options()
    response.delete_cookie(access_name, path=kwargs.get("path", "/"), domain=kwargs.get("domain"))
    response.delete_cookie(refresh_name, path=kwargs.get("path", "/"), domain=kwargs.get("domain"))
    return response


def get_refresh_token_from_request(request, admin=False):
    refresh_in_body = request.data.get("refresh")
    if refresh_in_body:
        return refresh_in_body
    _, refresh_name = _cookie_names(admin=admin)
    return request.COOKIES.get(refresh_name)
