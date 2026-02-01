# LinkedIn CLI

A comprehensive command-line interface for interacting with the LinkedIn API with OAuth 2.0 authentication.

## Features

- **OAuth 2.0 Authentication** - Secure login with automatic token management
- **Profile Access** - View your LinkedIn profile information
- **Post Management** - Create, list, and delete posts
- **Image Posts** - Upload and share images
- **Article Sharing** - Share articles with custom titles and descriptions
- **Organization Pages** - Post on behalf of company pages you administer
- **Visibility Control** - Choose PUBLIC or CONNECTIONS-only visibility

## Installation

```bash
cd linkedin-cli
npm install
npm run build
```

## Quick Start

### Option A: Direct Token (For your own account)

If you just need to post from your own account, you can generate a token directly:

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create or open your app
3. Go to the "Auth" tab
4. Generate an access token with the required scopes

Save the token:

```bash
mkdir -p ~/.clawdbot/credentials

cat > ~/.clawdbot/credentials/linkedin.json << 'EOF'
{
  "access_token": "YOUR_ACCESS_TOKEN",
  "expires_in": 5184000,
  "scope": "openid profile email w_member_social",
  "token_type": "Bearer",
  "created_at": "2024-01-01T00:00:00.000Z"
}
EOF
```

Test it:
```bash
linkedin profile
```

### Option B: OAuth Flow (For multi-user apps)

For apps where users connect their own accounts:

#### 1. Create a LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click "Create app"
3. Fill in app details

#### 2. Configure OAuth

1. Go to your app's "Auth" tab
2. Add redirect URL: `https://your-domain.com/callback` (must be HTTPS)
3. Request these products:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn**

#### 3. Set Credentials

```bash
export LINKEDIN_CLIENT_ID="your_client_id"
export LINKEDIN_CLIENT_SECRET="your_client_secret"
```

Or create `.env`:
```
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

#### 4. Login

```bash
linkedin auth login
```

> **Note**: LinkedIn OAuth requires HTTPS redirect URIs. Use [ngrok](https://ngrok.com) for local development.

## Commands

### Authentication

```bash
# Show setup instructions
linkedin auth setup

# Login with OAuth
linkedin auth login

# Login in manual mode (for remote/headless setups)
linkedin auth login --manual

# Check authentication status
linkedin auth status

# Refresh token
linkedin auth refresh

# Logout
linkedin auth logout
```

### Profile

```bash
# Get your profile
linkedin profile

# Get profile as JSON
linkedin profile --format json
```

### Posts

```bash
# List your recent posts
linkedin posts list
linkedin posts list --limit 25
linkedin posts list --format json

# Create a text post
linkedin posts create -t "Hello LinkedIn!"

# Create a post with image
linkedin posts create -t "Check out this photo!" -i "https://example.com/image.jpg"

# Create a connections-only post
linkedin posts create -t "For my network only" -v CONNECTIONS

# Share an article
linkedin posts create -t "Great read!" \
  --article-url "https://example.com/article" \
  --article-title "Interesting Article" \
  --article-description "A must-read for everyone"

# Delete a post
linkedin posts delete <postId>
```

### Organizations

```bash
# List organizations you administer
linkedin organizations list
linkedin orgs list

# Post on behalf of an organization
linkedin orgs post <orgId> -t "Company announcement!"
```

## Output Formats

Most commands support `--format` option:

- `table` - Human-readable table format (default)
- `json` - JSON output for scripting

```bash
linkedin profile --format json
linkedin posts list --format json
```

## Credential Storage

Credentials are stored securely at:
- `~/.clawdbot/credentials/linkedin.json`

Or if using moltbot:
- `~/.moltbot/credentials/linkedin.json`

## Token Lifecycle

- Access tokens expire after ~60 days
- The CLI warns when tokens are expiring within 7 days
- Use `linkedin auth refresh` to extend token validity
- Tokens with refresh_token can be refreshed automatically

## API Scopes

Default scopes requested:
- `openid` - OpenID Connect authentication
- `profile` - Basic profile information
- `email` - Email address
- `w_member_social` - Create posts on behalf of user

For organization posting, your app also needs:
- `rw_organization_admin` - Administer organization pages

## Development

```bash
# Run in development mode
npm run dev -- auth status

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build
npm run build
```

## Testing

The CLI includes comprehensive tests:

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

Test files:
- `tests/oauth.test.ts` - OAuth flow and token management
- `tests/client.test.ts` - API client methods
- `tests/output.test.ts` - Output formatting

## API Reference

This CLI uses the LinkedIn API v2. Key endpoints:

- **OAuth Authorization**: `https://www.linkedin.com/oauth/v2/authorization`
- **Token Exchange**: `https://www.linkedin.com/oauth/v2/accessToken`
- **User Info**: `https://api.linkedin.com/v2/userinfo`
- **Posts (UGC)**: `https://api.linkedin.com/v2/ugcPosts`
- **Assets**: `https://api.linkedin.com/v2/assets`

## Limitations

- Images must be publicly accessible URLs (LinkedIn fetches them)
- Video posting requires additional API permissions
- Rate limits apply (see LinkedIn API documentation)
- Some features require app review for production use

## License

MIT
