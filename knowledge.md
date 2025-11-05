# 🧠 Project Knowledge: Mass GitHub Repo Deleter

This document describes everything an AI agent or developer should know to contribute safely and intelligently to the **Mass GitHub Repo Deleter** project.

---

## 🧩 Purpose

This project provides a **secure, browser-accessible tool** that allows GitHub users to **bulk delete or archive repositories** via OAuth authentication — deployed on **Cloudflare Workers** with a **Hono backend** and optional **React frontend**.

---

## 🧱 Architecture Overview

### Stack

| Layer    | Technology                             | Notes                                                  |
| -------- | -------------------------------------- | ------------------------------------------------------ |
| Runtime  | **Cloudflare Workers**                 | Edge-deployed, serverless environment                  |
| Backend  | **Hono**                               | Lightweight TypeScript framework optimized for Workers |
| Frontend | **React + Vite + Tailwind (optional)** | Static UI served via Worker or Cloudflare Pages        |
| Auth     | **GitHub OAuth App**                   | Scoped access for `repo` + `delete_repo`               |
| API      | **GitHub REST API (Octokit)**          | Used for repo listing and deletion                     |
| Storage  | (Optional) **KV or Durable Object**    | For short-lived session or token persistence           |

---

## 🔐 Authentication & Security

### OAuth Setup

- **App Type:** GitHub OAuth App (not GitHub App)
- **Scopes:** `repo`, `delete_repo`
- **Callback URL:** `${DEPLOYMENT_URL}/auth/callback`
- **Environment Vars:**

  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `JWT_SECRET`
  - `REDIRECT_URI`

### Token Handling

- Exchange `code` → `access_token` via GitHub API
- JWT-encode token with short TTL (~10 mins)
- Never store long-term in KV
- Use `Authorization: Bearer <jwt>` on all frontend API requests

---

## 🚀 Endpoints

### `GET /auth/login`

Redirects to GitHub’s OAuth authorization URL.

**Query parameters:** none
**Response:** HTTP 302 → `https://github.com/login/oauth/authorize?...`

---

### `GET /auth/callback`

Handles OAuth redirect and exchanges code for access token.
Signs a JWT and redirects to the dashboard.

**Env vars used:**
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`

**Redirect target:** `/dashboard?auth=<jwt>`

---

### `GET /api/repos`

Fetches authenticated user’s repos.

**Auth:** `Authorization: Bearer <jwt>`
**Returns:** array of repositories (filtered attributes only)

```json
[
  {
    "name": "repo-name",
    "private": false,
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### `POST /api/delete`

Deletes multiple repositories for the authenticated user.

**Body:**

```json
{ "repos": ["repo1", "repo2", "repo3"] }
```

**Response:**

```json
[
  { "repo": "repo1", "success": true },
  { "repo": "repo2", "success": false, "error": "Not found" }
]
```

**Notes:**

- Deletion loop uses sequential requests to avoid GitHub rate limits.
- Optionally support `dryRun: true` in payload for safe preview.

---

## 🧠 Design Principles

1. **Safety First**

   - Require explicit confirmation before mass deletion.
   - Implement optional dry-run mode.
   - Only operate on user’s own repos (from `/user/repos`).

2. **Zero Trust**

   - Never store tokens unencrypted.
   - Expire JWTs fast; re-auth if needed.

3. **Edge Efficiency**

   - Keep payloads small; rely on GitHub pagination.
   - Use lightweight libraries (Hono, Octokit only).

4. **User Experience**

   - Clear table layout of repos with checkboxes.
   - “Delete Selected” → confirmation modal (“Type DELETE to confirm”).
   - Progress bar for ongoing deletions.

---

## 🧰 Development

### Setup Process

1. Run `./setup.sh` to initialize (creates logs/, .dev.vars)
2. Edit `.dev.vars` with GitHub OAuth credentials
3. Run `npm install` to get Aceternity UI dependencies (framer-motion, clsx, tailwind-merge)
4. Run `npm run dev` to build frontend + start Wrangler
5. For auto-rebuild: `npm run dev:watch`

### Environment Variables (`.dev.vars`)

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET=super_secret_key  # Min 32 chars, use `openssl rand -base64 32`
REDIRECT_URI=http://localhost:8787/auth/callback
```

### Build Process

- Vite builds React frontend → `dist/`
- Wrangler serves Worker + static assets from `dist/`
- Worker uses Hono's `serveStatic` with `[site]` config in wrangler.toml

### Local OAuth testing

Use `http://localhost:8787/auth/callback` as the callback URL in your GitHub OAuth app.

---

## 🧩 File Structure

```
/
├── src/
│   ├── backend/
│   │   ├── index.ts        # main Hono app
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── repos.ts
│   │   │   └── delete.ts
│   └── frontend/
│       ├── index.html
│       ├── main.tsx
│       └── components/
├── knowledge.md
├── wrangler.toml
└── package.json
```

---

## 🧩 Deployment (Cloudflare Workers)

1. Configure vars:

   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put JWT_SECRET
   wrangler secret put REDIRECT_URI
   ```

2. Build + deploy:

   ```bash
   npm run build
   npx wrangler deploy
   ```

3. Visit `/auth/login` to start OAuth flow.

---

## 🧱 Extensions (Future)

- ✅ Add “Archive before delete” toggle
- ✅ Add filter by repo prefix or visibility
- ✅ Add CSV export of repos before deletion
- 🛠️ Add session persistence with Cloudflare KV
- 🧩 Convert to GitHub App for enterprise mode (fine-grained perms)

---

## Code Style Conventions

- Use **TypeScript** everywhere with proper types (no `any` in middleware).
- Async functions must use `try/catch` with JSON-safe responses.
- Prefer functional patterns (`map`, `for...of` for async).
- Avoid large dependencies; keep bundle < 2MB for Worker.
- Use Hono's `Context` and `Next` types for middleware.
- Always include error boundaries in React components.
- Use Framer Motion for all animations.
- Use Aceternity UI patterns (SpotlightCard, BackgroundBeams).
- Color scheme: Orange/Red/Zinc gradients (avoid blue/purple).
- No emojis in user-facing UI.

---

## 🧩 Testing Guidelines

- Use GitHub test accounts to avoid deleting real repos.
- Mock GitHub API with `msw` or `nock`.
- Unit test endpoint handlers in isolation with Hono’s `app.request`.

---

## 🔍 Troubleshooting

| Problem              | Likely Cause                | Fix                                 |
| -------------------- | --------------------------- | ----------------------------------- |
| OAuth redirect fails | Wrong callback URL          | Update in GitHub Developer Settings |
| 401 on `/api/repos`  | Expired or invalid JWT      | Re-login                            |
| 403 deleting repo    | Missing `delete_repo` scope | Update OAuth App scopes             |
| 429 rate limit       | Too many deletes at once    | Add concurrency limit or backoff    |

---

## 🧭 Summary

This project aims to make **mass repository management** simple, safe, and fast — using the edge runtime and GitHub OAuth for secure automation.
AI agents contributing here should prioritize:

- Safety (no accidental deletion)
- Minimal latency (Worker-optimized)
- Extendable UX (React or minimal HTML)
- Security best practices (short-lived tokens, no secrets leakage)
