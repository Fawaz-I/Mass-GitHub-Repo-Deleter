# Implementation Plan: Mass GitHub Repo Deleter

## 1. Project Setup

### 1.1 Initialize Package
- Create `package.json` with dependencies:
  - `hono` - web framework
  - `@hono/node-server` - for local dev
  - `@octokit/rest` - GitHub API client
  - `jose` - JWT handling
- Add dev dependencies:
  - `wrangler` - Cloudflare Workers CLI
  - `typescript`, `@types/node`
  - `vite`, `react`, `react-dom`
  - `tailwindcss`, `autoprefixer`, `postcss`

### 1.2 TypeScript Configuration
- Create `tsconfig.json` for Worker compatibility
- Separate config for frontend if needed

### 1.3 Wrangler Configuration
- Create `wrangler.toml` with:
  - Worker name
  - Compatibility settings
  - Environment variable bindings

## 2. Backend Implementation (Hono)

### 2.1 Core Worker Entry (`src/index.ts`)
```ts
import { Hono } from 'hono'
import { authRoutes } from './routes/auth'
import { apiRoutes } from './routes/api'

const app = new Hono()

app.route('/auth', authRoutes)
app.route('/api', apiRoutes)
app.get('/', (c) => c.html(/* serve frontend */))

export default app
```

### 2.2 Authentication Routes (`src/routes/auth.ts`)

**GET /auth/login**
```ts
export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.get('/login', (c) => {
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID,
    redirect_uri: c.env.REDIRECT_URI,
    scope: 'repo delete_repo'
  })
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`)
})
```

**GET /auth/callback**
```ts
authRoutes.get('/callback', async (c) => {
  const code = c.req.query('code')
  
  // Exchange code for access_token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code
    })
  })
  
  const { access_token } = await tokenRes.json()
  
  // Sign JWT with short TTL
  const jwt = await new SignJWT({ token: access_token })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(c.env.JWT_SECRET))
  
  return c.redirect(`/dashboard?auth=${jwt}`)
})
```

### 2.3 API Routes (`src/routes/api.ts`)

**Middleware: JWT Verification**
```ts
const verifyJWT = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(c.env.JWT_SECRET)
  )
  
  c.set('githubToken', payload.token)
  await next()
}
```

**GET /api/repos**
```ts
apiRoutes.get('/repos', verifyJWT, async (c) => {
  const token = c.get('githubToken')
  const octokit = new Octokit({ auth: token })
  
  const { data } = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated'
  })
  
  return c.json(data.map(r => ({
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    updated_at: r.updated_at,
    owner: r.owner.login
  })))
})
```

**POST /api/delete**
```ts
apiRoutes.post('/delete', verifyJWT, async (c) => {
  const { repos, dryRun } = await c.req.json()
  const token = c.get('githubToken')
  const octokit = new Octokit({ auth: token })
  
  const results = []
  
  for (const repoFullName of repos) {
    try {
      if (!dryRun) {
        const [owner, repo] = repoFullName.split('/')
        await octokit.repos.delete({ owner, repo })
      }
      results.push({ repo: repoFullName, success: true })
    } catch (error) {
      results.push({ 
        repo: repoFullName, 
        success: false, 
        error: error.message 
      })
    }
  }
  
  return c.json(results)
})
```

## 3. Frontend Implementation (React + Vite)

### 3.1 HTML Entry (`public/index.html`)
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Mass GitHub Repo Deleter</title>
    <script type="module" src="/src/main.tsx"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

### 3.2 React Entry (`src/frontend/main.tsx`)
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
```

### 3.3 Main App (`src/frontend/App.tsx`)
- Check for `?auth=<jwt>` param
- Store JWT in state/localStorage (careful!)
- Render LoginPage or Dashboard based on auth state

### 3.4 Login Page Component
```tsx
function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1>Mass GitHub Repo Deleter</h1>
        <a href="/auth/login" className="btn-primary">
          Sign in with GitHub
        </a>
      </div>
    </div>
  )
}
```

### 3.5 Dashboard Component
```tsx
function Dashboard({ jwt }) {
  const [repos, setRepos] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    fetch('/api/repos', {
      headers: { 'Authorization': `Bearer ${jwt}` }
    })
      .then(r => r.json())
      .then(setRepos)
  }, [jwt])
  
  const handleDelete = async () => {
    const confirmed = window.prompt('Type DELETE to confirm')
    if (confirmed !== 'DELETE') return
    
    setLoading(true)
    const results = await fetch('/api/delete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ repos: Array.from(selected) })
    }).then(r => r.json())
    
    setLoading(false)
    // Update UI with results
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1>Your Repositories</h1>
      <table>
        {/* Checkboxes, repo names, metadata */}
      </table>
      <button onClick={handleDelete} disabled={loading}>
        Delete Selected ({selected.size})
      </button>
    </div>
  )
}
```

## 4. Environment & Configuration

### 4.1 `.dev.vars` (local development)
```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
JWT_SECRET=...
REDIRECT_URI=http://localhost:8787/auth/callback
```

### 4.2 Wrangler Secrets (production)
```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put REDIRECT_URI
```

### 4.3 Tailwind Config
```js
module.exports = {
  content: ['./src/frontend/**/*.{tsx,html}'],
  theme: { extend: {} },
  plugins: []
}
```

## 5. Build & Deployment

### 5.1 Build Scripts
```json
{
  "scripts": {
    "dev": "wrangler dev",
    "build": "vite build && wrangler deploy",
    "preview": "vite preview"
  }
}
```

### 5.2 Vite Config
- Build frontend to `dist/`
- Worker serves static assets from `dist/`

### 5.3 Deploy
```bash
npm run build
```

## 6. Testing

- Create GitHub OAuth app with callback URL
- Test login flow locally
- Verify repo listing works
- Test delete with dry-run first
- Confirm deletion modal works
- Check error handling (rate limits, auth failures)

## 7. Safety Features

- Confirmation modal requiring "DELETE" text
- Dry-run mode support
- Progress indicators during deletion
- Error reporting per repo
- JWT expiration (10 min max)
- No persistent token storage