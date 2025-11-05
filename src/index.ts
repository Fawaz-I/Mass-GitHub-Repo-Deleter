import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { authRoutes } from './routes/auth'
import { apiRoutes } from './routes/api'
import type { Env } from './types'

type AppEnv = { 
  Bindings: Env
}

// Polyfill for __STATIC_CONTENT_MANIFEST in development
// This is normally injected by Cloudflare Workers, but may not be available in dev mode
declare global {
  // @ts-ignore
  var __STATIC_CONTENT_MANIFEST: string | Record<string, string> | undefined
}

// Initialize empty manifest if not available (prevents errors, but assets won't work)
// Wrangler should inject this, but if it doesn't, we at least prevent crashes
if (typeof globalThis.__STATIC_CONTENT_MANIFEST === 'undefined') {
  // @ts-ignore
  globalThis.__STATIC_CONTENT_MANIFEST = '{}'
}

const app = new Hono<AppEnv>()

// Mount routes
app.route('/auth', authRoutes as any)
app.route('/api', apiRoutes as any)

// Serve static files (frontend)
app.get('/assets/*', serveStatic({ root: './' }))

// Serve index.html for all other routes (SPA)
app.get('*', serveStatic({ path: './index.html' }))

export default app