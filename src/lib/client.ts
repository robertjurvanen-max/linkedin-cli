/**
 * LinkedIn API Client
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  OAuthTokens, 
  LinkedInProfile, 
  CreatePostOptions, 
  LinkedInPost,
  Organization,
  ImageUploadResponse,
  APIError
} from './types.js';
import { loadTokens, isTokenExpired } from './oauth.js';

/**
 * Check if a string is a local file path
 */
function isLocalPath(str: string): boolean {
  return str.startsWith('/') || str.startsWith('./') || str.startsWith('../') || str.startsWith('~');
}

/**
 * Read image from local file or URL
 */
async function getImageBuffer(source: string): Promise<ArrayBuffer> {
  if (isLocalPath(source)) {
    // Expand ~ to home directory
    const filePath = source.startsWith('~') 
      ? path.join(process.env.HOME || '', source.slice(1))
      : source;
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const buffer = fs.readFileSync(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } else {
    // Fetch from URL
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }
}

const API_BASE = 'https://api.linkedin.com/v2';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

/**
 * LinkedIn API Client
 */
export class LinkedInClient {
  private tokens: OAuthTokens;
  
  constructor(tokens?: OAuthTokens) {
    if (tokens) {
      this.tokens = tokens;
    } else {
      const loadedTokens = loadTokens();
      if (!loadedTokens) {
        throw new Error(
          'No LinkedIn credentials found.\n' +
          'Run: linkedin auth login'
        );
      }
      this.tokens = loadedTokens;
    }
    
    if (isTokenExpired(this.tokens)) {
      throw new Error(
        'LinkedIn access token has expired.\n' +
        'Run: linkedin auth refresh'
      );
    }
  }
  
  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.tokens.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let error: APIError;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { status: response.status, message: errorText };
      }
      throw new Error(`LinkedIn API Error (${response.status}): ${error.message || errorText}`);
    }
    
    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    
    return JSON.parse(text) as T;
  }
  
  /**
   * Get the authenticated user's profile
   */
  async getProfile(): Promise<LinkedInProfile> {
    return this.request<LinkedInProfile>(USERINFO_URL);
  }
  
  /**
   * Get the authenticated user's LinkedIn member ID (URN format)
   */
  async getMemberUrn(): Promise<string> {
    const profile = await this.getProfile();
    return `urn:li:person:${profile.sub}`;
  }
  
  /**
   * Create a text post
   */
  async createPost(options: CreatePostOptions): Promise<{ id: string }> {
    const authorUrn = await this.getMemberUrn();
    
    const payload: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': options.visibility || 'PUBLIC'
      },
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: options.text
          },
          shareMediaCategory: 'NONE'
        }
      }
    };
    
    // Add article if URL provided
    if (options.articleUrl) {
      const shareContent = payload.specificContent as Record<string, Record<string, unknown>>;
      shareContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      shareContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        originalUrl: options.articleUrl,
        title: options.articleTitle ? { text: options.articleTitle } : undefined,
        description: options.articleDescription ? { text: options.articleDescription } : undefined
      }];
    }
    
    const response = await this.request<{ id: string }>('/ugcPosts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    return response;
  }
  
  /**
   * Create a post with an image (supports local file paths or URLs)
   */
  async createImagePost(options: CreatePostOptions & { imageUrl: string }): Promise<{ id: string }> {
    const authorUrn = await this.getMemberUrn();
    
    // Step 1: Register the image upload
    const registerResponse = await this.registerImageUpload(authorUrn);
    const uploadUrl = registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const asset = registerResponse.value.asset;
    
    // Step 2: Get the image (from local file or URL)
    const imageBuffer = await getImageBuffer(options.imageUrl);
    
    // Step 3: Upload the image to LinkedIn
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.tokens.access_token}`,
        'Content-Type': 'application/octet-stream'
      },
      body: imageBuffer
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
    }
    
    // Step 4: Create the post with the uploaded image
    const payload = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': options.visibility || 'PUBLIC'
      },
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: options.text
          },
          shareMediaCategory: 'IMAGE',
          media: [{
            status: 'READY',
            media: asset
          }]
        }
      }
    };
    
    return this.request<{ id: string }>('/ugcPosts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
  
  /**
   * Register an image upload
   */
  private async registerImageUpload(ownerUrn: string): Promise<ImageUploadResponse> {
    const payload = {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: ownerUrn,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent'
        }]
      }
    };
    
    return this.request<ImageUploadResponse>('/assets?action=registerUpload', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
  
  /**
   * Get user's posts
   */
  async getPosts(count: number = 10): Promise<LinkedInPost[]> {
    const authorUrn = await this.getMemberUrn();
    const encodedUrn = encodeURIComponent(authorUrn);
    
    const response = await this.request<{ elements: LinkedInPost[] }>(
      `/ugcPosts?q=authors&authors=List(${encodedUrn})&count=${count}`
    );
    
    return response.elements || [];
  }
  
  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    await this.request(`/ugcPosts/${postId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Get organizations the user administers
   */
  async getOrganizations(): Promise<Organization[]> {
    const response = await this.request<{ elements: Organization[] }>(
      '/organizationalEntityAcls?q=roleAssignee&projection=(elements*(organizationalTarget~(id,localizedName,vanityName,logoV2)))'
    );
    
    return response.elements || [];
  }
  
  /**
   * Create a post on behalf of an organization
   */
  async createOrganizationPost(
    organizationId: string,
    options: CreatePostOptions
  ): Promise<{ id: string }> {
    const orgUrn = `urn:li:organization:${organizationId}`;
    
    const payload = {
      author: orgUrn,
      lifecycleState: 'PUBLISHED',
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': options.visibility || 'PUBLIC'
      },
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: options.text
          },
          shareMediaCategory: 'NONE'
        }
      }
    };
    
    return this.request<{ id: string }>('/ugcPosts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Create an image post on behalf of an organization (supports local file paths or URLs)
   */
  async createOrganizationImagePost(
    organizationId: string,
    options: CreatePostOptions & { imageUrl: string }
  ): Promise<{ id: string }> {
    const orgUrn = `urn:li:organization:${organizationId}`;
    
    // Step 1: Register the image upload with org as owner
    const registerResponse = await this.registerImageUpload(orgUrn);
    const uploadUrl = registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const asset = registerResponse.value.asset;
    
    // Step 2: Get the image (from local file or URL)
    const imageBuffer = await getImageBuffer(options.imageUrl);
    
    // Step 3: Upload the image to LinkedIn
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.tokens.access_token}`,
        'Content-Type': 'application/octet-stream'
      },
      body: imageBuffer
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
    }
    
    // Step 4: Create the post with the uploaded image
    const payload = {
      author: orgUrn,
      lifecycleState: 'PUBLISHED',
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': options.visibility || 'PUBLIC'
      },
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: options.text
          },
          shareMediaCategory: 'IMAGE',
          media: [{
            status: 'READY',
            media: asset
          }]
        }
      }
    };
    
    return this.request<{ id: string }>('/ugcPosts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}

/**
 * Create a client instance with automatic token loading
 */
export function createClient(): LinkedInClient {
  return new LinkedInClient();
}
