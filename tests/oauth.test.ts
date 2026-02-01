/**
 * OAuth Module Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateState,
  buildAuthorizationUrl,
  isTokenExpired,
  isTokenExpiringSoon,
  getCredentialsDir,
  DEFAULT_SCOPES
} from '../src/lib/oauth.js';
import { OAuthConfig, OAuthTokens } from '../src/lib/types.js';

describe('OAuth Module', () => {
  describe('generateState', () => {
    it('should generate a random state string', () => {
      const state1 = generateState();
      const state2 = generateState();
      
      expect(state1).toBeTruthy();
      expect(state2).toBeTruthy();
      expect(state1).not.toBe(state2);
    });
    
    it('should generate URL-safe state strings', () => {
      const state = generateState();
      // URL-safe base64 should not contain +, /, or =
      expect(state).not.toMatch(/[+/=]/);
    });
    
    it('should generate states of consistent length', () => {
      const state1 = generateState();
      const state2 = generateState();
      
      // 32 bytes base64url encoded = ~43 characters
      expect(state1.length).toBeGreaterThan(40);
      expect(state2.length).toBeGreaterThan(40);
    });
  });
  
  describe('buildAuthorizationUrl', () => {
    const mockConfig: OAuthConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:4002/callback',
      scopes: ['openid', 'profile', 'email']
    };
    
    it('should build a valid authorization URL', () => {
      const state = 'test-state-123';
      const url = buildAuthorizationUrl(mockConfig, state);
      
      expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=test-state-123');
      expect(url).toContain('response_type=code');
    });
    
    it('should include the redirect URI', () => {
      const state = 'test-state';
      const url = buildAuthorizationUrl(mockConfig, state);
      
      expect(url).toContain(encodeURIComponent('http://localhost:4002/callback'));
    });
    
    it('should include scopes', () => {
      const state = 'test-state';
      const url = buildAuthorizationUrl(mockConfig, state);
      
      expect(url).toContain('scope=');
      expect(url).toContain('openid');
      expect(url).toContain('profile');
      expect(url).toContain('email');
    });
    
    it('should handle empty scopes', () => {
      const config = { ...mockConfig, scopes: [] };
      const state = 'test-state';
      const url = buildAuthorizationUrl(config, state);
      
      expect(url).toContain('scope=');
    });
    
    it('should handle special characters in state', () => {
      const state = 'test+state/123=';
      const url = buildAuthorizationUrl(mockConfig, state);
      
      expect(url).toContain(encodeURIComponent(state));
    });
  });
  
  describe('isTokenExpired', () => {
    it('should return false for valid tokens', () => {
      const tokens: OAuthTokens = {
        access_token: 'test-token',
        expires_in: 3600, // 1 hour
        scope: 'openid profile',
        token_type: 'Bearer',
        created_at: new Date().toISOString()
      };
      
      expect(isTokenExpired(tokens)).toBe(false);
    });
    
    it('should return true for expired tokens', () => {
      const oneHourAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const tokens: OAuthTokens = {
        access_token: 'test-token',
        expires_in: 3600, // 1 hour
        scope: 'openid profile',
        token_type: 'Bearer',
        created_at: oneHourAgo.toISOString()
      };
      
      expect(isTokenExpired(tokens)).toBe(true);
    });
    
    it('should return true for tokens expiring within 5 minutes', () => {
      const almostExpired = new Date(Date.now() - 55 * 60 * 1000); // 55 minutes ago
      const tokens: OAuthTokens = {
        access_token: 'test-token',
        expires_in: 3600, // 1 hour
        scope: 'openid profile',
        token_type: 'Bearer',
        created_at: almostExpired.toISOString()
      };
      
      expect(isTokenExpired(tokens)).toBe(true);
    });
    
    it('should handle long-lived tokens', () => {
      const tokens: OAuthTokens = {
        access_token: 'test-token',
        expires_in: 60 * 24 * 60 * 60, // 60 days
        scope: 'openid profile',
        token_type: 'Bearer',
        created_at: new Date().toISOString()
      };
      
      expect(isTokenExpired(tokens)).toBe(false);
    });
  });
  
  describe('isTokenExpiringSoon', () => {
    it('should return false for tokens with more than 7 days left', () => {
      const tokens: OAuthTokens = {
        access_token: 'test-token',
        expires_in: 30 * 24 * 60 * 60, // 30 days
        scope: 'openid profile',
        token_type: 'Bearer',
        created_at: new Date().toISOString()
      };
      
      expect(isTokenExpiringSoon(tokens)).toBe(false);
    });
    
    it('should return true for tokens expiring within 7 days', () => {
      const tokens: OAuthTokens = {
        access_token: 'test-token',
        expires_in: 5 * 24 * 60 * 60, // 5 days
        scope: 'openid profile',
        token_type: 'Bearer',
        created_at: new Date().toISOString()
      };
      
      expect(isTokenExpiringSoon(tokens)).toBe(true);
    });
    
    it('should return true for already expired tokens', () => {
      const oneHourAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const tokens: OAuthTokens = {
        access_token: 'test-token',
        expires_in: 3600,
        scope: 'openid profile',
        token_type: 'Bearer',
        created_at: oneHourAgo.toISOString()
      };
      
      expect(isTokenExpiringSoon(tokens)).toBe(true);
    });
  });
  
  describe('DEFAULT_SCOPES', () => {
    it('should include essential scopes', () => {
      expect(DEFAULT_SCOPES).toContain('openid');
      expect(DEFAULT_SCOPES).toContain('profile');
      expect(DEFAULT_SCOPES).toContain('email');
      expect(DEFAULT_SCOPES).toContain('w_member_social');
    });
    
    it('should be an array', () => {
      expect(Array.isArray(DEFAULT_SCOPES)).toBe(true);
    });
  });
  
  describe('getCredentialsDir', () => {
    it('should return a path string', () => {
      const dir = getCredentialsDir();
      expect(typeof dir).toBe('string');
      expect(dir.length).toBeGreaterThan(0);
    });
    
    it('should include credentials in the path', () => {
      const dir = getCredentialsDir();
      expect(dir).toContain('credentials');
    });
  });
});
