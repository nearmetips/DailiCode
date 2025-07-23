/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import * as http from 'http';
import url from 'url';
import crypto from 'crypto';
import * as net from 'net';
import open from 'open';
import path from 'node:path';
import { promises as fs, existsSync, readFileSync } from 'node:fs';
import * as os from 'os';
import { getErrorMessage } from '../utils/errors.js';

// DailiCode OAuth Configuration
const DAILICODE_CLIENT_ID = process.env.DAILICODE_CLIENT_ID || '';
const DAILICODE_CLIENT_SECRET = process.env.DAILICODE_CLIENT_SECRET || '';
const DAILICODE_AUTH_URL = 'https://www.dailicode.com/oauth/authorize';
const DAILICODE_TOKEN_URL = 'https://www.dailicode.com/oauth/token';
const DAILICODE_USER_INFO_URL = 'https://www.dailicode.com/api/user';

// OAuth Scopes for DailiCode authorization
const DAILICODE_OAUTH_SCOPE = ['read', 'write'];

const HTTP_REDIRECT = 301;
const SIGN_IN_SUCCESS_URL = 'https://www.dailicode.com/auth/success';
const SIGN_IN_FAILURE_URL = 'https://www.dailicode.com/auth/failure';

const GEMINI_DIR = '.gemini';
const DAILICODE_CREDENTIAL_FILENAME = 'dailicode_oauth_creds.json';
const DAILICODE_USER_ID_FILENAME = 'dailicode_user_id';

export interface DailicodeCredentials {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  expires_at?: number;
}

export interface DailicodeWebLogin {
  authUrl: string;
  loginCompletePromise: Promise<void>;
}

export class DailicodeOAuth2Client {
  private credentials: DailicodeCredentials | null = null;

  constructor() {
    this.loadCachedCredentials();
  }

  async getAccessToken(): Promise<string> {
    if (!this.credentials) {
      throw new Error('No credentials available. Please authenticate first.');
    }

    // Check if token is expired
    if (this.isTokenExpired()) {
      if (this.credentials.refresh_token) {
        await this.refreshAccessToken();
      } else {
        throw new Error('Access token expired and no refresh token available. Please re-authenticate.');
      }
    }

    return this.credentials.access_token;
  }

  private isTokenExpired(): boolean {
    if (!this.credentials?.expires_at) {
      return false; // If no expiry info, assume it's still valid
    }
    return Date.now() >= this.credentials.expires_at;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.credentials?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(DAILICODE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refresh_token,
        client_id: DAILICODE_CLIENT_ID,
        client_secret: DAILICODE_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const tokenData = await response.json();
    this.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || this.credentials.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
      expires_at: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
    });

    await this.cacheCredentials();
  }

  setCredentials(credentials: DailicodeCredentials): void {
    this.credentials = credentials;
  }

  async getUserInfo(): Promise<any> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(DAILICODE_USER_INFO_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return response.json();
  }

  async loadCachedCredentials(): Promise<boolean> {
    try {
      const credPath = this.getCachedCredentialPath();
      if (!existsSync(credPath)) {
        return false;
      }

      const credData = await fs.readFile(credPath, 'utf-8');
      const credentials = JSON.parse(credData) as DailicodeCredentials;
      
      this.setCredentials(credentials);
      return true;
    } catch (error) {
      console.debug('Failed to load cached DailiCode credentials:', error);
      return false;
    }
  }

  async cacheCredentials(): Promise<void> {
    if (!this.credentials) {
      return;
    }

    const filePath = this.getCachedCredentialPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    const credString = JSON.stringify(this.credentials, null, 2);
    await fs.writeFile(filePath, credString);
  }

  private getCachedCredentialPath(): string {
    return path.join(os.homedir(), GEMINI_DIR, DAILICODE_CREDENTIAL_FILENAME);
  }

  async clearCachedCredentials(): Promise<void> {
    try {
      await fs.rm(this.getCachedCredentialPath(), { force: true });
      await fs.rm(this.getDailicodeUserIdCachePath(), { force: true });
      this.credentials = null;
    } catch (error) {
      console.debug('Error clearing DailiCode credentials:', error);
    }
  }

  private getDailicodeUserIdCachePath(): string {
    return path.join(os.homedir(), GEMINI_DIR, DAILICODE_USER_ID_FILENAME);
  }

  async cacheDailicodeUserId(userId: string): Promise<void> {
    const filePath = this.getDailicodeUserIdCachePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, userId, 'utf-8');
  }

  getCachedDailicodeUserId(): string | null {
    try {
      const filePath = this.getDailicodeUserIdCachePath();
      if (existsSync(filePath)) {
        return readFileSync(filePath, 'utf-8').trim() || null;
      }
      return null;
    } catch (error) {
      console.debug('Error reading cached DailiCode User ID:', error);
      return null;
    }
  }
}

