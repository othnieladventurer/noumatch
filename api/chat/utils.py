import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def send_realtime_chat_event(conversation_id, event_type, payload):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{conversation_id}",
            {
                "type": "chat_event",
                "event_type": event_type,
                "payload": payload,
            },
        )
    except Exception as exc:
        logging.info(f"Realtime chat event failed: {exc}")

