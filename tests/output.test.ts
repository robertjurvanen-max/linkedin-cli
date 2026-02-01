/**
 * Output Formatting Tests
 */

import { describe, it, expect } from 'vitest';
import {
  formatProfile,
  formatPosts,
  formatOrganizations,
  formatAuthStatus,
  formatSuccess,
  formatError
} from '../src/lib/output.js';
import { LinkedInProfile, LinkedInPost, Organization } from '../src/lib/types.js';

describe('Output Formatting', () => {
  describe('formatProfile', () => {
    const mockProfile: LinkedInProfile = {
      sub: '123456789',
      name: 'John Doe',
      given_name: 'John',
      family_name: 'Doe',
      email: 'john@example.com',
      picture: 'https://example.com/photo.jpg',
      locale: {
        country: 'US',
        language: 'en'
      }
    };
    
    it('should format profile as table by default', () => {
      const output = formatProfile(mockProfile);
      
      expect(output).toContain('PROFILE INFORMATION');
      expect(output).toContain('John Doe');
      expect(output).toContain('123456789');
      expect(output).toContain('john@example.com');
    });
    
    it('should format profile as JSON when specified', () => {
      const output = formatProfile(mockProfile, 'json');
      
      const parsed = JSON.parse(output);
      expect(parsed.name).toBe('John Doe');
      expect(parsed.sub).toBe('123456789');
    });
    
    it('should handle missing optional fields', () => {
      const minimalProfile: LinkedInProfile = {
        sub: '123',
        name: 'Jane',
        given_name: 'Jane',
        family_name: 'Doe'
      };
      
      const output = formatProfile(minimalProfile);
      
      expect(output).toContain('Jane');
      expect(output).not.toContain('undefined');
    });
  });
  
  describe('formatPosts', () => {
    const mockPosts: LinkedInPost[] = [
      {
        id: 'post1',
        author: 'urn:li:person:123',
        lifecycleState: 'PUBLISHED',
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        },
        created: { time: Date.now() - 86400000 },
        lastModified: { time: Date.now() },
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: 'Hello LinkedIn!' },
            shareMediaCategory: 'NONE'
          }
        }
      }
    ];
    
    it('should format posts as table by default', () => {
      const output = formatPosts(mockPosts);
      
      expect(output).toContain('YOUR POSTS');
      expect(output).toContain('post1');
      expect(output).toContain('Hello LinkedIn!');
      expect(output).toContain('PUBLISHED');
    });
    
    it('should format posts as JSON when specified', () => {
      const output = formatPosts(mockPosts, 'json');
      
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].id).toBe('post1');
    });
    
    it('should handle empty posts array', () => {
      const output = formatPosts([]);
      
      expect(output).toContain('No posts found');
    });
    
    it('should truncate long post content', () => {
      const longPost: LinkedInPost = {
        ...mockPosts[0],
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: 'A'.repeat(100) },
            shareMediaCategory: 'NONE'
          }
        }
      };
      
      const output = formatPosts([longPost]);
      
      expect(output).toContain('...');
    });
  });
  
  describe('formatOrganizations', () => {
    const mockOrgs: Organization[] = [
      {
        id: 'org1',
        localizedName: 'Acme Inc',
        vanityName: 'acme'
      },
      {
        id: 'org2',
        localizedName: 'Beta Corp'
      }
    ];
    
    it('should format organizations as table by default', () => {
      const output = formatOrganizations(mockOrgs);
      
      expect(output).toContain('YOUR ORGANIZATIONS');
      expect(output).toContain('Acme Inc');
      expect(output).toContain('acme');
      expect(output).toContain('Beta Corp');
    });
    
    it('should format organizations as JSON when specified', () => {
      const output = formatOrganizations(mockOrgs, 'json');
      
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].localizedName).toBe('Acme Inc');
    });
    
    it('should handle empty organizations array', () => {
      const output = formatOrganizations([]);
      
      expect(output).toContain('No organizations found');
    });
  });
  
  describe('formatAuthStatus', () => {
    it('should format authenticated status', () => {
      const output = formatAuthStatus(true, '123456', 86400, 'John Doe');
      
      expect(output).toContain('✅ Authenticated');
      expect(output).toContain('123456');
      expect(output).toContain('John Doe');
      expect(output).toContain('Days Left');
    });
    
    it('should format unauthenticated status', () => {
      const output = formatAuthStatus(false);
      
      expect(output).toContain('NOT LOGGED IN');
      expect(output).toContain('linkedin auth login');
    });
    
    it('should calculate days left correctly', () => {
      const sevenDays = 7 * 24 * 60 * 60;
      const output = formatAuthStatus(true, '123', sevenDays, 'Test');
      
      expect(output).toContain('7');
    });
  });
  
  describe('formatSuccess', () => {
    it('should format success message with checkmark', () => {
      const output = formatSuccess('Operation completed');
      
      expect(output).toContain('✅');
      expect(output).toContain('Operation completed');
    });
  });
  
  describe('formatError', () => {
    it('should format error message with X', () => {
      const output = formatError('Something went wrong');
      
      expect(output).toContain('❌');
      expect(output).toContain('Something went wrong');
    });
  });
});
