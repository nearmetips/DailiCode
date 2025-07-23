import { AgentResult } from './types.js';
import {
  ServerGeminiStreamEvent,
  GeminiEventType,
} from 'daili-code-core';

export function logStream(chunk: AgentResult) {
  if (!chunk) {
    return;
  }
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content || '');
  }
  if (chunk.type === 'tool_call') {
    console.log('=== excute tool ===');
    console.log(JSON.stringify(chunk.toolCall, null, 2));
    console.log('');
  }
}

export function processStreamEvent(
  event: ServerGeminiStreamEvent,
): AgentResult | null {
  const timestamp = Date.now();
  switch (event.type) {
    case GeminiEventType.Content:
      return {
        type: 'content',
        content: event.value,
        timestamp,
      };

    case GeminiEventType.ToolCallRequest:
      return {
        type: 'tool_call',
        toolCall: {
          name: event.value.name,
          args: event.value.args,
        },
        timestamp,
      };

    case GeminiEventType.ToolCallResponse:
      return {
        type: 'tool_call',
        toolCall: {
          name: 'response',
          args: {},
          result: event.value.responseParts,
        },
        timestamp,
      };

    case GeminiEventType.Thought:
      return {
        type: 'thought',
        thought: {
          summary: event.value.subject,
          details: event.value.description,
        },
        timestamp,
      };

    case GeminiEventType.Error:
      return {
        type: 'error',
        error: event.value.error.message,
        timestamp,
      };

    case GeminiEventType.UserCancelled:
      return {
        type: 'user_cancelled',
        timestamp,
      };

    default:
      return null;
  }
}
