import toast from 'react-hot-toast';

import { Conversation, Role } from '@/types/chat';

const MAX_MESSAGES_PER_CONVERSATION = 20;
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
    // Only trim messages if they exceed the limit
    const trimmedConversation = conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION
      ? {
          ...conversation,
          messages: (() => {
            const remove_count = Math.round(MAX_MESSAGES_PER_CONVERSATION / conversation.messages.length);
            console.log(`Splicing conversation ${conversation.id}: ${conversation.messages.length} messages -> ${MAX_MESSAGES_PER_CONVERSATION} messages`);
            return conversation.messages.splice(0, remove_count);
          })()
        }
      : conversation;
    
    sessionStorage.setItem(
      'selectedConversation',
      JSON.stringify(trimmedConversation),
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
    // Only slice if there are multiple conversations, otherwise use the single conversation directly
    const latestConversation = conversations.length > 1 ? conversations.slice(-1) : conversations;
    
    // Calculate the message limit per conversation
    const remove_count = Math.round(MAX_MESSAGES_PER_CONVERSATION / conversations.length);
    
    // Only trim messages if they exceed the limit
    const conversationsWithLimitedMessages = latestConversation.map(conversation => 
      conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION
        ? {
            ...conversation,
            messages: (() => {
              console.log(`Splicing conversations ${conversation.id}: ${conversation.messages.length} messages -> ${remove_count} messages`);
              return conversation.messages.splice(0, remove_count);
            })()
          }
        : conversation
    );
    
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
