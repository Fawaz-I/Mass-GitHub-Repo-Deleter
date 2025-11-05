import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { authRoutes } from './routes/auth'
import { apiRoutes } from './routes/api'
import type { Env } from './types'

type AppEnv = {
  Bindings: Env
}

const app = new Hono<AppEnv>()

const applySecurityHeaders = async (c: Context<AppEnv>, next: Next) => {
  await next()
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  )
  c.header('X-Frame-Options', 'DENY')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
}

const enforceSameOriginCors = async (c: Context<AppEnv>, next: Next) => {
  const origin = c.req.header('Origin')
  const allowedOrigin = new URL(c.req.url).origin

  if (origin && origin !== allowedOrigin) {
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 403)
    }
    return c.json({ error: 'CORS origin denied' }, 403)
  }

  if (origin) {
    c.header('Access-Control-Allow-Origin', allowedOrigin)
    c.header('Vary', 'Origin')
  }

  c.header('Access-Control-Allow-Credentials', 'true')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204)
  }

  await next()
}

app.use('*', enforceSameOriginCors)
app.use('*', applySecurityHeaders)

// Mount API routes
// Static assets and SPA routing are handled automatically by Cloudflare
// via the [assets] configuration in wrangler.toml
app.route('/auth', authRoutes as any)
app.route('/api', apiRoutes as any)

// All other routes (including root and client-side routes) are handled
// automatically by Cloudflare's single-page-application handling

export default app
