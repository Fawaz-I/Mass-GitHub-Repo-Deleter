import { Hono } from 'hono'
import type { Context } from 'hono'
import { SignJWT } from 'jose'
import type { Env } from '../types'

type AppEnv = { Bindings: Env }

export const authRoutes = new Hono<AppEnv>()

// Redirect to GitHub OAuth
authRoutes.get('/login', (c: Context<AppEnv>) => {
  const params = new URLSearchParams({
    client_id: c.env!.GITHUB_CLIENT_ID,
    redirect_uri: c.env!.REDIRECT_URI,
    scope: 'repo delete_repo',
  })
  
  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
})

// Handle OAuth callback
authRoutes.get('/callback', async (c: Context<AppEnv>) => {
  try {
    const code = c.req.query('code')
    
    if (!code) {
      return c.json({ error: 'No authorization code provided' }, 400)
    }

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
      return c.json({ error: 'Failed to obtain access token', details: tokenData }, 400)
    }

    // Sign JWT with GitHub access token (10 min expiry)
    const secret = new TextEncoder().encode(c.env!.JWT_SECRET)
    const jwt = await new SignJWT({ token: tokenData.access_token })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10m')
      .setIssuedAt()
      .sign(secret)

    // Redirect to frontend with JWT
    return c.redirect(`/?auth=${jwt}`)
  } catch (error) {
    console.error('Auth callback error:', error)
    return c.json({ error: 'Authentication failed', message: (error as Error).message }, 500)
  }
})