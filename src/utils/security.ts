import type { Context, Next } from 'hono'

const CLEANUP_LIMIT = 5000

export const JWT_AUDIENCE = 'mass-github-repo-deleter'
export const STATE_COOKIE_NAME = 'oauth_state'
export const AUTH_COOKIE_NAME = 'auth_token'
export const MAX_REQUEST_BODY_SIZE = 1024 * 1024 // 1MB
export const MAX_REPO_BATCH = 100

interface RateLimitOptions {
  windowMs: number
  limit: number
}

interface RateLimitEntry {
  count: number
  expiresAt: number
}

const rateLimitStores = new WeakMap<RateLimitOptions, Map<string, RateLimitEntry>>()

export const ensureStrongSecret = (secret: string) => {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }
}

const getStore = (options: RateLimitOptions) => {
  let store = rateLimitStores.get(options)
  if (!store) {
    store = new Map<string, RateLimitEntry>()
    rateLimitStores.set(options, store)
  }
  return store
}

const cleanupStore = (store: Map<string, RateLimitEntry>, now: number) => {
  if (store.size <= CLEANUP_LIMIT) return

  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key)
    }
  }
}

export const getClientIdentifier = (c: Context): string => {
  const cfIp = c.req.header('CF-Connecting-IP')
  if (cfIp) return cfIp

  const forwardedFor = c.req.header('X-Forwarded-For')
  if (forwardedFor) {
    const [first] = forwardedFor.split(',').map((part) => part.trim())
    if (first) return first
  }

  const realIp = c.req.header('X-Real-IP')
  if (realIp) return realIp

  return 'unknown'
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const store = getStore(options)

  return async (c: Context, next: Next) => {
    if (c.req.method === 'OPTIONS') {
      return next()
    }

    const key = getClientIdentifier(c)
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || entry.expiresAt <= now) {
      store.set(key, { count: 1, expiresAt: now + options.windowMs })
      cleanupStore(store, now)
      return next()
    }

    if (entry.count >= options.limit) {
      return c.json({ error: 'Too many requests. Please slow down.' }, 429)
    }

    entry.count += 1
    store.set(key, entry)
    cleanupStore(store, now)

    return next()
  }
}
