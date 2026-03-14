# test_channels.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from channels.layers import get_channel_layer
channel_layer = get_channel_layer()

if channel_layer:
    print("✅ Channels is working!")
    print(f"Channel layer: {channel_layer}")
else:
    print("❌ Channels is NOT working")