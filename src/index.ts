import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { authRoutes } from './routes/auth'
import { apiRoutes } from './routes/api'
import type { Env } from './types'
import { ensureStrongSecret } from './utils/security'

type AppEnv = {
  Bindings: Env
  Variables: { requestId: string }
}

const app = new Hono<AppEnv>()

// Validate configuration - cache result to avoid checking on every request
let configValidated = false
let configValidationError: Error | null = null

const validateConfig = (env: Env) => {
  if (configValidated) {
    if (configValidationError) {
      throw configValidationError
    }
    return
  }

  try {
    ensureStrongSecret(env.JWT_SECRET)
    configValidated = true
  } catch (error) {
    configValidationError = error instanceof Error 
      ? error 
      : new Error('Invalid configuration')
    throw configValidationError
  }
}

// Middleware to validate config on first request
const validateConfigMiddleware = async (c: Context<AppEnv>, next: Next) => {
  try {
    validateConfig(c.env)
  } catch (error) {
    return c.json({ error: 'Server configuration error' }, 500)
  }
  await next()
}

// Request ID middleware for audit logging
const addRequestId = async (c: Context<AppEnv>, next: Next) => {
  const requestId = crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('X-Request-ID', requestId)
  await next()
}

const applySecurityHeaders = async (c: Context<AppEnv>, next: Next) => {
  await next()
  
  // Enhanced CSP with more restrictions
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://github.com; font-src 'self' data:;"
  )
  c.header('X-Frame-Options', 'DENY')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // HSTS - only set if HTTPS (Cloudflare handles this automatically)
  const url = new URL(c.req.url)
  if (url.protocol === 'https:') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}

const enforceSameOriginCors = async (c: Context<AppEnv>, next: Next) => {
  const origin = c.req.header('Origin')
  const requestOrigin = new URL(c.req.url).origin

  // For same-origin requests, Origin header might be missing (allowed)
  // For cross-origin requests, we must validate
  if (origin && origin !== requestOrigin) {
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 403)
    }
    return c.json({ error: 'CORS origin denied' }, 403)
  }

  // Only set CORS headers if Origin is present (cross-origin request)
  if (origin) {
    c.header('Access-Control-Allow-Origin', requestOrigin)
    c.header('Access-Control-Allow-Credentials', 'true')
    c.header('Vary', 'Origin')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    c.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204)
  }

  await next()
}

// Middleware order matters: config validation first, then request ID, then CORS, then security headers
app.use('*', validateConfigMiddleware)
app.use('*', addRequestId)
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
