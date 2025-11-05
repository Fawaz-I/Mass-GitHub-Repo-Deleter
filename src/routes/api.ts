import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { jwtVerify } from 'jose'
import { Octokit } from '@octokit/rest'
import { parse } from 'hono/utils/cookie'
import type { StatusCode } from 'hono/utils/http-status'
import type { Env, Repository, ActionResult } from '../types'
import {
  AUTH_COOKIE_NAME,
  JWT_AUDIENCE,
  MAX_REPO_BATCH,
  MAX_REQUEST_BODY_SIZE,
  MAX_REPO_NAME_LENGTH,
  createRateLimiter,
  ensureStrongSecret,
  sanitizeError,
} from '../utils/security'

type AppEnv = { Bindings: Env; Variables: { githubToken: string; githubUser: string; requestId: string } }

export const apiRoutes = new Hono<AppEnv>()

const apiRateLimiter = createRateLimiter({ windowMs: 60_000, limit: 10 })

apiRoutes.use('/delete', apiRateLimiter)
apiRoutes.use('/archive', apiRateLimiter)

const REPO_NAME_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/

class RequestBodyError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

const parseJsonBody = async <T>(c: Context<AppEnv>): Promise<T> => {
  const contentLengthHeader = c.req.header('Content-Length')
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_REQUEST_BODY_SIZE) {
    throw new RequestBodyError('Request payload too large', 413)
  }

  const buffer = await c.req.arrayBuffer()
  if (buffer.byteLength > MAX_REQUEST_BODY_SIZE) {
    throw new RequestBodyError('Request payload too large', 413)
  }

  if (buffer.byteLength === 0) {
    throw new RequestBodyError('Request body is empty')
  }

  const text = new TextDecoder().decode(buffer)

  try {
    return JSON.parse(text) as T
  } catch {
    throw new RequestBodyError('Invalid JSON payload')
  }
}

const validateRepoList = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RequestBodyError('Invalid request: repos must be a non-empty array')
  }

  if (value.length > MAX_REPO_BATCH) {
    throw new RequestBodyError(`Invalid request: maximum of ${MAX_REPO_BATCH} repositories per request`)
  }

  return value.map((repo) => {
    if (typeof repo !== 'string') {
      throw new RequestBodyError('Invalid repository identifier in request body')
    }

    const trimmed = repo.trim()

    if (trimmed.length > MAX_REPO_NAME_LENGTH) {
      throw new RequestBodyError('Repository name too long')
    }

    if (!REPO_NAME_PATTERN.test(trimmed)) {
      throw new RequestBodyError('Invalid repository format. Expected owner/repo')
    }

    return trimmed
  })
}

const extractTokenFromRequest = (c: Context<AppEnv>) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim()
  }

  const cookies = parse(c.req.header('Cookie') ?? '')
  const cookieToken = cookies[AUTH_COOKIE_NAME]
  if (cookieToken) {
    return cookieToken
  }

  return null
}

// JWT verification middleware
const verifyJWT = async (c: Context<AppEnv>, next: Next) => {
  try {
    ensureStrongSecret(c.env!.JWT_SECRET)
    const token = extractTokenFromRequest(c)

    if (!token) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const secret = new TextEncoder().encode(c.env!.JWT_SECRET)

    const { payload } = await jwtVerify(token, secret, { audience: JWT_AUDIENCE })

    if (!payload.token || typeof payload.token !== 'string' || !payload.jti) {
      return c.json({ error: 'Invalid authentication token' }, 401)
    }

    if (!payload.githubUser || typeof payload.githubUser !== 'string') {
      return c.json({ error: 'Invalid authentication token' }, 401)
    }

    c.set('githubToken', payload.token as string)
    c.set('githubUser', payload.githubUser as string)
    await next()
  } catch (error) {
    const isDev = c.env?.ENVIRONMENT !== 'production'
    const errorMessage = sanitizeError(error, isDev)
    return c.json({ error: errorMessage }, 401)
  }
}

