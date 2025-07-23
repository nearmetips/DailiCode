/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailicodeOAuth2Client } from './dailicode-oauth2.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('DailicodeOAuth2Client', () => {
  let client: DailicodeOAuth2Client;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new DailicodeOAuth2Client();
  });

  describe('getAccessToken', () => {
    it('should throw error when no credentials are available', async () => {
      await expect(client.getAccessToken()).rejects.toThrow(
        'No credentials available. Please authenticate first.'
      );
    });

    it('should return access token when credentials are valid', async () => {
      const mockCredentials = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_at: Date.now() + 3600000, // 1 hour from now
      };

      client.setCredentials(mockCredentials);
      const token = await client.getAccessToken();
      expect(token).toBe('test-token');
    });

    it('should refresh token when expired and refresh token is available', async () => {
      const mockCredentials = {
        access_token: 'old-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_at: Date.now() - 1000, // Expired
      };

      const mockRefreshResponse = {
        access_token: 'new-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      client.setCredentials(mockCredentials);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRefreshResponse),
      });

      const token = await client.getAccessToken();
      expect(token).toBe('new-token');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.dailicode.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info with access token', async () => {
      const mockCredentials = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_at: Date.now() + 3600000,
      };

      const mockUserInfo = {
        id: '12345',
        name: 'Test User',
        email: 'test@example.com',
      };

      client.setCredentials(mockCredentials);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      });

      const userInfo = await client.getUserInfo();
      expect(userInfo).toEqual(mockUserInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.dailicode.com/api/user',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token',
          },
        })
      );
    });

    it('should throw error when API request fails', async () => {
      const mockCredentials = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_at: Date.now() + 3600000,
      };

      client.setCredentials(mockCredentials);

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      await expect(client.getUserInfo()).rejects.toThrow(
        'Failed to get user info: Unauthorized'
      );
    });
  });

  describe('clearCachedCredentials', () => {
    it('should clear credentials and set to null', async () => {
      const mockCredentials = {
        access_token: 'test-token',
        token_type: 'Bearer',
      };

      client.setCredentials(mockCredentials);
      await client.clearCachedCredentials();

      await expect(client.getAccessToken()).rejects.toThrow(
        'No credentials available. Please authenticate first.'
      );
    });
  });
});