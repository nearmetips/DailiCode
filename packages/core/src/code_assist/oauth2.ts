/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config'; // 确保这一行在最上面，用来加载 .env 文件
import { OAuth2Client, Credentials, Compute } from 'google-auth-library';
import * as http from 'http';
import url from 'url';
import crypto from 'crypto';
import * as net from 'net';
import open from 'open';
import path from 'node:path';
import { promises as fs, existsSync, readFileSync } from 'node:fs';
import * as os from 'os';
import { getErrorMessage } from '../utils/errors.js';
import { AuthType } from '../core/contentGenerator.js';

// --- 正确的定义方式 ---
// 从环境变量中安全地读取 OAuth Client ID 和 Secret
const OAUTH_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
// --------------------

// OAuth Scopes for Cloud Code authorization.
const OAUTH_SCOPE = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const HTTP_REDIRECT = 301;
// 你可以把这里换成你的网站，以获得更好的品牌体验
const SIGN_IN_SUCCESS_URL = 'https://www.dailicode.com';
const SIGN_IN_FAILURE_URL =
  'https://developers.google.com/gemini-code-assist/auth_failure_gemini';

const GEMINI_DIR = '.gemini';
const CREDENTIAL_FILENAME = 'oauth_creds.json';
const GOOGLE_ACCOUNT_ID_FILENAME = 'google_account_id';

/**
 * An Authentication URL for updating the credentials of a Oauth2Client
 * as well as a promise that will resolve when the credentials have
 * been refreshed (or which throws error when refreshing credentials failed).
 */
export interface OauthWebLogin {
  authUrl: string;
  loginCompletePromise: Promise<void>;
}

export async function getOauthClient(
  authType: AuthType,
): Promise<OAuth2Client> {
  // 增加一个检查，如果.env文件没加载成功，就给出明确提示
  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
    throw new Error(
      'Google OAuth Client ID and Secret are not configured. Please ensure you have a .env file in the project root with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET defined.',
    );
  }

  const client = new OAuth2Client({
    clientId: OAUTH_CLIENT_ID,
    clientSecret: OAUTH_CLIENT_SECRET,
  });

  client.on('tokens', async (tokens: Credentials) => {
    await cacheCredentials(tokens);
  });

  // If there are cached creds on disk, they always take precedence
  if (await loadCachedCredentials(client)) {
    // Found valid cached credentials.
    // Check if we need to retrieve Google Account ID
    if (!getCachedGoogleAccountId()) {
      try {
        const googleAccountId = await getRawGoogleAccountId(client);
        if (googleAccountId) {
          await cacheGoogleAccountId(googleAccountId);
        }
      } catch {
        // Non-fatal, continue with existing auth.
      }
    }
    console.log('Loaded cached credentials.');
    return client;
  }

  // In Google Cloud Shell, we can use Application Default Credentials (ADC)
  // provided via its metadata server to authenticate non-interactively using
  // the identity of the user logged into Cloud Shell.
  if (authType === AuthType.CLOUD_SHELL) {
    try {
      console.log("Attempting to authenticate via Cloud Shell VM's ADC.");
      const computeClient = new Compute({
        // We can leave this empty, since the metadata server will provide
        // the service account email.
      });
      await computeClient.getAccessToken();
      console.log('Authentication successful.');

      // Do not cache creds in this case; note that Compute client will handle its own refresh
      return computeClient;
    } catch (e) {
      throw new Error(
        `Could not authenticate using Cloud Shell credentials. Please select a different authentication method or ensure you are in a properly configured environment. Error: ${getErrorMessage(
          e,
        )}`,
      );
    }
  }

  // Otherwise, obtain creds using standard web flow
  const webLogin = await authWithWeb(client);

  console.log(
    `\n\nCode Assist login required.\n` +
      `Attempting to open authentication page in your browser.\n` +
      `Otherwise navigate to:\n\n${webLogin.authUrl}\n\n`,
  );
  await open(webLogin.authUrl);
  console.log('Waiting for authentication...');

  await webLogin.loginCompletePromise;

  return client;
}

