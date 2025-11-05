export interface Env {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  JWT_SECRET: string
  REDIRECT_URI: string
  [key: string]: unknown
}

export interface Repository {
  name: string
  full_name: string
  private: boolean
  updated_at: string
  owner: string
  description: string | null
  html_url: string
  archived?: boolean
}

export interface ActionResult {
  repo: string
  success: boolean
  error?: string
}

export type BulkAction = 'delete' | 'archive'