import toast from 'react-hot-toast';

import { Conversation, Role } from '@/types/chat';

const MAX_MESSAGES_PER_CONVERSATION = 24;

/**
 * Truncates messages in a conversation to avoid exceeding the limit.
 * Keeps the most recent messages and tries to avoid cutting off at a user message.
 */
const truncateMessages = (messages: any[]): any[] => {
  if (messages.length <= MAX_MESSAGES_PER_CONVERSATION) {
    return messages;
  }

  // Calculate how many messages to remove from the beginning to keep MAX_MESSAGES_PER_CONVERSATION
  let remove_count = Math.max(0, Math.round(MAX_MESSAGES_PER_CONVERSATION / 2));
  
  // Try to avoid cutting off at a user message
  // If the message at the cut point is a user message, remove one more to keep the pair
  if (remove_count < messages.length && messages[remove_count]?.role === "user") {
    console.log("Removing one more message to keep the pair");
    remove_count--;
  }
  
  console.log(`Truncating messages: ${messages.length} -> ${messages.length - remove_count} (removing ${remove_count} old messages)`);
  
  // Return messages starting from remove_count (keeping the most recent ones)
  return messages.slice(remove_count);
};
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
    const trimmedConversation = {
      ...conversation,
      messages: truncateMessages(conversation.messages)
    };
    
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
    
    // Trim messages if they exceed the limit
    const conversationsWithLimitedMessages = latestConversation.map(conversation => ({
      ...conversation,
      messages: truncateMessages(conversation.messages)
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
