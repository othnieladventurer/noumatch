import logging
"""
Django settings for api project.
"""
import dj_database_url
import os
from pathlib import Path
from decouple import config
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent
ENVIRONMENT = config("ENVIRONMENT", default="development").lower()


def parse_csv_env(key):
    value = config(key, default="")
    return [item.strip() for item in value.split(",") if item.strip()]


def env_bool(key, default=False):
    return config(key, default=default, cast=bool)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config(
    "DJANGO_SECRET_KEY",
    default=config(
        "SECRET_KEY",
        default="django-insecure-dev-only-change-me",
    ),
)
if ENVIRONMENT in {"production", "staging"} and SECRET_KEY.startswith("django-insecure"):
    if env_bool("STRICT_SECURITY_CHECKS", default=False):
        raise RuntimeError("Set a non-default DJANGO_SECRET_KEY before launch.")
    logging.warning("Using weak/default SECRET_KEY in %s. Set DJANGO_SECRET_KEY before launch.", ENVIRONMENT)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = ENVIRONMENT == "development"

LOCAL_ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
LOCAL_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

if ENVIRONMENT == "production":
    ALLOWED_HOSTS = [
        "api.noumatch.com",
        "noumatch.com",
        "www.noumatch.com",
        "noumatch.onrender.com",
        *LOCAL_ALLOWED_HOSTS,
    ]
    CORS_ALLOWED_ORIGINS = [
        "https://noumatch.com",
        "https://www.noumatch.com",
        "https://noumatch.onrender.com",
        *LOCAL_CORS_ORIGINS,
    ]
elif ENVIRONMENT == "staging":
    ALLOWED_HOSTS = [
        "api-staging.noumatch.com",
        "staging.noumatch.com",
        "www.staging.noumatch.com",
        *LOCAL_ALLOWED_HOSTS,
    ]
    CORS_ALLOWED_ORIGINS = [
        "https://staging.noumatch.com",
        "https://www.staging.noumatch.com",
        *LOCAL_CORS_ORIGINS,
    ]
else:
    ALLOWED_HOSTS = [
        *LOCAL_ALLOWED_HOSTS,
    ]
    CORS_ALLOWED_ORIGINS = [*LOCAL_CORS_ORIGINS]

ALLOWED_HOSTS += parse_csv_env("EXTRA_ALLOWED_HOSTS")
CORS_ALLOWED_ORIGINS += parse_csv_env("EXTRA_CORS_ALLOWED_ORIGINS")

CORS_ALLOW_CREDENTIALS = True

from corsheaders.defaults import default_headers

CORS_ALLOW_HEADERS = list(default_headers) + [
    "authorization",
]

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS + parse_csv_env("EXTRA_CSRF_TRUSTED_ORIGINS")

# Detect if we're actually deployed on Railway (has HTTPS termination)
IS_RAILWAY_DEPLOYMENT = bool(config('RAILWAY_SERVICE_NAME', default=''))

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", default=IS_RAILWAY_DEPLOYMENT)
    SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
    SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", default=True)
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
else:
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

VERBOSE_NOTIFICATION_LOGS = env_bool("VERBOSE_NOTIFICATION_LOGS", default=False)
VERBOSE_WEBSOCKET_LOGS = env_bool("VERBOSE_WEBSOCKET_LOGS", default=False)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    'channels',
    "users",
    "interactions",
    "matches",
    "chat",
    "block",
    'report',
    'notifications',
    'storages',
    'waitlist',
    'admin_dashboard',
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'users.middleware.UserActivityMiddleware',
]

ROOT_URLCONF = 'api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'api.wsgi.application'
ASGI_APPLICATION = 'api.asgi.application'

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "users.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "300/min",
        "admin_login": "10/min",
        "auth_login": "10/min",
        "auth_register": "5/min",
        "auth_otp_verify": "20/hour",
        "auth_otp_resend": "10/hour",
        "password_reset": "5/hour",
        "email_check": "30/min",
        "waitlist_join": "10/hour",
        "chat_send_message": "90/min",
        "heartbeat": "120/min",
        "photo_upload": "30/hour",
    },
}

