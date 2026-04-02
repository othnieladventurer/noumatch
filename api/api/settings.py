"""
Django settings for api project.
"""
import dj_database_url
import os
from pathlib import Path
from decouple import config
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-t84l(_xg3hn&%x0b*bv+b^#@dp8*(+z9_ojzh2z*#2&@6rt4dj'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = [
    'api-staging.noumatch.com', 
    'https://noumatch.onrender.com',
    'localhost',          
    '127.0.0.1',                         
]

CORS_ALLOWED_ORIGINS = [
    'https://staging.noumatch.com', 
    'https://noumatch.onrender.com', 
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
]

CORS_ALLOW_CREDENTIALS = True

from corsheaders.defaults import default_headers

CORS_ALLOW_HEADERS = list(default_headers) + [
    "authorization",
]

CSRF_TRUSTED_ORIGINS = [
    'https://staging.noumatch.com',
    'https://www.staging.noumatch.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
]

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
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

AUTH_USER_MODEL = "users.User"

from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

import os

# ========== ENVIRONMENT SETUP ==========
ENVIRONMENT = config("ENVIRONMENT", default="development").lower()
DEBUG = True if ENVIRONMENT == "development" else False

print(f"\n{'='*50}")
print(f"🌍 ENVIRONMENT: {ENVIRONMENT.upper()}")
print(f"{'='*50}\n")

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
        print("✅ Redis: PRODUCTION mode - Redis configured")
    else:
        CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
        print("⚠️  Redis: PRODUCTION mode - No REDIS_URL, using in-memory")
        
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
        print("✅ Redis: STAGING mode - Redis configured")
    else:
        CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
        print("⚠️  Redis: STAGING mode - No STAGING_REDIS_URL, using in-memory")
        
else:  # development
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
    print("✅ Redis: DEVELOPMENT mode - Using in-memory channels")

TIME_ZONE = 'America/New_York'
USE_TZ = True
USE_I18N = True
USE_L10N = True

PASS_EXPIRY_HOURS = 1/60

# ========== DATABASE CONFIGURATION ==========
if ENVIRONMENT == "production":
    if config('DATABASE_URL', default=None):
        DATABASES = {
            "default": dj_database_url.parse(config("DATABASE_URL"))
        }
        print("✅ Database: PRODUCTION mode - PostgreSQL configured")
        print(f"   📊 Database: {DATABASES['default']['NAME'].split('@')[-1] if '@' in DATABASES['default']['NAME'] else 'PostgreSQL'}")
    else:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
            }
        }
        print("⚠️  Database: PRODUCTION mode - No DATABASE_URL, using SQLite fallback")
        
elif ENVIRONMENT == "staging":
    if config('STAGING_DATABASE_URL', default=None):
        DATABASES = {
            "default": dj_database_url.parse(config("STAGING_DATABASE_URL"))
        }
        print("✅ Database: STAGING mode - PostgreSQL configured")
        print(f"   📊 Database: {DATABASES['default']['NAME'].split('/')[-1] if '/' in DATABASES['default']['NAME'] else 'PostgreSQL'}")
    else:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": os.path.join(BASE_DIR, "staging_db.sqlite3"),
            }
        }
        print("⚠️  Database: STAGING mode - No STAGING_DATABASE_URL, using SQLite fallback")
        
else:  # development
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
        }
    }
    print("✅ Database: DEVELOPMENT mode - SQLite configured")

# Test connection without exposing credentials
try:
    from django.db import connections
    connections['default'].cursor()
    print("✅ Database Connection: SUCCESSFUL\n")
