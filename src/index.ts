import { Hono } from 'hono'
import { authRoutes } from './routes/auth'
import { apiRoutes } from './routes/api'
import type { Env } from './types'

type AppEnv = { 
  Bindings: Env
}

const app = new Hono<AppEnv>()

// Mount API routes
// Static assets and SPA routing are handled automatically by Cloudflare
// via the [assets] configuration in wrangler.toml
app.route('/auth', authRoutes as any)
app.route('/api', apiRoutes as any)

// All other routes (including root and client-side routes) are handled
// automatically by Cloudflare's single-page-application handling

export default app
