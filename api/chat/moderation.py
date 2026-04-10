import re
from django.utils import timezone
from  .models import MessageFlag

# Simple keyword lists (extendable)
THREAT_KEYWORDS = ['kill', 'hurt', 'attack', 'bomb', 'rape', 'murder']
HARASSMENT_PHRASES = ['ugly', 'stupid', 'fat', 'loser', 'whore']
SPAM_PATTERN = re.compile(r'(http|www|click|subscribe|follow)', re.IGNORECASE)


def check_message(message):
    """Analyze message and create flags if suspicious."""
    score = 0
    reasons = []

    # 1. Spam detection (URLs / promotional phrases)
    if SPAM_PATTERN.search(message.content):
        score += 5
        reasons.append('spam')

    # 2. Threat keywords
    for word in THREAT_KEYWORDS:
        if word in message.content.lower():
            score += 8
            reasons.append('threat')
            break

    # 3. Harassment phrases
    for phrase in HARASSMENT_PHRASES:
        if phrase in message.content.lower():
            score += 3
            reasons.append('harassment')
            break

    # 4. Frequency check (spam / harassment)
    if message.conversation:
        # Last 30 seconds messages from same sender
        recent = message.conversation.messages.filter(
            sender=message.sender,
            created_at__gte=timezone.now() - timezone.timedelta(seconds=30)
        ).count()
        if recent >= 5:   # more than 5 in 30 sec
            score += 7
            reasons.append('spam')

        # No reply harassment: >5 messages without a reply from the other side
        other_msgs = message.conversation.messages.exclude(sender=message.sender)
        if message.sender_type == 'user' and other_msgs.count() == 0:
            sent_count = message.conversation.messages.filter(sender=message.sender).count()
            if sent_count >= 5:
                score += 6
                reasons.append('harassment')

    if score > 0 and reasons:
        # Create flag with highest severity reason (first)
        MessageFlag.objects.create(
            message=message,
            reason=reasons[0],
            score=min(score, 10)
        )