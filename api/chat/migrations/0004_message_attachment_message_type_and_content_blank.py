from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0003_message_sender_type_alter_conversation_match_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='message',
            name='content',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='message',
            name='message_type',
            field=models.CharField(choices=[('text', 'Text'), ('image', 'Image'), ('video', 'Video')], default='text', max_length=10),
        ),
        migrations.AddField(
            model_name='message',
            name='attachment',
            field=models.FileField(blank=True, null=True, upload_to='chat_attachments/'),
        ),
    ]

