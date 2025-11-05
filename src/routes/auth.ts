import { Hono } from 'hono'
import type { Context } from 'hono'
import { SignJWT } from 'jose'
import { parse, serialize } from 'hono/utils/cookie'
import type { Env } from '../types'
import {
  AUTH_COOKIE_NAME,
  JWT_AUDIENCE,
  STATE_COOKIE_NAME,
  createRateLimiter,
  ensureStrongSecret,
} from '../utils/security'

type AppEnv = { Bindings: Env }

export const authRoutes = new Hono<AppEnv>()

const authRateLimiter = createRateLimiter({ windowMs: 60_000, limit: 5 })

authRoutes.use('/login', authRateLimiter)
authRoutes.use('/callback', authRateLimiter)
authRoutes.use('/logout', authRateLimiter)

const clearCookie = (name: string) =>
  serialize(name, '', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 0,
  })

// Redirect to GitHub OAuth
authRoutes.get('/login', (c: Context<AppEnv>) => {
  const state = crypto.randomUUID()
  const stateCookie = serialize(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 600,
    path: '/',
  })
  c.header('Set-Cookie', stateCookie)

  const params = new URLSearchParams({
    client_id: c.env!.GITHUB_CLIENT_ID,
    redirect_uri: c.env!.REDIRECT_URI,
    scope: 'repo delete_repo',
    state,
  })

  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
})

// Handle OAuth callback
authRoutes.get('/callback', async (c: Context<AppEnv>) => {
  try {
    ensureStrongSecret(c.env!.JWT_SECRET)
    const code = c.req.query('code')
    const state = c.req.query('state')
    const cookies = parse(c.req.header('Cookie') ?? '')
    const storedState = cookies[STATE_COOKIE_NAME]

    if (!code) {
      return c.json({ error: 'No authorization code provided' }, 400)
    }

    if (!state || !storedState || storedState !== state) {
      console.error('OAuth state validation failed')
      const expiredStateCookie = clearCookie(STATE_COOKIE_NAME)
      c.header('Set-Cookie', expiredStateCookie)
      return c.json({ error: 'Invalid OAuth state parameter' }, 400)
    }

    const expiredStateCookie = clearCookie(STATE_COOKIE_NAME)
    c.header('Set-Cookie', expiredStateCookie)

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: c.env!.GITHUB_CLIENT_ID,
        client_secret: c.env!.GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string }

    if (!tokenData.access_token) {
      console.error('GitHub OAuth error:', tokenData)
      return c.json({ error: 'Failed to obtain access token' }, 400)
    }

    // Sign JWT with GitHub access token (10 min expiry)
    const secret = new TextEncoder().encode(c.env!.JWT_SECRET)
    const jwt = await new SignJWT({ token: tokenData.access_token })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10m')
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setAudience(JWT_AUDIENCE)
      .setIssuer('mass-github-repo-deleter')
      .sign(secret)

    const authCookie = serialize(AUTH_COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 600,
      path: '/',
    })

    c.header('Set-Cookie', authCookie, { append: true })

    // Redirect to frontend without exposing the token in the URL
    return c.redirect('/')
  } catch (error) {
    console.error('Auth callback error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
})

authRoutes.get('/logout', (c: Context<AppEnv>) => {
  const clearAuth = clearCookie(AUTH_COOKIE_NAME)
  const clearStateCookie = clearCookie(STATE_COOKIE_NAME)
  c.header('Set-Cookie', clearAuth)
  c.header('Set-Cookie', clearStateCookie, { append: true })
  return c.json({ success: true })
})
