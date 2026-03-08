from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from users.models import User

class UserActivityMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        if request.user.is_authenticated:
            # Only update if it's been more than 1 minute since last update
            if not request.user.last_activity or \
               (timezone.now() - request.user.last_activity).seconds > 60:
                User.objects.filter(id=request.user.id).update(
                    last_activity=timezone.now(),
                    is_online=True
                )
        return response