async function authWithWeb(client: OAuth2Client): Promise<OauthWebLogin> {
  const port = await getAvailablePort();
  const redirectUri = `http://localhost:${port}/oauth2callback`;
  const state = crypto.randomBytes(32).toString('hex');
  const authUrl: string = client.generateAuthUrl({
    redirect_uri: redirectUri,
    access_type: 'offline',
    scope: OAUTH_SCOPE,
    state,
  });

  const loginCompletePromise = new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url!.indexOf('/oauth2callback') === -1) {
          res.writeHead(HTTP_REDIRECT, { Location: SIGN_IN_FAILURE_URL });
          res.end();
          reject(new Error('Unexpected request: ' + req.url));
        }
        // acquire the code from the querystring, and close the web server.
        const qs = new url.URL(req.url!, 'http://localhost:3000').searchParams;
        if (qs.get('error')) {
          res.writeHead(HTTP_REDIRECT, { Location: SIGN_IN_FAILURE_URL });
          res.end();

          reject(new Error(`Error during authentication: ${qs.get('error')}`));
        } else if (qs.get('state') !== state) {
          res.end('State mismatch. Possible CSRF attack');

          reject(new Error('State mismatch. Possible CSRF attack'));
        } else if (qs.get('code')) {
          const { tokens } = await client.getToken({
            code: qs.get('code')!,
            redirect_uri: redirectUri,
          });
          client.setCredentials(tokens);
          // Retrieve and cache Google Account ID during authentication
          try {
            const googleAccountId = await getRawGoogleAccountId(client);
            if (googleAccountId) {
              await cacheGoogleAccountId(googleAccountId);
            }
          } catch (error) {
            console.error(
              'Failed to retrieve Google Account ID during authentication:',
              error,
            );
            // Don't fail the auth flow if Google Account ID retrieval fails
          }

          res.writeHead(HTTP_REDIRECT, { Location: SIGN_IN_SUCCESS_URL });
          res.end();
          resolve();
        } else {
          reject(new Error('No code found in request'));
        }
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

export function getAvailablePort(): Promise<number> {
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

async function loadCachedCredentials(client: OAuth2Client): Promise<boolean> {
  try {
    const keyFile =
      process.env.GOOGLE_APPLICATION_CREDENTIALS || getCachedCredentialPath();

    const creds = await fs.readFile(keyFile, 'utf-8');
    client.setCredentials(JSON.parse(creds));

    // This will verify locally that the credentials look good.
    const { token } = await client.getAccessToken();
    if (!token) {
      return false;
    }

    // This will check with the server to see if it hasn't been revoked.
    await client.getTokenInfo(token);

    return true;
  } catch (_) {
    return false;
  }
}

async function cacheCredentials(credentials: Credentials) {
  const filePath = getCachedCredentialPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const credString = JSON.stringify(credentials, null, 2);
  await fs.writeFile(filePath, credString);
}

function getCachedCredentialPath(): string {
  return path.join(os.homedir(), GEMINI_DIR, CREDENTIAL_FILENAME);
}

function getGoogleAccountIdCachePath(): string {
  return path.join(os.homedir(), GEMINI_DIR, GOOGLE_ACCOUNT_ID_FILENAME);
}

async function cacheGoogleAccountId(googleAccountId: string): Promise<void> {
  const filePath = getGoogleAccountIdCachePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, googleAccountId, 'utf-8');
}

export function getCachedGoogleAccountId(): string | null {
  try {
    const filePath = getGoogleAccountIdCachePath();
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8').trim() || null;
    }
    return null;
  } catch (error) {
    console.debug('Error reading cached Google Account ID:', error);
    return null;
  }
}

export async function clearCachedCredentialFile() {
  try {
    await fs.rm(getCachedCredentialPath(), { force: true });
    // Clear the Google Account ID cache when credentials are cleared
    await fs.rm(getGoogleAccountIdCachePath(), { force: true });
  } catch (_) {
    /* empty */
  }
}

/**
 * Retrieves the authenticated user's Google Account ID from Google's UserInfo API.
 * @param client - The authenticated OAuth2Client
 * @returns The user's Google Account ID or null if not available
 */
export async function getRawGoogleAccountId(
  client: OAuth2Client,
): Promise<string | null> {
  try {
    // 1. Get a new Access Token including the id_token
    const refreshedTokens = await new Promise<Credentials | null>(
      (resolve, reject) => {
        client.refreshAccessToken((err, tokens) => {
          if (err) {
            return reject(err);
          }
          resolve(tokens ?? null);
        });
      },
    );

    if (!refreshedTokens?.id_token) {
      console.warn('No id_token obtained after refreshing tokens.');
      return null;
    }

    // 2. Verify the ID token to securely get the user's Google Account ID.
    const ticket = await client.verifyIdToken({
      idToken: refreshedTokens.id_token,
      audience: OAUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub) {
      console.warn('Could not extract sub claim from verified ID token.');
      return null;
    }

    return payload.sub;
  } catch (error) {
    console.error('Error retrieving or verifying Google Account ID:', error);
    return null;
  }
}