AUTH_USER_MODEL = "users.User"

from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
}

COOKIE_ENV_PREFIX = "nmstg" if ENVIRONMENT == "staging" else "nm"
AUTH_ACCESS_COOKIE_NAME = f"{COOKIE_ENV_PREFIX}_access"
AUTH_REFRESH_COOKIE_NAME = f"{COOKIE_ENV_PREFIX}_refresh"
AUTH_ADMIN_ACCESS_COOKIE_NAME = f"{COOKIE_ENV_PREFIX}_admin_access"
AUTH_ADMIN_REFRESH_COOKIE_NAME = f"{COOKIE_ENV_PREFIX}_admin_refresh"
AUTH_COOKIE_SECURE = not DEBUG
AUTH_COOKIE_HTTPONLY = True
AUTH_COOKIE_SAMESITE = config("AUTH_COOKIE_SAMESITE", default="Lax")
AUTH_COOKIE_PATH = "/"
AUTH_COOKIE_DOMAIN = config("AUTH_COOKIE_DOMAIN", default=None)

import os

# ========== ENVIRONMENT SETUP ==========
DEBUG = True if ENVIRONMENT == "development" else False

logging.info(f"\n{'='*50}")
logging.info(f"🌍 ENVIRONMENT: {ENVIRONMENT.upper()}")
logging.info(f"{'='*50}\n")

# ========== CHANNEL LAYERS (REDIS) ==========
if ENVIRONMENT == "production":
    if config('REDIS_URL', default=None):
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels_redis.core.RedisChannelLayer',
                'CONFIG': {
                    "hosts": [config('REDIS_URL')],
                },
            },
        }
        logging.info("✅ Redis: PRODUCTION mode - Redis configured")
    else:
        CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
        logging.info("⚠️  Redis: PRODUCTION mode - No REDIS_URL, using in-memory")
        
elif ENVIRONMENT == "staging":
    if config('STAGING_REDIS_URL', default=None):
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels_redis.core.RedisChannelLayer',
                'CONFIG': {
                    "hosts": [config('STAGING_REDIS_URL')],
                },
            },
        }
        logging.info("✅ Redis: STAGING mode - Redis configured")
    else:
        CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
        logging.info("⚠️  Redis: STAGING mode - No STAGING_REDIS_URL, using in-memory")
        
else:  # development
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
    logging.info("✅ Redis: DEVELOPMENT mode - Using in-memory channels")

TIME_ZONE = 'America/New_York'
USE_TZ = True
USE_I18N = True
USE_L10N = True

PASS_EXPIRY_HOURS = 1/60
MAX_UPLOAD_IMAGE_MB = config("MAX_UPLOAD_IMAGE_MB", default=10, cast=int)
MAX_UPLOAD_IMAGE_BYTES = MAX_UPLOAD_IMAGE_MB * 1024 * 1024
MAX_CHAT_ATTACHMENT_MB = config("MAX_CHAT_ATTACHMENT_MB", default=20, cast=int)
MAX_CHAT_ATTACHMENT_BYTES = MAX_CHAT_ATTACHMENT_MB * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = config("DATA_UPLOAD_MAX_MEMORY_SIZE", default=12 * 1024 * 1024, cast=int)
FILE_UPLOAD_MAX_MEMORY_SIZE = config("FILE_UPLOAD_MAX_MEMORY_SIZE", default=12 * 1024 * 1024, cast=int)












# ========== DATABASE CONFIGURATION ==========
STRICT_ENV_SEPARATION = True if ENVIRONMENT in {"production", "staging"} else env_bool("STRICT_ENV_SEPARATION", default=True)
production_db_url = config('DATABASE_URL', default=None)
staging_db_url = config('STAGING_DATABASE_URL', default=None)

