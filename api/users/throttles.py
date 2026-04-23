from rest_framework.throttling import ScopedRateThrottle


class AuthLoginThrottle(ScopedRateThrottle):
    scope = "auth_login"


class AuthRegisterThrottle(ScopedRateThrottle):
    scope = "auth_register"


class OTPVerifyThrottle(ScopedRateThrottle):
    scope = "auth_otp_verify"


class OTPResendThrottle(ScopedRateThrottle):
    scope = "auth_otp_resend"


class PasswordResetThrottle(ScopedRateThrottle):
    scope = "password_reset"


class EmailCheckThrottle(ScopedRateThrottle):
    scope = "email_check"


class HeartbeatThrottle(ScopedRateThrottle):
    scope = "heartbeat"


class PhotoUploadThrottle(ScopedRateThrottle):
    scope = "photo_upload"


class WaitlistJoinThrottle(ScopedRateThrottle):
    scope = "waitlist_join"


class ChatSendMessageThrottle(ScopedRateThrottle):
    scope = "chat_send_message"


class AdminLoginThrottle(ScopedRateThrottle):
    scope = "admin_login"
