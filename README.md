# LinkedIn CLI

Post to LinkedIn from your terminal. Simple as that.

## Quick Start (5 minutes)

### 1. Install

```bash
git clone https://github.com/robertjurvanen-max/linkedin-cli.git
cd linkedin-cli
npm install
npm run build
```

### 2. Create a LinkedIn App

1. Go to **[LinkedIn Developers](https://www.linkedin.com/developers/apps)**
2. Click **Create app**
3. Fill in:
   - App name: anything (e.g., "My LinkedIn CLI")
   - LinkedIn Page: select your company page
   - App logo: any image
4. Click **Create app**

### 3. Get Your Credentials

1. In your app, go to the **Auth** tab
2. Copy the **Client ID** and **Client Secret**
3. Under "OAuth 2.0 settings", add this redirect URL:
   ```
   http://localhost:4002/callback
   ```

### 4. Request API Access

Still in your LinkedIn app:

1. Go to the **Products** tab
2. Request access to:
   - **Share on LinkedIn** (for posting)
   - **Advertising API** (for company page access)
3. Wait for approval (usually instant for Share, may take a day for Advertising)

### 5. Configure the CLI

Create a `.env` file in the linkedin-cli folder:

```bash
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_SCOPES=r_basicprofile,w_member_social,r_organization_social,w_organization_social,rw_organization_admin
```

### 6. Login

```bash
node dist/index.js auth login
```

A browser window opens. Sign in to LinkedIn and click **Allow**.

Done! You're authenticated.

---

## Usage

### Check Which Company Pages You Can Post To

```bash
node dist/index.js orgs list --format json
```

This shows all LinkedIn pages you admin. Note the `id` number for posting.

### Post to a Company Page

**Text only:**
```bash
node dist/index.js orgs post YOUR_ORG_ID -t "Hello LinkedIn! 🚀"
```

**With an image:**
```bash
node dist/index.js orgs post YOUR_ORG_ID -t "Check out our office!" -i /path/to/photo.jpg
```

**With an image from URL:**
```bash
node dist/index.js orgs post YOUR_ORG_ID -t "Cool pic" -i "https://example.com/image.jpg"
```

### Post to Your Personal Profile

```bash
node dist/index.js posts create -t "Hello from the CLI!"
```

### Check Auth Status

```bash
node dist/index.js auth status
```

### Logout

```bash
node dist/index.js auth logout
```

---

## Example: Posting to Encode Club

```bash
# List orgs to find the ID
node dist/index.js orgs list --format json
# Output shows: "id": 34623057 for Encode Club

# Post with image
node dist/index.js orgs post 34623057 \
  -t "🚀 Big announcement coming soon!" \
  -i ./announcement.png
```

---

## Troubleshooting

### "Not enough permissions"

Your token doesn't have the right scopes. Fix:

1. Make sure your LinkedIn app has the products enabled (step 4)
2. Check your `.env` has the right `LINKEDIN_SCOPES`
3. Logout and login again:
   ```bash
   node dist/index.js auth logout
   node dist/index.js auth login
   ```

### "Scope X is not authorized"

That scope isn't enabled for your LinkedIn app. Go to your app's **Products** tab and request the relevant product.

### "File not found"

Check the image path. Use absolute paths to be safe:
```bash
-i /Users/yourname/Desktop/photo.jpg
```

### Token expired

Tokens last ~60 days. Just login again:
```bash
node dist/index.js auth login
```

---

## All Commands

| Command | Description |
|---------|-------------|
| `auth setup` | Show setup instructions |
| `auth login` | Login to LinkedIn |
| `auth logout` | Logout and delete credentials |
| `auth status` | Check if you're logged in |
| `auth refresh` | Refresh your token |
| `profile` | View your profile |
| `posts list` | List your recent posts |
| `posts create -t "text"` | Create a personal post |
| `posts create -t "text" -i image.jpg` | Personal post with image |
| `posts delete <id>` | Delete a post |
| `orgs list` | List company pages you admin |
| `orgs post <id> -t "text"` | Post to company page |
| `orgs post <id> -t "text" -i image.jpg` | Company post with image |

---

## Where Are My Credentials Stored?

```
~/.clawdbot/credentials/linkedin.json
```

This file contains your access token. Don't share it.

---

## Need Help?

Run any command with `--help`:
```bash
node dist/index.js --help
node dist/index.js orgs --help
node dist/index.js orgs post --help
```

---

## License

MIT
