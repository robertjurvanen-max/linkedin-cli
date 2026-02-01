/**
 * Output formatting utilities
 */

import { LinkedInProfile, LinkedInPost, Organization } from './types.js';

/**
 * Format profile for display
 */
export function formatProfile(profile: LinkedInProfile, format: 'json' | 'table' = 'table'): string {
  if (format === 'json') {
    return JSON.stringify(profile, null, 2);
  }
  
  const lines = [
    '┌─────────────────────────────────────────────────────────────────┐',
    '│                     PROFILE INFORMATION                        │',
    '└─────────────────────────────────────────────────────────────────┘',
    '',
    `  Name:          ${profile.name}`,
    `  Member ID:     ${profile.sub}`,
  ];
  
  if (profile.email) {
    lines.push(`  Email:         ${profile.email}`);
  }
  
  if (profile.picture) {
    lines.push(`  Profile Pic:   ${profile.picture}`);
  }
  
  if (profile.locale) {
    lines.push(`  Locale:        ${profile.locale.language}_${profile.locale.country}`);
  }
  
  return lines.join('\n');
}

/**
 * Format posts for display
 */
export function formatPosts(posts: LinkedInPost[], format: 'json' | 'table' = 'table'): string {
  if (format === 'json') {
    return JSON.stringify(posts, null, 2);
  }
  
  if (posts.length === 0) {
    return 'No posts found.';
  }
  
  const lines = [
    '┌─────────────────────────────────────────────────────────────────┐',
    '│                         YOUR POSTS                             │',
    '└─────────────────────────────────────────────────────────────────┘',
    ''
  ];
  
  for (const post of posts) {
    const content = post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '(no text)';
    const truncatedContent = content.length > 60 ? content.substring(0, 60) + '...' : content;
    const createdAt = new Date(post.created.time).toLocaleString();
    
    lines.push(`  ID: ${post.id}`);
    lines.push(`  Created: ${createdAt}`);
    lines.push(`  Content: ${truncatedContent}`);
    lines.push(`  Status: ${post.lifecycleState}`);
    lines.push('  ─────────────────────────────────────');
  }
  
  return lines.join('\n');
}

/**
 * Format organizations for display
 */
export function formatOrganizations(orgs: Organization[], format: 'json' | 'table' = 'table'): string {
  if (format === 'json') {
    return JSON.stringify(orgs, null, 2);
  }
  
  if (orgs.length === 0) {
    return 'No organizations found.';
  }
  
  const lines = [
    '┌─────────────────────────────────────────────────────────────────┐',
    '│                     YOUR ORGANIZATIONS                         │',
    '└─────────────────────────────────────────────────────────────────┘',
    ''
  ];
  
  for (const org of orgs) {
    lines.push(`  ID: ${org.id}`);
    lines.push(`  Name: ${org.localizedName}`);
    if (org.vanityName) {
      lines.push(`  Vanity: ${org.vanityName}`);
    }
    lines.push('  ─────────────────────────────────────');
  }
  
  return lines.join('\n');
}

/**
 * Format auth status for display
 */
export function formatAuthStatus(
  isAuthenticated: boolean,
  memberId?: string,
  expiresIn?: number,
  name?: string
): string {
  if (!isAuthenticated) {
    return [
      '┌─────────────────────────────────────────────────────────────────┐',
      '│                    NOT LOGGED IN                               │',
      '└─────────────────────────────────────────────────────────────────┘',
      '',
      'You are not currently authenticated.',
      '',
      'To get started:',
      '  • First time?    Run: linkedin auth setup',
      '  • Ready to go?   Run: linkedin auth login'
    ].join('\n');
  }
  
  const daysLeft = expiresIn ? Math.floor(expiresIn / (24 * 60 * 60)) : 0;
  
  return [
    '┌─────────────────────────────────────────────────────────────────┐',
    '│                    AUTHENTICATION STATUS                       │',
    '└─────────────────────────────────────────────────────────────────┘',
    '',
    `  Status:        ✅ Authenticated`,
    `  Member ID:     ${memberId || 'Unknown'}`,
    `  Name:          ${name || 'Unknown'}`,
    `  Days Left:     ${daysLeft}`
  ].join('\n');
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

/**
 * Format error message
 */
export function formatError(message: string): string {
  return `❌ ${message}`;
}
