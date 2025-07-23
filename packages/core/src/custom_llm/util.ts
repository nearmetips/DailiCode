/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import {
  Part,
  Content,
  ContentListUnion,
  GenerateContentConfig,
} from '@google/genai';

/**
 * Extracts the answer part from LLM output
 * @param text LLM output string
 * @returns Extracted answer text
 */
export function extractAnswer(text: string): string {
  const startTags = ['<think>', '<thinking>'];
  const endTags = ['</think>', '</thinking>'];
  for (let i = 0; i < startTags.length; i++) {
    const start = startTags[i];
    const end = endTags[i];
    if (text.includes(start) && text.includes(end)) {
      const partsBefore = text.split(start);
      const partsAfter = partsBefore[1].split(end);
      return (partsBefore[0].trim() + ' ' + partsAfter[1].trim()).trim();
    }
  }
  return text;
}

/**
 * Extracts JSON from LLM output
 * @param output LLM output string
 * @returns Extracted JSON object
 */
export function extractJsonFromLLMOutput(output: string): any {
  if (output.trim().startsWith('<think')) {
    output = extractAnswer(output);
  }
  try {
    const json = JSON.parse(output);
    return json;
  } catch {
    // ...
  }
  const jsonStart = output.indexOf('```json');
  const jsonEnd = output.lastIndexOf('```');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    const jsonString = output.substring(jsonStart + 7, jsonEnd);
    try {
      const json = JSON.parse(jsonString);
      return json;
    } catch (error) {
      console.error('Failed to parse JSON:', { error, llmResponse: output });
    }
  } else {
    console.error('LLM output not in expected format:', output);
    return undefined;
  }
}

/**
 * Convert type values to lowercase
 */
function convertTypeValuesToLowerCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertTypeValuesToLowerCase(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'minLength' || key === 'minItems') {
        continue;
      }
      if (key === 'type' && typeof value === 'string') {
        newObj[key] = value.toLowerCase();
      } else {
        newObj[key] = convertTypeValuesToLowerCase(value);
      }
    }
    return newObj;
  }
  return obj;
}

/**
 * Converts Gemini tool function declarations to OpenAI-compatible tool array format
 * @param requestConfig Gemini generate content config (containing tool declarations)
 * @returns OpenAI tool call format array, undefined if no tools
 */
export function extractToolFunctions(
  requestConfig: GenerateContentConfig | undefined,
): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
  if (!requestConfig?.tools) return undefined;
  const result: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
  for (const tool of requestConfig.tools) {
    if ('functionDeclarations' in tool) {
      for (const func of tool.functionDeclarations || []) {
        result.push({
          type: 'function',
          function: {
            name: func.name || '',
            description: func.description || '',
            parameters:
              (convertTypeValuesToLowerCase(func.parameters) as Record<
                string,
                unknown
              >) || {},
          },
        });
      }
    }
  }
  return result;
}

/**
 * Normalize contents to a Content[] array
 * @param contents Gemini content list union
 * @returns Normalized Content[] array
 */
export function normalizeContents(contents: ContentListUnion): Content[] {
  if (Array.isArray(contents)) {
    return contents.map((item) => {
      if (typeof item === 'string') {
        return {
          role: 'user',
          parts: [{ text: item }],
        };
      }
      if (typeof item === 'object' && item !== null && 'parts' in item) {
        return item;
      }
      return {
        role: 'user',
        parts: [item as Part],
      };
    });
  }
  if (typeof contents === 'string') {
    return [
      {
        role: 'user',
        parts: [{ text: contents }],
      },
    ];
  }
  if (
    typeof contents === 'object' &&
    contents !== null &&
    'parts' in contents
  ) {
    return [contents];
  }
  return [
    {
      role: 'user',
      parts: [contents as Part],
    },
  ];
}

/**
 * Check if a part is a valid function call
 */
export function isValidFunctionCall(part: Part): part is {
  functionCall: { name: string; args: Record<string, unknown> };
} {
  if (typeof part !== 'object' || part === null) {
    return false;
  }
  const { functionCall } = part;
  if (functionCall === undefined) {
    return false;
  }
  return (
    typeof functionCall.name === 'string' && functionCall.args !== undefined
  );
}

/**
 * Check if a part is a valid function response
 */
export function isValidFunctionResponse(part: Part): part is {
  functionResponse: {
    id: string;
    name: string;
    response: { output?: string; error?: string };
  };
} {
  if (typeof part !== 'object' || part === null) {
    return false;
  }
  const { functionResponse } = part;
  if (functionResponse === undefined) {
    return false;
  }
  const isValidId = typeof functionResponse.id === 'string';
  const isValidName = typeof functionResponse.name === 'string';
  const hasValidResponse = (() => {
    if (functionResponse.response === undefined) {
      return false;
    }
    return (
      typeof functionResponse.response.output === 'string' ||
      typeof functionResponse.response.error === 'string'
    );
  })();
  return isValidId && isValidName && hasValidResponse;
}
