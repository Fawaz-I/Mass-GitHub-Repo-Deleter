# 🛠️ Complete Setup Guide

This guide walks you through setting up the Mass GitHub Repo Deleter from scratch.

## Prerequisites

- Node.js 18+ installed
- A GitHub account
- (Optional) A Cloudflare account for deployment

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd mass-github-repo-deleter

# Run setup script (creates logs/, .dev.vars)
chmod +x setup.sh
./setup.sh
```

Or manually:

```bash
npm install
mkdir -p logs
cp .dev.vars.example .dev.vars
```

## Step 2: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the form:
   - **Application name**: `Mass Repo Deleter (Dev)` (or whatever you prefer)
   - **Homepage URL**: `http://localhost:8787`
   - **Authorization callback URL**: `http://localhost:8787/auth/callback`
4. Click **"Register application"**
5. Click **"Generate a new client secret"**
6. **Copy both the Client ID and Client Secret** (you won't see the secret again!)

## Step 3: Configure Environment Variables

Edit `.dev.vars` with your GitHub OAuth credentials:

```env
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here
JWT_SECRET=a_random_32_character_string_here_xyz
REDIRECT_URI=http://localhost:8787/auth/callback
```

**For JWT_SECRET**, generate a random string:

```bash
# On macOS/Linux:
openssl rand -base64 32

# Or just use a random string of letters/numbers (min 32 chars)
```

## Step 4: Start Development Server

```bash
npm run dev
```

This will:
1. Build the React frontend (Vite)
2. Start the Cloudflare Workers dev server (Wrangler)
3. Serve everything on `http://localhost:8787`

**First time?** The build might take 10-30 seconds.

## Step 5: Test It Out!

1. Open `http://localhost:8787` in your browser
2. Click **"Sign in with GitHub"**
3. Authorize the OAuth app
4. You should see your repositories!

## Troubleshooting

### "Failed to obtain access token"

- Double-check your `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- Ensure the callback URL in your GitHub OAuth app matches exactly: `http://localhost:8787/auth/callback`

### "Module not found" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 8787 already in use

Kill any existing Wrangler processes:

```bash
# Find and kill the process
lsof -ti:8787 | xargs kill -9
```

### Frontend changes not reflecting

If using `npm run dev`, you need to manually rebuild. Use instead:

```bash
npm run dev:watch
```

This auto-rebuilds the frontend when files change.

## Production Deployment

See the main [README.md](./README.md#-production-deployment) for deployment instructions.

## Security Notes

⚠️ **Never commit `.dev.vars` to Git!** It's already in `.gitignore`, but double-check.

⚠️ **Use a strong JWT_SECRET** - this protects your authentication tokens.

⚠️ **Be careful with the delete_repo scope** - this gives the app permission to delete repositories!

## Need Help?

Check the main [README.md](./README.md) or open an issue on GitHub.