import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { jwtVerify } from 'jose'
import { Octokit } from '@octokit/rest'
import type { Env, Repository, ActionResult } from '../types'

type AppEnv = { Bindings: Env; Variables: { githubToken: string } }

export const apiRoutes = new Hono<AppEnv>()

// JWT verification middleware
const verifyJWT = async (c: Context<AppEnv>, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const secret = new TextEncoder().encode(c.env!.JWT_SECRET)
    
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload.token) {
      return c.json({ error: 'Invalid token payload' }, 401)
    }

    c.set('githubToken', payload.token as string)
    await next()
  } catch (error) {
    console.error('JWT verification error:', error)
    return c.json({ error: 'Invalid or expired token', message: (error as Error).message }, 401)
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
    console.error('Fetch repos error:', error)
    return c.json({ error: 'Failed to fetch repositories', message: (error as Error).message }, 500)
  }
})

// Delete multiple repositories
apiRoutes.post('/delete', verifyJWT, async (c) => {
  try {
    const token = c.get('githubToken')
    const body = await c.req.json()
    const { repos, dryRun = false } = body as { repos: string[]; dryRun?: boolean }

    if (!Array.isArray(repos) || repos.length === 0) {
      return c.json({ error: 'Invalid request: repos must be a non-empty array' }, 400)
    }

    const octokit = new Octokit({ auth: token })
    const results: ActionResult[] = []

    // Process deletions sequentially to avoid rate limits
    for (const repoFullName of repos) {
      try {
        const [owner, repo] = repoFullName.split('/')
        
        if (!owner || !repo) {
          results.push({
            repo: repoFullName,
            success: false,
            error: 'Invalid repository format (expected owner/repo)',
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
          error: error.message || 'Unknown error',
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
    console.error('Delete repos error:', error)
    return c.json({ error: 'Failed to delete repositories', message: (error as Error).message }, 500)
  }
})

// Archive multiple repositories
apiRoutes.post('/archive', verifyJWT, async (c) => {
  try {
    const token = c.get('githubToken')
    const body = await c.req.json()
    const { repos } = body as { repos: string[] }

    if (!Array.isArray(repos) || repos.length === 0) {
      return c.json({ error: 'Invalid request: repos must be a non-empty array' }, 400)
    }

    const octokit = new Octokit({ auth: token })
    const results: ActionResult[] = []

    for (const repoFullName of repos) {
      try {
        const [owner, repo] = repoFullName.split('/')

        if (!owner || !repo) {
          results.push({
            repo: repoFullName,
            success: false,
            error: 'Invalid repository format (expected owner/repo)',
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
          error: error.message || 'Unknown error',
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
    console.error('Archive repos error:', error)
    return c.json({ error: 'Failed to archive repositories', message: (error as Error).message }, 500)
  }
})