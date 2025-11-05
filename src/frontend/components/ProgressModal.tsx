import { motion } from 'framer-motion'
import { SpotlightCard } from './ui/SpotlightCard'

interface DeleteResult {
  repo: string
  success: boolean
  error?: string
}

interface ProgressModalProps {
  results: DeleteResult[]
  isDryRun: boolean
  onClose: () => void
}

export default function ProgressModal({ results, isDryRun, onClose }: ProgressModalProps) {
  const hasResults = results.length > 0
  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="max-w-2xl w-full max-h-[80vh]"
      >
        <SpotlightCard className="flex flex-col max-h-[80vh] backdrop-blur-sm bg-zinc-950/90 p-0">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              {isDryRun ? 'Dry Run Results' : 'Deletion Results'}
            </h2>
            {hasResults && (
              <p className="text-zinc-400 mt-2">
                {succeeded} succeeded · {failed} failed
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!hasResults ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-t-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-zinc-400 text-lg">
                  {isDryRun ? 'Checking repositories...' : 'Deleting repositories...'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={
                      result.success
                        ? 'p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg'
                        : 'p-4 bg-red-500/10 border border-red-500/30 rounded-lg'
                    }
                  >
                    <div className="flex items-start gap-3">
                      {result.success ? (
                        <svg
                          className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      <div className="flex-1">
                        <p className="font-mono text-sm text-white">{result.repo}</p>
                        {result.error && (
                          <p className="text-sm text-red-300 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {hasResults && (
            <div className="p-6 border-t border-zinc-800">
              <button onClick={onClose} className="w-full btn-primary">
                Close
              </button>
            </div>
          )}
        </SpotlightCard>
      </motion.div>
    </motion.div>
  )
}