// Get all repos for authenticated user
apiRoutes.get('/repos', verifyJWT, async (c) => {
  try {
    const token = c.get('githubToken')
    const octokit = new Octokit({ auth: token })

    // Fetch all repos (handle pagination)
    const repos: Repository[] = []
    let page = 1
    const perPage = 100

    while (true) {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        per_page: perPage,
        page,
        sort: 'updated',
        direction: 'desc',
        affiliation: 'owner',
      })

      if (data.length === 0) break

      repos.push(
        ...data.map((r) => ({
          name: r.name,
          full_name: r.full_name,
          private: r.private,
          updated_at: r.updated_at || '',
          owner: r.owner.login,
          description: r.description,
          html_url: r.html_url,
          archived: r.archived,
        }))
      )

      if (data.length < perPage) break
      page++
    }

    return c.json(repos)
  } catch (error) {
    const isDev = c.env?.ENVIRONMENT !== 'production'
    const errorMessage = sanitizeError(error, isDev)
    return c.json({ error: errorMessage }, 500)
  }
})

apiRoutes.get('/session', verifyJWT, (c) => {
  return c.json({ authenticated: true })
})

// Delete multiple repositories
apiRoutes.post('/delete', verifyJWT, async (c) => {
  try {
    const token = c.get('githubToken')
    const body = await parseJsonBody<{ repos: unknown; dryRun?: unknown }>(c)

    if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') {
      throw new RequestBodyError('Invalid request: dryRun must be a boolean flag')
    }

    const repos = validateRepoList(body.repos)
    const dryRun = body.dryRun === true

    const octokit = new Octokit({ auth: token })
    const githubUser = c.get('githubUser')
    const results: ActionResult[] = []

    // Process deletions sequentially to avoid rate limits
    for (const repoFullName of repos) {
      try {
        const [owner, repo] = repoFullName.split('/')

        // Verify repository ownership before deletion
        try {
          const { data: repoData } = await octokit.repos.get({ owner, repo })
          
          // Ensure the authenticated user owns the repository
          if (repoData.owner.login !== githubUser) {
            results.push({
              repo: repoFullName,
              success: false,
              error: 'Repository not found or access denied',
            })
            continue
          }
        } catch (error: any) {
          // If we can't fetch the repo, it doesn't exist or user doesn't have access
          results.push({
            repo: repoFullName,
            success: false,
            error: 'Repository not found or access denied',
          })
          continue
        }

        if (!dryRun) {
          await octokit.repos.delete({ owner, repo })
        }

        results.push({
          repo: repoFullName,
          success: true,
        })
      } catch (error: any) {
        results.push({
          repo: repoFullName,
          success: false,
          error: 'GitHub API request failed',
        })
      }
    }

    return c.json({
      dryRun,
      results,
      summary: {
        total: repos.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    })
  } catch (error) {
    if (error instanceof RequestBodyError) {
      c.status(error.status as StatusCode)
      return c.json({ error: error.message })
    }
    const isDev = c.env?.ENVIRONMENT !== 'production'
    const errorMessage = sanitizeError(error, isDev)
    return c.json({ error: errorMessage }, 500)
  }
})

// Archive multiple repositories
apiRoutes.post('/archive', verifyJWT, async (c) => {
  try {
    const token = c.get('githubToken')
    const body = await parseJsonBody<{ repos: unknown }>(c)
    const repos = validateRepoList(body.repos)

    const octokit = new Octokit({ auth: token })
    const githubUser = c.get('githubUser')
    const results: ActionResult[] = []

    for (const repoFullName of repos) {
      try {
        const [owner, repo] = repoFullName.split('/')

        // Verify repository ownership before archiving
        try {
          const { data: repoData } = await octokit.repos.get({ owner, repo })
          
          // Ensure the authenticated user owns the repository
          if (repoData.owner.login !== githubUser) {
            results.push({
              repo: repoFullName,
              success: false,
              error: 'Repository not found or access denied',
            })
            continue
          }
        } catch (error: any) {
          // If we can't fetch the repo, it doesn't exist or user doesn't have access
          results.push({
            repo: repoFullName,
            success: false,
            error: 'Repository not found or access denied',
          })
          continue
        }

        await octokit.repos.update({ owner, repo, archived: true })

        results.push({
          repo: repoFullName,
          success: true,
        })
      } catch (error: any) {
        results.push({
          repo: repoFullName,
          success: false,
          error: 'GitHub API request failed',
        })
      }
    }

    return c.json({
      results,
      summary: {
        total: repos.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    })
  } catch (error) {
    if (error instanceof RequestBodyError) {
      c.status(error.status as StatusCode)
      return c.json({ error: error.message })
    }
    const isDev = c.env?.ENVIRONMENT !== 'production'
    const errorMessage = sanitizeError(error, isDev)
    return c.json({ error: errorMessage }, 500)
  }
})
