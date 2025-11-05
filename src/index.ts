import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { authRoutes } from './routes/auth'
import { apiRoutes } from './routes/api'
import type { Env } from './types'

type AppEnv = { Bindings: Env }

const app = new Hono<AppEnv>()

// Mount routes
app.route('/auth', authRoutes as any)
app.route('/api', apiRoutes as any)

// Serve static files (frontend)
app.get('/assets/*', serveStatic({ root: './' }))

// Serve index.html for all other routes (SPA)
app.get('*', serveStatic({ path: './index.html' }))

export default app