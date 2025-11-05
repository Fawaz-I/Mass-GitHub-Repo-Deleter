import type { Context, Next } from 'hono'
import type { Env } from '../types'

export const JWT_AUDIENCE = 'mass-github-repo-deleter'
export const STATE_COOKIE_NAME = 'oauth_state'
export const AUTH_COOKIE_NAME = 'auth_token'
export const MAX_REQUEST_BODY_SIZE = 1024 * 1024 // 1MB
export const MAX_REPO_BATCH = 100
export const MAX_REPO_NAME_LENGTH = 100

interface RateLimitOptions {
  windowMs: number
  limit: number
}

export const ensureStrongSecret = (secret: string) => {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
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

const getRateLimitKey = (identifier: string, windowMs: number): string => {
  const window = Math.floor(Date.now() / windowMs)
  return `ratelimit:${identifier}:${window}`
}

// In-memory fallback for local development (when KV is not available)
const memoryRateLimitStore = new Map<string, { count: number; expiresAt: number }>()

export const createRateLimiter = (options: RateLimitOptions) => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    if (c.req.method === 'OPTIONS') {
      return next()
    }

    const kv = c.env.RATE_LIMIT_KV
    const identifier = getClientIdentifier(c)
    const key = getRateLimitKey(identifier, options.windowMs)

    if (kv) {
      // Use Cloudflare KV for distributed rate limiting
      try {
        const countStr = await kv.get(key)
        const count = countStr ? parseInt(countStr, 10) : 0

        if (count >= options.limit) {
          return c.json({ error: 'Too many requests. Please slow down.' }, 429)
        }

        const expirationTtl = Math.ceil(options.windowMs / 1000)
        await kv.put(key, String(count + 1), { expirationTtl })
      } catch {
        // If KV fails, fail open for availability (rate limiting is best-effort)
        // Logging omitted to avoid exposing errors
      }
    } else {
      // Fallback to in-memory for local development
      // This is less secure but acceptable for dev when KV is not configured
      const now = Date.now()
      const stored = memoryRateLimitStore.get(key)

      if (!stored || stored.expiresAt <= now) {
        memoryRateLimitStore.set(key, { count: 1, expiresAt: now + options.windowMs })
      } else if (stored.count >= options.limit) {
        return c.json({ error: 'Too many requests. Please slow down.' }, 429)
      } else {
        stored.count += 1
      }

      // Cleanup expired entries periodically
      if (memoryRateLimitStore.size > 1000) {
        for (const [k, entry] of memoryRateLimitStore.entries()) {
          if (entry.expiresAt <= now) {
            memoryRateLimitStore.delete(k)
          }
        }
      }
    }

    return next()
  }
}

export const sanitizeError = (error: unknown, isDev: boolean): string => {
  if (!isDev) {
    // In production, return generic messages
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes('jwt') || message.includes('token') || message.includes('auth')) {
        return 'Authentication failed'
      }
      if (message.includes('github') || message.includes('api')) {
        return 'External service error'
      }
    }
    return 'An error occurred'
  }
  
  // In development, return more details
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}
