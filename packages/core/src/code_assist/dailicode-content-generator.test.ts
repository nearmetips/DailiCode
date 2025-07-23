/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailicodeContentGenerator } from './dailicode-content-generator.js';
import { DailicodeOAuth2Client } from './dailicode-oauth2.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('DailicodeContentGenerator', () => {
  let generator: DailicodeContentGenerator;
  let mockClient: DailicodeOAuth2Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      getAccessToken: vi.fn().mockResolvedValue('test-access-token'),
    } as any;
    generator = new DailicodeContentGenerator(mockClient);
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const mockRequest = {
        model: 'gemini-1.5-flash',
        contents: [{
          role: 'user' as const,
          parts: [{ text: 'Hello, world!' }],
        }],
      };

      const mockResponse = {
        choices: [{
          message: { content: 'Hello! How can I help you today?' },
          finish_reason: 'stop',
          index: 0,
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await generator.generateContent(mockRequest);

      expect(mockClient.getAccessToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.dailicode.com/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates?.[0]?.content?.parts?.[0]?.text).toBe('Hello! How can I help you today?');
      expect(result.usageMetadata?.totalTokenCount).toBe(25);
    });

    it('should throw error when API request fails', async () => {
      const mockRequest = {
        model: 'gemini-1.5-flash',
        contents: [{
          role: 'user' as const,
          parts: [{ text: 'Hello, world!' }],
        }],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(generator.generateContent(mockRequest)).rejects.toThrow(
        'DailiCode API error: Bad Request'
      );
    });
  });

  describe('countTokens', () => {
    it('should count tokens successfully', async () => {
      const mockRequest = {
        model: 'gemini-1.5-flash',
        contents: [{
          role: 'user' as const,
          parts: [{ text: 'Hello, world!' }],
        }],
      };

      const mockResponse = {
        totalTokens: 42,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await generator.countTokens(mockRequest);

      expect(mockClient.getAccessToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.dailicode.com/api/count-tokens',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result.totalTokens).toBe(42);
    });
  });

  describe('embedContent', () => {
    it('should embed content successfully', async () => {
      const mockRequest = {
        model: 'text-embedding-ada-002',
        contents: [{ parts: [{ text: 'Hello, world!' }] }],
      };

      const mockResponse = {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await generator.embedContent(mockRequest);

      expect(mockClient.getAccessToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.dailicode.com/api/embed',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result.embeddings?.[0]?.values).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });
  });
});