if ENVIRONMENT == "production":
    if production_db_url:
        DATABASES = {
            "default": dj_database_url.parse(production_db_url)
        }
        logging.info("✅ Database: PRODUCTION mode - PostgreSQL configured")
        logging.info(f"   📊 Database: {DATABASES['default']['NAME'].split('@')[-1] if '@' in DATABASES['default']['NAME'] else 'PostgreSQL'}")
    else:
        if STRICT_ENV_SEPARATION:
            raise RuntimeError("Production requires DATABASE_URL to avoid environment cross-contamination.")
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
            }
        }
        logging.info("⚠️  Database: PRODUCTION mode - No DATABASE_URL, using SQLite fallback")
        
elif ENVIRONMENT == "staging":
    # Never allow staging to read DATABASE_URL by accident.
    # If STAGING_DATABASE_URL is missing, do NOT crash the app; fall back to isolated sqlite
    # so staging remains available without touching production data.
    if staging_db_url:
        if STRICT_ENV_SEPARATION and production_db_url and staging_db_url == production_db_url:
            raise RuntimeError("STAGING_DATABASE_URL must be different from DATABASE_URL.")
        DATABASES = {
            "default": dj_database_url.parse(staging_db_url)
        }
        logging.info("✅ Database: STAGING mode - PostgreSQL configured")
        logging.info(f"   📊 Database: {DATABASES['default']['NAME'].split('/')[-1] if '/' in DATABASES['default']['NAME'] else 'PostgreSQL'}")
    else:
        if STRICT_ENV_SEPARATION:
            logging.error(
                "STAGING_DATABASE_URL is missing in staging. Using isolated sqlite fallback to prevent cross-environment data access."
            )
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": os.path.join(BASE_DIR, "staging_db.sqlite3"),
            }
        }
        logging.info("⚠️  Database: STAGING mode - No STAGING_DATABASE_URL, using SQLite fallback")
        
else:  # development
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
        }
    }
    logging.info("✅ Database: DEVELOPMENT mode - SQLite configured")

# Test connection without exposing credentials
try:
    from django.db import connections
    connections['default'].cursor()
    logging.info("✅ Database Connection: SUCCESSFUL\n")
except Exception as e:
    logging.info(f"❌ Database Connection: FAILED - {str(e)[:100]}\n")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ========== CLOUDFLARE R2 STORAGE ==========
# Separate configuration for production and staging environments
if ENVIRONMENT == "production":
    # Production R2 credentials
    r2_bucket = config('CLOUDFLARE_R2_BUCKET', default=None)
    r2_account_id = config('CLOUDFLARE_R2_ACCOUNT_ID', default=None)
    r2_access_key = config('CLOUDFLARE_R2_ACCESS_KEY_ID', default=None)
    r2_secret_key = config('CLOUDFLARE_R2_SECRET_KEY', default=None)
    r2_public_url = config('CLOUDFLARE_R2_PUBLIC_URL', default=None)
    r2_config_name = "PRODUCTION"

elif ENVIRONMENT == "staging":
    # Staging R2 credentials – using your naming: CLOUDFLARE_R2_STAGING_*
    r2_bucket = config('CLOUDFLARE_R2_STAGING_BUCKET', default=None)
    r2_account_id = config('CLOUDFLARE_R2_STAGING_ACCOUNT_ID', default=None)
    r2_access_key = config('CLOUDFLARE_R2_STAGING_ACCESS_KEY_ID', default=None)
    r2_secret_key = config('CLOUDFLARE_R2_STAGING_SECRET_KEY', default=None)
    r2_public_url = config('CLOUDFLARE_R2_STAGING_PUBLIC_URL', default=None)
    r2_config_name = "STAGING"

else:  # development
    r2_bucket = None

