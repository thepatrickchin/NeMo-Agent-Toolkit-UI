# Bug Fix Summary: Assistant Response Text Not Showing

## Problem
The UI was getting stuck in "thought process" mode and assistant response text was not being displayed in the conversation, even though backend logs showed content was being sent via WebSocket.

## Root Cause Analysis

### Issue #1: Message ID Mismatch (PRIMARY ISSUE)
The fundamental problem was that `system_response_message` and `system_intermediate_message` WebSocket messages were creating/updating **separate assistant messages** in the UI with **different IDs**:

- `system_response_message` was creating assistant messages with ID = `message.id`
- `system_intermediate_message` was creating assistant messages with ID = `message.parent_id`

Since each WebSocket message has a unique `message.id`, but shares the same `message.parent_id` (the user message that triggered the response), this caused:
1. An intermediate message would create Assistant Message A with ID = `parent_id`
2. A response message would create Assistant Message B with ID = `message.id` (different!)
3. The next intermediate message would update Assistant Message A, but the content was in Message B
4. Result: Content appeared to be "lost" because it was in a different message object

**Example from logs:**
```
system_intermediate_message { id: '3a0a2f14...', parent_id: 'user-msg-id' } → Creates assistant msg with ID 'user-msg-id'
system_response_message { id: '3ae19c43...', parent_id: 'user-msg-id' } → Was creating assistant msg with ID '3ae19c43...' (WRONG!)
system_intermediate_message { id: '3a0a2f14...', parent_id: 'user-msg-id' } → Updates assistant msg 'user-msg-id', but content is in '3ae19c43...'
```

### Issue #2: UI State Not Updating on Completion
The logic for stopping streaming (`messageIsStreaming = false`) was not robust when `status: "complete"` messages arrived with different IDs or `text: null`.

### Issue #3: Stale Content in Race Conditions (Secondary)
When `system_intermediate_message` arrived immediately after `system_response_message`, it was passing stale empty content from the messages array to `updateAssistantMessage`, potentially overwriting fresh content.

## Solution

### Fix #1: Unified Assistant Message ID (CRITICAL)
Both `processSystemResponseMessage` and `processIntermediateStepMessage` now:
1. Calculate `targetAssistantMessageId = message.parent_id` (or `message.id` if parent is 'root')
2. Use `findIndex` to look for an existing assistant message with that specific ID
3. If found, update that message by index
4. If not found, create a new message with `targetAssistantMessageId`

This ensures that ALL WebSocket messages related to a single user query update the **SAME** assistant message in the UI.

**Key changes in `components/Chat/Chat.tsx`:**
```typescript
// OLD (processSystemResponseMessage):
createAssistantMessage(message.id, message.parent_id, incomingText)  // WRONG ID!

// NEW:
const targetAssistantMessageId = message.parent_id || message.id;
const existingAssistantIndex = messages.findIndex(
  m => m.role === 'assistant' && m.id === targetAssistantMessageId
);
// Then update by index if exists, or create with targetAssistantMessageId
createAssistantMessage(targetAssistantMessageId, message.parent_id, incomingText)
```

### Fix #2: Reordered Completion Logic
Moved `isSystemResponseComplete(message)` check to happen BEFORE `activeUserMessageId` validation, ensuring completion signals are always processed.

### Fix #3: Message Queue for Sequential Processing
Implemented a message queue (`messageQueueRef`, `isProcessingRef`) to ensure WebSocket messages are processed strictly one at a time, preventing state update race conditions.

### Fix #4: Pass `undefined` for Content Preservation
Modified `processIntermediateStepMessage` to pass `undefined` for `newContent` parameter when updating intermediate steps, preventing stale content overwrites.

## Files Modified
1. `/components/Chat/Chat.tsx` - Main WebSocket message handling logic
2. `/utils/chatTransform.ts` - Updated JSDoc comments for `updateAssistantMessage`

## Testing
After the fix, verify:
1. Assistant response text appears correctly in the UI
2. Intermediate steps (thought process) display without overwriting content
3. UI properly exits "thinking" mode when response completes
4. Content persists correctly in sessionStorage
5. Multiple rapid WebSocket messages don't cause content loss

## Log Verification
With the fix, logs should show:
- `[processSystemResponseMessage] Updating existing message` when content arrives for an existing assistant message
- `final_message_count` should be 2 (user + assistant), not 3+ separate assistant messages
- `last_message_content_length` should increase and never revert to 0
- `target_assistant_id` should be consistent across all message types for the same conversation turn
