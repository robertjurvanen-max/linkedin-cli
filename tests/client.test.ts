/**
 * LinkedIn Client Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LinkedInClient } from '../src/lib/client.js';
import { OAuthTokens } from '../src/lib/types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LinkedInClient', () => {
  const validTokens: OAuthTokens = {
    access_token: 'test-access-token',
    expires_in: 3600,
    scope: 'openid profile email w_member_social',
    token_type: 'Bearer',
    created_at: new Date().toISOString()
  };
  
  beforeEach(() => {
    mockFetch.mockReset();
  });
  
  describe('constructor', () => {
    it('should create client with provided tokens', () => {
      const client = new LinkedInClient(validTokens);
      expect(client).toBeInstanceOf(LinkedInClient);
    });
    
    it('should throw error with expired tokens', () => {
      const expiredTokens: OAuthTokens = {
        ...validTokens,
        expires_in: 3600,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      };
      
      expect(() => new LinkedInClient(expiredTokens)).toThrow('expired');
    });
  });
  
  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        sub: '123456789',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        email: 'john@example.com',
        picture: 'https://example.com/photo.jpg'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfile)
      });
      
      const client = new LinkedInClient(validTokens);
      const profile = await client.getProfile();
      
      expect(profile).toEqual(mockProfile);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/userinfo',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });
    
    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Unauthorized' })
      });
      
      const client = new LinkedInClient(validTokens);
      
      await expect(client.getProfile()).rejects.toThrow('LinkedIn API Error');
    });
  });
  
  describe('getMemberUrn', () => {
    it('should return properly formatted URN', async () => {
      const mockProfile = {
        sub: '123456789',
        name: 'John Doe'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfile)
      });
      
      const client = new LinkedInClient(validTokens);
      const urn = await client.getMemberUrn();
      
      expect(urn).toBe('urn:li:person:123456789');
    });
  });
  
  describe('createPost', () => {
    it('should create a text post', async () => {
      const mockProfile = { sub: '123456789', name: 'John Doe' };
      const mockPostResponse = { id: 'urn:li:share:987654321' };
      
      // First call: getProfile for getMemberUrn
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfile)
      });
      
      // Second call: create post
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockPostResponse)
      });
      
      const client = new LinkedInClient(validTokens);
      const result = await client.createPost({ text: 'Hello LinkedIn!' });
      
      expect(result).toEqual(mockPostResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    
    it('should include article data when provided', async () => {
      const mockProfile = { sub: '123456789', name: 'John Doe' };
      const mockPostResponse = { id: 'urn:li:share:987654321' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfile)
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockPostResponse)
      });
      
      const client = new LinkedInClient(validTokens);
      const result = await client.createPost({
        text: 'Check out this article!',
        articleUrl: 'https://example.com/article',
        articleTitle: 'Great Article',
        articleDescription: 'A very interesting read'
      });
      
      expect(result).toEqual(mockPostResponse);
      
      // Check that the second call (create post) included article data
      const createPostCall = mockFetch.mock.calls[1];
      const requestBody = JSON.parse(createPostCall[1].body);
      expect(requestBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('ARTICLE');
    });
    
    it('should handle visibility option', async () => {
      const mockProfile = { sub: '123456789', name: 'John Doe' };
      const mockPostResponse = { id: 'urn:li:share:987654321' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfile)
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockPostResponse)
      });
      
      const client = new LinkedInClient(validTokens);
      await client.createPost({
        text: 'Connections only post',
        visibility: 'CONNECTIONS'
      });
      
      const createPostCall = mockFetch.mock.calls[1];
      const requestBody = JSON.parse(createPostCall[1].body);
      expect(requestBody.visibility['com.linkedin.ugc.MemberNetworkVisibility']).toBe('CONNECTIONS');
    });
  });
  
  describe('getPosts', () => {
    it('should fetch user posts', async () => {
      const mockProfile = { sub: '123456789', name: 'John Doe' };
      const mockPosts = {
        elements: [
          { id: 'post1', lifecycleState: 'PUBLISHED' },
          { id: 'post2', lifecycleState: 'PUBLISHED' }
        ]
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfile)
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockPosts)
      });
      
      const client = new LinkedInClient(validTokens);
      const posts = await client.getPosts(10);
      
      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe('post1');
    });
    
    it('should handle empty posts list', async () => {
      const mockProfile = { sub: '123456789', name: 'John Doe' };
      const mockPosts = { elements: [] };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfile)
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockPosts)
      });
      
      const client = new LinkedInClient(validTokens);
      const posts = await client.getPosts();
      
      expect(posts).toEqual([]);
    });
  });
  
  describe('deletePost', () => {
    it('should delete a post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => ''
      });
      
      const client = new LinkedInClient(validTokens);
      await expect(client.deletePost('urn:li:share:123')).resolves.not.toThrow();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/ugcPosts/urn:li:share:123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });
  
  describe('getOrganizations', () => {
    it('should fetch organizations', async () => {
      const mockOrgs = {
        elements: [
          { id: 'org1', localizedName: 'My Company' },
          { id: 'org2', localizedName: 'Another Org' }
        ]
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockOrgs)
      });
      
      const client = new LinkedInClient(validTokens);
      const orgs = await client.getOrganizations();
      
      expect(orgs).toHaveLength(2);
      expect(orgs[0].localizedName).toBe('My Company');
    });
  });
  
  describe('createOrganizationPost', () => {
    it('should create a post for an organization', async () => {
      const mockPostResponse = { id: 'urn:li:share:987654321' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockPostResponse)
      });
      
      const client = new LinkedInClient(validTokens);
      const result = await client.createOrganizationPost('123456', {
        text: 'Company announcement!'
      });
      
      expect(result).toEqual(mockPostResponse);
      
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.author).toBe('urn:li:organization:123456');
    });
  });
});
