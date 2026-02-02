#!/usr/bin/env node

/**
 * LinkedIn CLI - Main Entry Point
 */

import { Command } from 'commander';
import 'dotenv/config';

import {
  loadTokens,
  saveTokens,
  deleteTokens,
  getOAuthConfig,
  buildAuthorizationUrl,
  generateState,
  exchangeCodeForToken,
  refreshAccessToken,
  startCallbackServer,
  isTokenExpired,
  isTokenExpiringSoon,
  DEFAULT_SCOPES
} from './lib/oauth.js';
import { LinkedInClient, createClient } from './lib/client.js';
import {
  formatProfile,
  formatPosts,
  formatOrganizations,
  formatAuthStatus,
  formatSuccess,
  formatError
} from './lib/output.js';

const program = new Command();

program
  .name('linkedin')
  .description('A comprehensive CLI for interacting with the LinkedIn API')
  .version('1.0.0');

// ============================================================================
// AUTH COMMANDS
// ============================================================================

const authCmd = program
  .command('auth')
  .description('Authentication commands - login, logout, status');

authCmd
  .command('setup')
  .description('Show step-by-step OAuth setup instructions')
  .action(() => {
    console.log(`
┌─────────────────────────────────────────────────────────────────┐
│                    LINKEDIN CLI SETUP                           │
└─────────────────────────────────────────────────────────────────┘

Before you can login, you need to set up OAuth credentials.

STEP 1: Create a LinkedIn App
─────────────────────────────
1. Go to https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in app details and create

STEP 2: Configure OAuth
───────────────────────
1. Go to your app's "Auth" tab
2. Add OAuth 2.0 redirect URL: http://localhost:4002/callback
3. Request the following products:
   - Sign In with LinkedIn using OpenID Connect
   - Share on LinkedIn

STEP 3: Get Credentials
───────────────────────
1. Go to your app's "Auth" tab
2. Copy the "Client ID" and "Client Secret"

STEP 4: Configure the CLI
─────────────────────────
Set environment variables:

  export LINKEDIN_CLIENT_ID="your_client_id"
  export LINKEDIN_CLIENT_SECRET="your_client_secret"

Or create a .env file:

  LINKEDIN_CLIENT_ID=your_client_id
  LINKEDIN_CLIENT_SECRET=your_client_secret

STEP 5: Login
─────────────
Run: linkedin auth login

Your credentials are stored securely at:
  ~/.clawdbot/credentials/linkedin.json
`);
  });

