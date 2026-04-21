import logging
# test_channels.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from channels.layers import get_channel_layer
channel_layer = get_channel_layer()

if channel_layer:
    logging.info("✅ Channels is working!")
    logging.info(f"Channel layer: {channel_layer}")
else:
    logging.info("❌ Channels is NOT working")
