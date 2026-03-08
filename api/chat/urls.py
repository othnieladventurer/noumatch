from django.urls import path
from . import views

urlpatterns = [
    # Conversation endpoints
    path('conversations/', 
         views.ConversationListView.as_view(), 
         name='conversation-list'),
    
    path('conversations/create/', 
         views.CreateConversationView.as_view(), 
         name='create-conversation'),
    
    path('conversations/<int:pk>/', 
         views.ConversationDetailView.as_view(), 
         name='conversation-detail'),
    
    # Message endpoints
    path('conversations/<int:conversation_id>/messages/', 
         views.GetMessagesView.as_view(), 
         name='conversation-messages'),
    
    path('conversations/<int:conversation_id>/send/', 
         views.SendMessageView.as_view(), 
         name='send-message'),
    
    path('conversations/<int:conversation_id>/mark-read/', 
         views.MarkMessagesReadView.as_view(), 
         name='mark-messages-read'),
    
    # Unread count
    path('unread-count/', 
         views.UnreadCountView.as_view(), 
         name='unread-count'),
]