authCmd
  .command('login')
  .description('Login to LinkedIn using OAuth')
  .option('--port <port>', 'Local callback server port', '4002')
  .option('--manual', 'Manual mode: copy code from redirect URL')
  .action(async (options) => {
    const tokens = loadTokens();
    if (tokens && !isTokenExpired(tokens)) {
      console.log(`
┌─────────────────────────────────────────────────────────────────┐
│                    ALREADY LOGGED IN                            │
└─────────────────────────────────────────────────────────────────┘

You are already authenticated with LinkedIn.

Options:
  • Check status:  linkedin auth status
  • Log out:       linkedin auth logout
  • Test API:      linkedin profile
`);
      return;
    }
    
    try {
      const config = getOAuthConfig();
      config.redirectUri = `http://localhost:${options.port}/callback`;
      
      const state = generateState();
      const authUrl = buildAuthorizationUrl(config, state);
      
      if (options.manual) {
        console.log(`
┌─────────────────────────────────────────────────────────────────┐
│                LINKEDIN CLI LOGIN (Manual Mode)                 │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Open this URL in your browser:

${authUrl}

STEP 2: Sign in to LinkedIn and click "Allow"

STEP 3: You'll be redirected to a page that may error.
        Look at the URL bar - copy the "code" parameter value.

        http://localhost:${options.port}/callback?code=COPY_THIS_PART

STEP 4: Paste that code below.

`);
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const code = await new Promise<string>((resolve) => {
          rl.question('Enter the code from the URL: ', (answer) => {
            rl.close();
            resolve(answer.trim());
          });
        });
        
        console.log('\nExchanging code for token...');
        const newTokens = await exchangeCodeForToken(code, config);
        saveTokens(newTokens);
        
        console.log(formatSuccess('Successfully logged in to LinkedIn!'));
      } else {
        console.log(`
┌─────────────────────────────────────────────────────────────────┐
│                    LINKEDIN CLI LOGIN                           │
└─────────────────────────────────────────────────────────────────┘

Opening browser for LinkedIn authorization...

If the browser doesn't open automatically, visit:
${authUrl}
`);
        
        // Try to open browser
        const { exec } = await import('child_process');
        const openCmd = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${openCmd} "${authUrl}"`);
        
        // Start callback server and wait for code
        const code = await startCallbackServer(parseInt(options.port), state);
        
        console.log('Exchanging code for token...');
        const newTokens = await exchangeCodeForToken(code, config);
        saveTokens(newTokens);
        
        console.log(formatSuccess('Successfully logged in to LinkedIn!'));
      }
    } catch (error) {
      console.error(formatError(`Login failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

authCmd
  .command('logout')
  .description('Log out and delete stored credentials')
  .action(() => {
    const deleted = deleteTokens();
    if (deleted) {
      console.log(`
┌─────────────────────────────────────────────────────────────────┐
│                    LOGGED OUT                                   │
└─────────────────────────────────────────────────────────────────┘

Your LinkedIn credentials have been deleted.

To log in again, run: linkedin auth login
`);
    } else {
      console.log('No credentials found to delete.');
    }
  });

authCmd
  .command('status')
  .description('Check authentication status')
  .action(async () => {
    const tokens = loadTokens();
    
    if (!tokens) {
      console.log(formatAuthStatus(false));
      return;
    }
    
    if (isTokenExpired(tokens)) {
      console.log(formatAuthStatus(false));
      console.log('\nYour token has expired. Run: linkedin auth login');
      return;
    }
    
    try {
      const client = createClient();
      const profile = await client.getProfile();
      
      const createdAt = new Date(tokens.created_at).getTime();
      const expiresIn = Math.max(0, (tokens.expires_in * 1000 - (Date.now() - createdAt)) / 1000);
      
      console.log(formatAuthStatus(true, profile.sub, expiresIn, profile.name));
      
      if (isTokenExpiringSoon(tokens)) {
        console.log('\n⚠️  Your token will expire soon. Run: linkedin auth refresh');
      }
    } catch (error) {
      console.log(formatAuthStatus(false));
      console.error(`\nError checking status: ${(error as Error).message}`);
    }
  });

authCmd
  .command('refresh')
  .description('Manually refresh the access token')
  .action(async () => {
    const tokens = loadTokens();
    
    if (!tokens) {
      console.error(formatError('No credentials found. Run: linkedin auth login'));
      process.exit(1);
    }
    
    if (!tokens.refresh_token) {
      console.error(formatError('No refresh token available. Run: linkedin auth login'));
      process.exit(1);
    }
    
    try {
      const config = getOAuthConfig();
      console.log('Refreshing token...');
      
      const newTokens = await refreshAccessToken(tokens.refresh_token, config);
      saveTokens(newTokens);
      
      console.log(formatSuccess('Token refreshed successfully!'));
    } catch (error) {
      console.error(formatError(`Token refresh failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// ============================================================================
// PROFILE COMMANDS
// ============================================================================

program
  .command('profile')
  .description('Get your LinkedIn profile information')
  .option('--format <format>', 'Output format (json/table)', 'table')
  .action(async (options) => {
    try {
      const client = createClient();
      const profile = await client.getProfile();
      console.log(formatProfile(profile, options.format));
    } catch (error) {
      console.error(formatError((error as Error).message));
      process.exit(1);
    }
  });

// ============================================================================
// POST COMMANDS
// ============================================================================

const postsCmd = program
  .command('posts')
  .description('Manage LinkedIn posts');

postsCmd
  .command('list')
  .description('List your recent posts')
  .option('--limit <count>', 'Number of posts to fetch', '10')
  .option('--format <format>', 'Output format (json/table)', 'table')
  .action(async (options) => {
    try {
      const client = createClient();
      const posts = await client.getPosts(parseInt(options.limit));
      console.log(formatPosts(posts, options.format));
    } catch (error) {
      console.error(formatError((error as Error).message));
      process.exit(1);
    }
  });

postsCmd
  .command('create')
  .description('Create a new post')
  .requiredOption('-t, --text <text>', 'Post text content')
  .option('-i, --image <url>', 'Image URL to attach')
  .option('-v, --visibility <visibility>', 'Post visibility (PUBLIC/CONNECTIONS)', 'PUBLIC')
  .option('--article-url <url>', 'Article URL to share')
  .option('--article-title <title>', 'Article title')
  .option('--article-description <desc>', 'Article description')
  .option('--format <format>', 'Output format (json/table)', 'json')
  .action(async (options) => {
    try {
      const client = createClient();
      
      console.log('Creating post...');
      
      let result;
      if (options.image) {
        result = await client.createImagePost({
          text: options.text,
          visibility: options.visibility,
          imageUrl: options.image
        });
      } else {
        result = await client.createPost({
          text: options.text,
          visibility: options.visibility,
          articleUrl: options.articleUrl,
          articleTitle: options.articleTitle,
          articleDescription: options.articleDescription
        });
      }
      
      console.log(formatSuccess('Post created successfully!'));
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(formatError((error as Error).message));
      process.exit(1);
    }
  });

postsCmd
  .command('delete <postId>')
  .description('Delete a post')
  .action(async (postId) => {
    try {
      const client = createClient();
      await client.deletePost(postId);
      console.log(formatSuccess('Post deleted successfully!'));
    } catch (error) {
      console.error(formatError((error as Error).message));
      process.exit(1);
    }
  });

// ============================================================================
// ORGANIZATION COMMANDS
// ============================================================================

const orgCmd = program
  .command('organizations')
  .alias('orgs')
  .description('Manage organization pages');

orgCmd
  .command('list')
  .description('List organizations you administer')
  .option('--format <format>', 'Output format (json/table)', 'table')
  .action(async (options) => {
    try {
      const client = createClient();
      const orgs = await client.getOrganizations();
      console.log(formatOrganizations(orgs, options.format));
    } catch (error) {
      console.error(formatError((error as Error).message));
      process.exit(1);
    }
  });

orgCmd
  .command('post <orgId>')
  .description('Create a post on behalf of an organization')
  .requiredOption('-t, --text <text>', 'Post text content')
  .option('-i, --image <path>', 'Image file path or URL to attach')
  .option('-v, --visibility <visibility>', 'Post visibility (PUBLIC/CONNECTIONS)', 'PUBLIC')
  .action(async (orgId, options) => {
    try {
      const client = createClient();
      
      console.log('Creating organization post...');
      
      let result;
      if (options.image) {
        console.log('Uploading image...');
        result = await client.createOrganizationImagePost(orgId, {
          text: options.text,
          visibility: options.visibility,
          imageUrl: options.image
        });
      } else {
        result = await client.createOrganizationPost(orgId, {
          text: options.text,
          visibility: options.visibility
        });
      }
      
      console.log(formatSuccess('Organization post created successfully!'));
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(formatError((error as Error).message));
      process.exit(1);
    }
  });

// Parse and execute
program.parse();
