import logging
# interactions/apps.py
from django.apps import AppConfig

class InteractionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    
    def ready(self):
        logging.info("🔧 Interactions app ready - importing signals")
        import notifications.signals  # This line is critical!



        
