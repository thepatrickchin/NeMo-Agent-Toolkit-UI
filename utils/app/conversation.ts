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
    // Strip intermediateSteps to reduce storage size
    const conversationForStorage = {
      ...conversation,
      messages: conversation.messages.map(msg => {
        const { intermediateSteps, ...messageWithoutSteps } = msg as any;
        return messageWithoutSteps;
      })
    };
    
    sessionStorage.setItem(
      'selectedConversation',
      JSON.stringify(conversationForStorage),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.log('Storage quota exceeded, cannot save conversation.');
      toast.error('Storage quota exceeded, cannot save conversation.');
    }
  }
};

export const saveConversations = (conversations: Conversation[]) => {
  try {
    // Strip intermediateSteps from all conversations to reduce storage size
    const conversationsForStorage = conversations.map(conv => ({
      ...conv,
      messages: conv.messages.map(msg => {
        const { intermediateSteps, ...messageWithoutSteps } = msg as any;
        return messageWithoutSteps;
      })
    }));
    
    sessionStorage.setItem(
      'conversationHistory',
      JSON.stringify(conversationsForStorage),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.log('Storage quota exceeded, cannot save conversations.');
      toast.error('Storage quota exceeded, cannot save conversation.');
    }
  }
};
