import toast from 'react-hot-toast';

import { Conversation, Role } from '@/types/chat';

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const saveConversation = (conversation: Conversation) => {
  try {
    sessionStorage.setItem(
      'selectedConversation',
      JSON.stringify(conversation),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.log('Storage quota exceeded, cannot save conversation.');
      // toast.error('Storage quota exceeded, cannot save conversation.');
    }
  }
};

export const saveConversations = (conversations: Conversation[]) => {
  try {
    // Keep only the latest conversation
    const latestConversation = conversations.slice(-1);
    
    // Limit messages in the conversation to maximum 20, keeping the most recent ones
    const conversationsWithLimitedMessages = latestConversation.map(conversation => ({
      ...conversation,
      messages: conversation.messages.slice(-20)
    }));
    
    sessionStorage.setItem(
      'conversationHistory',
      JSON.stringify(conversationsWithLimitedMessages),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.log('Storage quota exceeded, cannot save conversations.');
      // toast.error('Storage quota exceeded, cannot save conversation.');
    }
  }
};