# Configure R2 only if we have the required credentials
if ENVIRONMENT in ["production", "staging"] and all([r2_bucket, r2_account_id, r2_access_key, r2_secret_key]):
    # Set storage backend to R2
    AWS_ACCESS_KEY_ID = r2_access_key
    AWS_SECRET_ACCESS_KEY = r2_secret_key
    AWS_STORAGE_BUCKET_NAME = r2_bucket
    AWS_S3_ENDPOINT_URL = f"https://{r2_account_id}.r2.cloudflarestorage.com"
    AWS_S3_REGION_NAME = "auto"
    AWS_S3_ADDRESSING_STYLE = "virtual"
    AWS_DEFAULT_ACL = "public-read"
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_OBJECT_PARAMETERS = {
        "CacheControl": "max-age=86400",
    }

    if r2_public_url:
        AWS_S3_CUSTOM_DOMAIN = r2_public_url.replace('https://', '')

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

    STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

    if r2_public_url:
        MEDIA_URL = f"{r2_public_url}/media/"
    else:
        MEDIA_URL = f"https://{r2_bucket}.{r2_account_id}.r2.cloudflarestorage.com/media/"

    # Debug output – clearly shows which R2 is active
    logging.info(f"\n{'='*50}")
    logging.info(f"☁️  Cloudflare R2: {r2_config_name} mode ACTIVE")
    logging.info(f"   📦 Bucket: {r2_bucket}")
    logging.info(f"   🆔 Account ID: {r2_account_id[:6]}...{r2_account_id[-4:] if len(r2_account_id) > 10 else ''}")
    logging.info(f"   🌐 Public URL: {r2_public_url if r2_public_url else 'Using default endpoint'}")
    logging.info(f"{'='*50}\n")

else:
    # Fallback to local media storage
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    if ENVIRONMENT in ["production", "staging"]:
        missing = []
        if not r2_bucket: missing.append("BUCKET")
        if not r2_account_id: missing.append("ACCOUNT_ID")
        if not r2_access_key: missing.append("ACCESS_KEY")
        if not r2_secret_key: missing.append("SECRET_KEY")
        logging.info(f"\n⚠️  Cloudflare R2: {ENVIRONMENT.upper()} mode - Missing {', '.join(missing)} → Using LOCAL storage")
    else:
        logging.info("✅ Cloud Storage: DEVELOPMENT mode - Using local storage")









AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ========== EMAIL SETTINGS ==========
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'NouMatch <no-reply@noumatch.com>'
    logging.info("📧 Email: DEVELOPMENT mode - Console backend")
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = config('EMAIL_HOST', default='smtp-relay.brevo.com')
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
    
    if ENVIRONMENT == "staging":
        EMAIL_HOST_USER = config('STAGING_EMAIL_HOST_USER', default=config('EMAIL_HOST_USER', default=''))
        EMAIL_HOST_PASSWORD = config('STAGING_EMAIL_HOST_PASSWORD', default=config('EMAIL_HOST_PASSWORD', default=''))
        logging.info("📧 Email: STAGING mode - SMTP configured")
    else:
        EMAIL_HOST_USER = config('EMAIL_HOST_USER')
        EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
        logging.info("📧 Email: PRODUCTION mode - SMTP configured")
    
    DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='NouMatch <no-reply@noumatch.com>')
    logging.info(f"   📧 Host: {EMAIL_HOST}")

# ========== BREVO API ==========
if ENVIRONMENT == "staging":
    BREVO_API_KEY = config('STAGING_BREVO_API_KEY', default='')
    if BREVO_API_KEY:
        logging.info("✅ Brevo API: STAGING mode - Key configured")
    else:
        logging.info("⚠️  Brevo API: STAGING mode - No key found")
else:
    BREVO_API_KEY = config('BREVO_API_KEY', default='')
    if BREVO_API_KEY:
        logging.info(f"✅ Brevo API: {ENVIRONMENT.upper()} mode - Key configured")
    else:
        logging.info(f"⚠️  Brevo API: {ENVIRONMENT.upper()} mode - No key found")
    
# ========== FRONTEND URL ==========
if ENVIRONMENT == "production":
    FRONTEND_URL = config('FRONTEND_URL', default='https://noumatch.com')
elif ENVIRONMENT == "staging":
    FRONTEND_URL = config('FRONTEND_URL', default='https://staging.noumatch.com')
else:
    FRONTEND_URL = 'http://localhost:5173'

logging.info(f"🌐 Frontend URL: {FRONTEND_URL}")

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

logging.info(f"\n{'='*50}")
logging.info(f"✅ Settings loaded successfully in {ENVIRONMENT.upper()} mode")
logging.info(f"{'='*50}\n")
