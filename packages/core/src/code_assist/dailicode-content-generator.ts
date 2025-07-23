/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { ContentGenerator } from '../core/contentGenerator.js';
import { DailicodeOAuth2Client } from './dailicode-oauth2.js';

export class DailicodeContentGenerator implements ContentGenerator {
  private client: DailicodeOAuth2Client;

  constructor(client: DailicodeOAuth2Client) {
    this.client = client;
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const accessToken = await this.client.getAccessToken();
    
    // Convert the request to DailiCode API format
    const dailicodeRequest = this.convertToDailicodeFormat(request);
    
    const response = await fetch('https://www.dailicode.com/api/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dailicodeRequest),
    });

    if (!response.ok) {
      throw new Error(`DailiCode API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.convertFromDailicodeFormat(data);
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const accessToken = await this.client.getAccessToken();
    
    // Convert the request to DailiCode API format
    const dailicodeRequest = {
      ...this.convertToDailicodeFormat(request),
      stream: true,
    };
    
    const response = await fetch('https://www.dailicode.com/api/generate/stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dailicodeRequest),
    });

    if (!response.ok) {
      throw new Error(`DailiCode API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const self = this;
    return (async function* () {
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content') {
                  yield self.convertFromDailicodeFormat(data);
                }
              } catch (error) {
                console.warn('Failed to parse streaming response:', error);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    })();
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    const accessToken = await this.client.getAccessToken();
    
    const response = await fetch('https://www.dailicode.com/api/count-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        contents: request.contents,
      }),
    });

    if (!response.ok) {
      throw new Error(`DailiCode API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      totalTokens: data.totalTokens || 0,
    };
  }

  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    const accessToken = await this.client.getAccessToken();
    
    const response = await fetch('https://www.dailicode.com/api/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        contents: request.contents,
      }),
    });

    if (!response.ok) {
      throw new Error(`DailiCode API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      embeddings: [{
        values: data.embedding || [],
      }],
    };
  }

  private convertToDailicodeFormat(request: GenerateContentParameters): any {
    const contents = Array.isArray(request.contents) ? request.contents : [];
    return {
      model: request.model,
      messages: contents.map((content: any) => ({
        role: content.role === 'user' ? 'user' : 'assistant',
        content: content.parts?.map((part: any) => {
          if ('text' in part) {
            return { type: 'text', text: part.text };
          }
          // Handle other part types as needed
          return part;
        }) || [],
      })),
      generationConfig: (request as any).generationConfig,
      safetySettings: (request as any).safetySettings,
      tools: (request as any).tools,
      systemInstruction: (request as any).systemInstruction,
    };
  }

  private convertFromDailicodeFormat(data: any): GenerateContentResponse {
    const candidates = data.choices?.map((choice: any) => ({
      content: {
        parts: [{ text: choice.message?.content || choice.text || '' }],
        role: 'model' as const,
      },
      finishReason: choice.finish_reason || 'STOP',
      index: choice.index || 0,
      safetyRatings: [],
    })) || [{
      content: {
        parts: [{ text: data.content || data.text || '' }],
        role: 'model' as const,
      },
      finishReason: 'STOP' as const,
      index: 0,
      safetyRatings: [],
    }];

    const response = {
      candidates,
      promptFeedback: {
        safetyRatings: [],
      },
      usageMetadata: {
        promptTokenCount: data.usage?.prompt_tokens || 0,
        candidatesTokenCount: data.usage?.completion_tokens || 0,
        totalTokenCount: data.usage?.total_tokens || 0,
      },
      // Add required properties for GenerateContentResponse
      text: candidates[0]?.content?.parts?.[0]?.text || '',
      data: data,
      functionCalls: [],
      executableCode: [],
      codeExecutionResult: [],
    };

    return response as unknown as GenerateContentResponse;
  }
}

export async function createDailicodeContentGenerator(
  httpOptions: any,
  sessionId?: string,
): Promise<DailicodeContentGenerator> {
  const { getDailicodeOauthClient } = await import('./dailicode-oauth2.js');
  const client = await getDailicodeOauthClient();
  return new DailicodeContentGenerator(client);
}