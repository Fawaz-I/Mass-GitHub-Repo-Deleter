import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ConfirmModal from './ConfirmModal'
import ProgressModal from './ProgressModal'
import { SpotlightCard } from './ui/SpotlightCard'
import { cn } from '../lib/utils'

interface Repository {
  name: string
  full_name: string
  private: boolean
  updated_at: string
  owner: string
  description: string | null
  html_url: string
}

interface DeleteResult {
  repo: string
  success: boolean
  error?: string
}

interface DashboardProps {
  jwt: string
  onLogout: () => void
}

export default function Dashboard({ jwt, onLogout }: DashboardProps) {
  const [repos, setRepos] = useState<Repository[]>([])
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPrivate, setFilterPrivate] = useState<'all' | 'public' | 'private'>('all')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [deleteResults, setDeleteResults] = useState<DeleteResult[]>([])
  const [isDryRun, setIsDryRun] = useState(false)

  useEffect(() => {
    fetchRepos()
  }, [jwt])

  useEffect(() => {
    let filtered = repos

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by visibility
    if (filterPrivate !== 'all') {
      filtered = filtered.filter((r) =>
        filterPrivate === 'private' ? r.private : !r.private
      )
    }

    setFilteredRepos(filtered)
  }, [repos, searchTerm, filterPrivate])

  const fetchRepos = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/repos', {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json() as { error?: string }
        throw new Error(errorData.error || 'Failed to fetch repositories')
      }

      const data = await response.json() as Repository[]
      setRepos(data)
    } catch (err) {
      setError((err as Error).message)
      if ((err as Error).message.includes('token')) {
        setTimeout(onLogout, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selected.size === filteredRepos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredRepos.map((r) => r.full_name)))
    }
  }

  const handleSelectRepo = (fullName: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(fullName)) {
      newSelected.delete(fullName)
    } else {
      newSelected.add(fullName)
    }
    setSelected(newSelected)
  }

  const handleDelete = async () => {
    try {
      setShowProgressModal(true)
      setDeleteResults([])

      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repos: Array.from(selected),
          dryRun: isDryRun,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete repositories')
      }

      const data = await response.json() as { results: DeleteResult[]; summary: { total: number; succeeded: number; failed: number } }
      setDeleteResults(data.results)

      if (!isDryRun) {
        // Remove deleted repos from list
        const deletedRepos = new Set(
          data.results.filter((r: DeleteResult) => r.success).map((r: DeleteResult) => r.repo)
        )
        setRepos((prev) => prev.filter((r) => !deletedRepos.has(r.full_name)))
        setSelected(new Set())
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-t-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-400 text-lg">Loading repositories...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <SpotlightCard className="max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-3">Error</h2>
          <p className="text-zinc-300 mb-6">{error}</p>
          <button onClick={fetchRepos} className="btn-primary w-full">
            Try Again
          </button>
        </SpotlightCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Your Repositories
            </h1>
            <p className="text-zinc-400 mt-2 text-lg">
              {repos.length} total · {selected.size} selected
            </p>
          </div>
          <button onClick={onLogout} className="btn-secondary">
            Logout
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <SpotlightCard className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <select
                value={filterPrivate}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterPrivate(e.target.value as 'all' | 'public' | 'private')}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
              >
                <option value="all">All repos</option>
                <option value="public">Public only</option>
                <option value="private">Private only</option>
              </select>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Actions */}
        {selected.size > 0 && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <SpotlightCard className="mb-6 border-orange-500/30">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={isDryRun}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsDryRun(e.target.checked)}
                      className="rounded border-zinc-600 text-orange-600 focus:ring-orange-500"
                    />
                    Dry run (don't actually delete)
                  </label>
                </div>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="btn-danger"
                >
                  {isDryRun ? 'Preview' : 'Delete'} {selected.size} repo{selected.size !== 1 ? 's' : ''}
                </button>
              </div>
            </SpotlightCard>
          </motion.div>
        )}

        {/* Repo List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <SpotlightCard className="overflow-hidden p-0">
            <table className="w-full">
              <thead className="bg-zinc-900/50">
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredRepos.length && filteredRepos.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-zinc-600 text-orange-600 focus:ring-orange-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Repository
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredRepos.map((repo, index) => (
                  <motion.tr
                    key={repo.full_name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className="hover:bg-zinc-900/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(repo.full_name)}
                        onChange={() => handleSelectRepo(repo.full_name)}
                        className="rounded border-zinc-600 text-orange-600 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 font-medium transition-colors inline-flex items-center gap-2 group-hover:gap-3"
                        >
                          {repo.full_name}
                          <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {repo.description && (
                          <p className="text-sm text-zinc-400 mt-1">
                            {repo.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-3 py-1 text-xs font-medium rounded-full',
                          repo.private
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        )}
                      >
                        {repo.private ? 'Private' : 'Public'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {formatDate(repo.updated_at)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {filteredRepos.length === 0 && (
              <div className="text-center py-16 text-zinc-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-lg">No repositories found</p>
              </div>
            )}
          </SpotlightCard>
        </motion.div>
      </div>

      {showConfirmModal && (
        <ConfirmModal
          count={selected.size}
          isDryRun={isDryRun}
          onConfirm={() => {
            setShowConfirmModal(false)
            handleDelete()
          }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {showProgressModal && (
        <ProgressModal
          results={deleteResults}
          isDryRun={isDryRun}
          onClose={() => setShowProgressModal(false)}
        />
      )}
    </div>
  )
}