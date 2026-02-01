/**
 * LinkedIn API Types
 */

// OAuth Types
export interface OAuthTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
  token_type: string;
  created_at: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// Profile Types
export interface LinkedInProfile {
  sub: string;  // LinkedIn member ID
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  locale?: {
    country: string;
    language: string;
  };
}

// Post Types
export interface CreatePostOptions {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  mediaUrls?: string[];
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
}

export interface LinkedInPost {
  id: string;
  author: string;
  lifecycleState: string;
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': string;
  };
  created: {
    time: number;
  };
  lastModified: {
    time: number;
  };
  specificContent?: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: string;
    };
  };
}

// Image Upload Types
export interface ImageUploadResponse {
  value: {
    uploadMechanism: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
        uploadUrl: string;
        headers: Record<string, string>;
      };
    };
    mediaArtifact: string;
    asset: string;
  };
}

export interface RegisterUploadRequest {
  registerUploadRequest: {
    recipes: string[];
    owner: string;
    serviceRelationships: {
      relationshipType: string;
      identifier: string;
    }[];
  };
}

// Organization Types
export interface Organization {
  id: string;
  localizedName: string;
  vanityName?: string;
  logoV2?: {
    cropped: string;
    original: string;
  };
}

// API Response Types
export interface APIError {
  status: number;
  message: string;
  serviceErrorCode?: number;
}

// CLI Output Types
export interface OutputOptions {
  format: 'json' | 'table';
}
