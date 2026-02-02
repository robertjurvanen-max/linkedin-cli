/**
 * LinkedIn OAuth 2.0 Implementation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as crypto from 'crypto';
import { OAuthTokens, OAuthConfig } from './types.js';

// LinkedIn OAuth endpoints
const AUTHORIZATION_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

// Default scopes for LinkedIn API
export const DEFAULT_SCOPES = [
  'openid',
  'profile', 
  'email',
  'w_member_social',
  'r_organization_social',
  'w_organization_social',
  'rw_organization_admin'
];

/**
 * Get the credentials directory path
 */
export function getCredentialsDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  
  // Check for existing clawdbot credentials directory
  const clawdbotDir = path.join(homeDir, '.clawdbot', 'credentials');
  if (fs.existsSync(clawdbotDir)) {
    return clawdbotDir;
  }
  
  // Check for existing moltbot credentials directory  
  const moltbotDir = path.join(homeDir, '.moltbot', 'credentials');
  if (fs.existsSync(moltbotDir)) {
    return moltbotDir;
  }
  
  // Default to clawdbot
  return clawdbotDir;
}

/**
 * Get the credentials file path
 */
export function getCredentialsPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  
  // Check clawdbot first
  const clawdbotPath = path.join(homeDir, '.clawdbot', 'credentials', 'linkedin.json');
  if (fs.existsSync(clawdbotPath)) {
    return clawdbotPath;
  }
  
  // Check moltbot
  const moltbotPath = path.join(homeDir, '.moltbot', 'credentials', 'linkedin.json');
  if (fs.existsSync(moltbotPath)) {
    return moltbotPath;
  }
  
  // Default to clawdbot
  return clawdbotPath;
}

/**
 * Generate a random state string for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Build the authorization URL
 */
export function buildAuthorizationUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state: state,
    scope: config.scopes.join(' ')
  });
  
  return `${AUTHORIZATION_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  config: OAuthConfig
): Promise<OAuthTokens> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokenData = await response.json() as Omit<OAuthTokens, 'created_at'>;
  
  return {
    ...tokenData,
    created_at: new Date().toISOString()
  };
}

/**
 * Refresh an access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  config: OAuthConfig
): Promise<OAuthTokens> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const tokenData = await response.json() as Omit<OAuthTokens, 'created_at'>;
  
  return {
    ...tokenData,
    created_at: new Date().toISOString()
  };
}

/**
 * Save tokens to the credentials file
 */
export function saveTokens(tokens: OAuthTokens): void {
  const credentialsDir = getCredentialsDir();
  
  // Ensure credentials directory exists
  if (!fs.existsSync(credentialsDir)) {
    fs.mkdirSync(credentialsDir, { recursive: true, mode: 0o700 });
  }
  
  const credentialsPath = path.join(credentialsDir, 'linkedin.json');
  fs.writeFileSync(credentialsPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

/**
 * Load tokens from the credentials file
 */
export function loadTokens(): OAuthTokens | null {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  
  // Check clawdbot first
  const clawdbotPath = path.join(homeDir, '.clawdbot', 'credentials', 'linkedin.json');
  if (fs.existsSync(clawdbotPath)) {
    const content = fs.readFileSync(clawdbotPath, 'utf-8');
    return JSON.parse(content) as OAuthTokens;
  }
  
  // Check moltbot
  const moltbotPath = path.join(homeDir, '.moltbot', 'credentials', 'linkedin.json');
  if (fs.existsSync(moltbotPath)) {
    const content = fs.readFileSync(moltbotPath, 'utf-8');
    return JSON.parse(content) as OAuthTokens;
  }
  
  return null;
}

/**
 * Delete stored tokens
 */
export function deleteTokens(): boolean {
  const credentialsPath = getCredentialsPath();
  
  if (fs.existsSync(credentialsPath)) {
    fs.unlinkSync(credentialsPath);
    return true;
  }
  
  return false;
}

/**
 * Check if tokens are expired
 */
export function isTokenExpired(tokens: OAuthTokens): boolean {
  const createdAt = new Date(tokens.created_at).getTime();
  const expiresAt = createdAt + (tokens.expires_in * 1000);
  const now = Date.now();
  
  // Consider expired if within 5 minutes of expiry
  return now >= (expiresAt - 5 * 60 * 1000);
}

/**
 * Check if tokens will expire soon (within 7 days)
 */
export function isTokenExpiringSoon(tokens: OAuthTokens): boolean {
  const createdAt = new Date(tokens.created_at).getTime();
  const expiresAt = createdAt + (tokens.expires_in * 1000);
  const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
  
  return expiresAt <= sevenDaysFromNow;
}

/**
 * Start a local HTTP server to receive the OAuth callback
 */
export function startCallbackServer(port: number, expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${port}`);
      
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h1>Authorization Failed</h1><p>${errorDescription || error}</p></body></html>`);
          server.close();
          reject(new Error(errorDescription || error));
          return;
        }
        
        if (state !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Invalid State</h1><p>CSRF validation failed.</p></body></html>');
          server.close();
          reject(new Error('Invalid state parameter'));
          return;
        }
        
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>No Code</h1><p>Authorization code not received.</p></body></html>');
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1>✅ Authorization Successful</h1>
              <p>You can close this window and return to the CLI.</p>
            </body>
          </html>
        `);
        
        server.close();
        resolve(code);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    });
    
    server.on('error', (err) => {
      reject(err);
    });
    
    server.listen(port, () => {
      console.log(`Callback server listening on http://localhost:${port}`);
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timeout'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Get OAuth configuration from environment
 */
export function getOAuthConfig(): OAuthConfig {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const port = process.env.LINKEDIN_OAUTH_PORT || '4002';
  const scopes = process.env.LINKEDIN_SCOPES?.split(',') || DEFAULT_SCOPES;
  
  if (!clientId || !clientSecret) {
    throw new Error(
      'LinkedIn OAuth credentials not configured.\n' +
      'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables.'
    );
  }
  
  return {
    clientId,
    clientSecret,
    redirectUri: `http://localhost:${port}/callback`,
    scopes
  };
}
