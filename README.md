# 🗑️ Mass GitHub Repo Deleter

A secure, browser-accessible tool for bulk deleting GitHub repositories using OAuth authentication. Built with Cloudflare Workers, Hono, and React.

> **🚀 Ready to start?** See [GET_STARTED.md](./GET_STARTED.md) for a 3-step quick start!

## ⚡ Features

- 🔐 **Secure OAuth Authentication** - GitHub OAuth App integration
- 🎯 **Bulk Operations** - Delete multiple repositories at once
- 🔍 **Smart Filtering** - Search and filter by visibility (public/private)
- 🧪 **Dry Run Mode** - Preview deletions before executing
- ⚡ **Edge Deployed** - Lightning-fast performance via Cloudflare Workers
- 🎨 **Modern UI** - Beautiful React interface with Tailwind CSS
- 🛡️ **Safety First** - Confirmation modals and progress tracking

## 🏗️ Tech Stack

- **Runtime**: Cloudflare Workers
- **Backend**: Hono (lightweight web framework)
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: GitHub OAuth + JWT (10min TTL)
- **API**: GitHub REST API (Octokit)

## 📋 Prerequisites

1. **Node.js**: Version 18+ recommended
2. **GitHub OAuth App**: Create one at [GitHub Developer Settings](https://github.com/settings/developers)
   - See [QUICKSTART.md](./QUICKSTART.md) for step-by-step instructions
   - Required scopes: `repo`, `delete_repo`
3. **Cloudflare Account**: Only needed for production deployment

**New to this project?** → Start with [QUICKSTART.md](./QUICKSTART.md) ⚡

## 🚀 Local Development

### Quick Start

Run the setup script (macOS/Linux):

```bash
chmod +x setup.sh
./setup.sh
```

Or manually:

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Required Directories

```bash
mkdir -p logs
```

### 3. Configure Environment

Create a `.dev.vars` file (copy from `.dev.vars.example`):

```bash
cp .dev.vars.example .dev.vars
```

Fill in your values:

```env
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
JWT_SECRET=your_super_secret_jwt_signing_key_min_32_chars
REDIRECT_URI=http://localhost:8787/auth/callback
```

### 4. Start Development Server

The dev server builds the frontend and starts Wrangler:

```bash
npm run dev
```

For auto-rebuild on frontend changes:

```bash
npm run dev:watch
```

Visit `http://localhost:8787` and sign in with GitHub!

**Note:** The development workflow builds the React app first, then serves it via Wrangler. This ensures the frontend is bundled correctly for the Worker environment.

## 🌐 Production Deployment

### 1. Build Frontend

```bash
npm run build
```

### 2. Configure Secrets

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put REDIRECT_URI
```

For `REDIRECT_URI`, use your production URL:
```
https://your-worker.your-subdomain.workers.dev/auth/callback
```

### 3. Deploy

```bash
npm run deploy
```

### 4. Update OAuth App

Update your GitHub OAuth App's callback URL to match your production URL.

## 🎮 Usage

1. **Sign In**: Click "Sign in with GitHub" to authenticate
2. **Browse Repos**: View all your repositories with search and filters
3. **Select Repos**: Check the boxes for repositories you want to delete
4. **Dry Run** (Optional): Enable dry run mode to preview without deleting
5. **Delete**: Click the delete button and confirm by typing "DELETE"
6. **Review Results**: See which deletions succeeded or failed

## 🔒 Security Features

- ✅ JWT tokens expire after 10 minutes
- ✅ No long-term token storage
- ✅ OAuth scopes limited to `repo` and `delete_repo`
- ✅ Confirmation modal requires typing "DELETE"
- ✅ Dry run mode for safe testing
- ✅ All requests authenticated via JWT

## 🛠️ API Endpoints

### Authentication

- `GET /auth/login` - Redirect to GitHub OAuth
- `GET /auth/callback` - Handle OAuth callback, exchange code for token

### API

- `GET /api/repos` - Fetch all repositories for authenticated user
- `POST /api/delete` - Delete multiple repositories

**Delete Request Body:**
```json
{
  "repos": ["owner/repo1", "owner/repo2"],
  "dryRun": false
}
```

**Delete Response:**
```json
{
  "dryRun": false,
  "results": [
    { "repo": "owner/repo1", "success": true },
    { "repo": "owner/repo2", "success": false, "error": "Not found" }
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}
```

## 📁 Project Structure

```
.
├── src/
│   ├── index.ts              # Main Worker entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── routes/
│   │   ├── auth.ts          # OAuth routes
│   │   └── api.ts           # API routes
│   └── frontend/
│       ├── main.tsx         # React entry point
│       ├── App.tsx          # Main app component
│       ├── index.css        # Tailwind styles
│       └── components/
│           ├── LoginPage.tsx
│           ├── Dashboard.tsx
│           ├── ConfirmModal.tsx
│           └── ProgressModal.tsx
├── index.html               # HTML entry point
├── package.json
├── tsconfig.json
├── wrangler.toml            # Cloudflare Workers config
├── vite.config.ts           # Vite build config
├── tailwind.config.js       # Tailwind config
└── README.md
```

## ⚠️ Important Notes

- **Destructive Action**: This tool permanently deletes repositories. Use with extreme caution!
- **Rate Limits**: GitHub API has rate limits. Deletions are sequential to avoid hitting limits.
- **Token Expiry**: JWT tokens expire after 10 minutes. Re-authenticate if needed.
- **No Undo**: Deleted repositories cannot be recovered unless you have backups.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project however you'd like!

## 🙏 Acknowledgments

- Built with [Hono](https://hono.dev/) - ultrafast web framework
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com/)
- UI powered by [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)

---

**⚠️ Use Responsibly**: This tool has the power to delete repositories. Always double-check your selections and consider using dry run mode first!