except Exception as e:
    print(f"❌ Database Connection: FAILED - {str(e)[:100]}\n")

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
if ENVIRONMENT in ["production", "staging"]:
    # Use different config keys for staging vs production
    if ENVIRONMENT == "production":
        bucket_config = {
            'bucket': config('CLOUDFLARE_R2_BUCKET'),
            'account_id': config('CLOUDFLARE_R2_ACCOUNT_ID'),
            'access_key': config('CLOUDFLARE_R2_ACCESS_KEY_ID'),
            'secret_key': config('CLOUDFLARE_R2_SECRET_KEY'),
            'public_url': config('CLOUDFLARE_R2_PUBLIC_URL', default=None)
        }
    else:  # staging
        bucket_config = {
            'bucket': config('CLOUDFLARE_R2_STAGING_BUCKET', default=config('CLOUDFLARE_R2_BUCKET')),
            'account_id': config('CLOUDFLARE_R2_STAGING_ACCOUNT_ID', default=config('CLOUDFLARE_R2_ACCOUNT_ID')),
            'access_key': config('CLOUDFLARE_R2_STAGING_ACCESS_KEY_ID', default=config('CLOUDFLARE_R2_ACCESS_KEY_ID')),
            'secret_key': config('CLOUDFLARE_R2_STAGING_SECRET_KEY', default=config('CLOUDFLARE_R2_SECRET_KEY')),
            'public_url': config('CLOUDFLARE_R2_STAGING_PUBLIC_URL', default=config('CLOUDFLARE_R2_PUBLIC_URL', default=None))
        }
    
    if all([
        bucket_config['bucket'],
        bucket_config['access_key']
    ]):
        CLOUDFLARE_R2_BUCKET = bucket_config['bucket']
        CLOUDFLARE_R2_ACCOUNT_ID = bucket_config['account_id']
        CLOUDFLARE_R2_ACCESS_KEY_ID = bucket_config['access_key']
        CLOUDFLARE_R2_SECRET_KEY = bucket_config['secret_key']
        CLOUDFLARE_R2_PUBLIC_URL = bucket_config['public_url']

        AWS_ACCESS_KEY_ID = CLOUDFLARE_R2_ACCESS_KEY_ID
        AWS_SECRET_ACCESS_KEY = CLOUDFLARE_R2_SECRET_KEY
        AWS_STORAGE_BUCKET_NAME = CLOUDFLARE_R2_BUCKET
        AWS_S3_ENDPOINT_URL = f"https://{CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        AWS_S3_REGION_NAME = "auto"
        AWS_S3_ADDRESSING_STYLE = "virtual"
        AWS_DEFAULT_ACL = "public-read"
        AWS_QUERYSTRING_AUTH = False
        AWS_S3_FILE_OVERWRITE = False
        AWS_S3_OBJECT_PARAMETERS = {
            "CacheControl": "max-age=86400",
        }

        if CLOUDFLARE_R2_PUBLIC_URL:
            AWS_S3_CUSTOM_DOMAIN = CLOUDFLARE_R2_PUBLIC_URL.replace('https://', '')

        STORAGES = {
            "default": {
                "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            },
            "staticfiles": {
                "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
            },
        }

        STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

        if CLOUDFLARE_R2_PUBLIC_URL:
            MEDIA_URL = f"{CLOUDFLARE_R2_PUBLIC_URL}/media/"
        else:
            MEDIA_URL = f"https://{CLOUDFLARE_R2_BUCKET}.{CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/media/"
        
        print(f"✅ Cloud Storage: {ENVIRONMENT.upper()} mode - R2 configured")
        print(f"   📦 Bucket: {CLOUDFLARE_R2_BUCKET}")
        if ENVIRONMENT == "staging":
            print(f"   🏷️  Using STAGING bucket")
    else:
        print(f"⚠️  Cloud Storage: {ENVIRONMENT.upper()} mode - Missing R2 credentials, using local storage")
        MEDIA_URL = '/media/'
        MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
else:
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    print("✅ Cloud Storage: DEVELOPMENT mode - Using local storage")






    
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
    print("📧 Email: DEVELOPMENT mode - Console backend")
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = config('EMAIL_HOST', default='smtp-relay.brevo.com')
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
    
    if ENVIRONMENT == "staging":
        EMAIL_HOST_USER = config('STAGING_EMAIL_HOST_USER', default=config('EMAIL_HOST_USER', default=''))
        EMAIL_HOST_PASSWORD = config('STAGING_EMAIL_HOST_PASSWORD', default=config('EMAIL_HOST_PASSWORD', default=''))
        print("📧 Email: STAGING mode - SMTP configured")
    else:
        EMAIL_HOST_USER = config('EMAIL_HOST_USER')
        EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
        print("📧 Email: PRODUCTION mode - SMTP configured")
    
    DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='NouMatch <no-reply@noumatch.com>')
    print(f"   📧 Host: {EMAIL_HOST}")

# ========== BREVO API ==========
if ENVIRONMENT == "staging":
    BREVO_API_KEY = config('STAGING_BREVO_API_KEY', default='')
    if BREVO_API_KEY:
        print("✅ Brevo API: STAGING mode - Key configured")
    else:
        print("⚠️  Brevo API: STAGING mode - No key found")
else:
    BREVO_API_KEY = config('BREVO_API_KEY', default='')
    if BREVO_API_KEY:
        print(f"✅ Brevo API: {ENVIRONMENT.upper()} mode - Key configured")
    else:
        print(f"⚠️  Brevo API: {ENVIRONMENT.upper()} mode - No key found")
    
# ========== FRONTEND URL ==========
if ENVIRONMENT == "production":
    FRONTEND_URL = config('FRONTEND_URL', default='https://noumatch.com')
elif ENVIRONMENT == "staging":
    FRONTEND_URL = config('FRONTEND_URL', default='https://staging.noumatch.com')
else:
    FRONTEND_URL = 'http://localhost:5173'

print(f"🌐 Frontend URL: {FRONTEND_URL}")

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

print(f"\n{'='*50}")
print(f"✅ Settings loaded successfully in {ENVIRONMENT.upper()} mode")
print(f"{'='*50}\n")