export async function getDailicodeOauthClient(): Promise<DailicodeOAuth2Client> {
  const client = new DailicodeOAuth2Client();

  // Check if we have valid cached credentials
  if (await client.loadCachedCredentials()) {
    try {
      // Verify credentials by making a test API call
      await client.getUserInfo();
      console.log('Loaded cached DailiCode credentials.');
      return client;
    } catch (error) {
      console.log('Cached DailiCode credentials are invalid, re-authenticating...');
      await client.clearCachedCredentials();
    }
  }

  // Perform OAuth flow
  const webLogin = await authWithDailicodeWeb(client);

  console.log(
    `\n\nDailiCode login required.\n` +
      `Attempting to open authentication page in your browser.\n` +
      `Otherwise navigate to:\n\n${webLogin.authUrl}\n\n`,
  );
  
  await open(webLogin.authUrl);
  console.log('Waiting for DailiCode authentication...');

  await webLogin.loginCompletePromise;

  return client;
}

async function authWithDailicodeWeb(client: DailicodeOAuth2Client): Promise<DailicodeWebLogin> {
  const port = await getAvailablePort();
  const redirectUri = `http://localhost:${port}/oauth2callback`;
  const state = crypto.randomBytes(32).toString('hex');
  
  const authUrl = `${DAILICODE_AUTH_URL}?` + new URLSearchParams({
    client_id: DAILICODE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DAILICODE_OAUTH_SCOPE.join(' '),
    state,
  }).toString();

  const loginCompletePromise = new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url!.indexOf('/oauth2callback') === -1) {
          res.writeHead(HTTP_REDIRECT, { Location: SIGN_IN_FAILURE_URL });
          res.end();
          reject(new Error('Unexpected request: ' + req.url));
          return;
        }

        const qs = new url.URL(req.url!, 'http://localhost:3000').searchParams;
        
        if (qs.get('error')) {
          res.writeHead(HTTP_REDIRECT, { Location: SIGN_IN_FAILURE_URL });
          res.end();
          reject(new Error(`Error during DailiCode authentication: ${qs.get('error')}`));
          return;
        }
        
        if (qs.get('state') !== state) {
          res.end('State mismatch. Possible CSRF attack');
          reject(new Error('State mismatch. Possible CSRF attack'));
          return;
        }
        
        if (!qs.get('code')) {
          reject(new Error('No authorization code found in request'));
          return;
        }

        // Exchange authorization code for access token
        const tokenResponse = await fetch(DAILICODE_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: qs.get('code')!,
            redirect_uri: redirectUri,
            client_id: DAILICODE_CLIENT_ID,
            client_secret: DAILICODE_CLIENT_SECRET,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to exchange code for token: ${tokenResponse.statusText}`);
        }

        const tokenData = await tokenResponse.json();
        const credentials: DailicodeCredentials = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type || 'Bearer',
          expires_in: tokenData.expires_in,
          expires_at: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
        };

        client.setCredentials(credentials);
        await client.cacheCredentials();

        // Get and cache user info
        try {
          const userInfo = await client.getUserInfo();
          if (userInfo.id) {
            await client.cacheDailicodeUserId(userInfo.id.toString());
          }
        } catch (error) {
          console.error('Failed to retrieve DailiCode user info during authentication:', error);
          // Don't fail the auth flow if user info retrieval fails
        }

        res.writeHead(HTTP_REDIRECT, { Location: SIGN_IN_SUCCESS_URL });
        res.end();
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        server.close();
      }
    });
    
    server.listen(port);
  });

  return {
    authUrl,
    loginCompletePromise,
  };
}

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = 0;
    try {
      const server = net.createServer();
      server.listen(0, () => {
        const address = server.address()! as net.AddressInfo;
        port = address.port;
      });
      server.on('listening', () => {
        server.close();
        server.unref();
      });
      server.on('error', (e) => reject(e));
      server.on('close', () => resolve(port));
    } catch (e) {
      reject(e);
    }
  });
}