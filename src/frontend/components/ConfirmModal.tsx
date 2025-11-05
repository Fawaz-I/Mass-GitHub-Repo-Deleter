import { useState } from 'react'
import { motion } from 'framer-motion'
import { SpotlightCard } from './ui/SpotlightCard'

interface ConfirmModalProps {
  count: number
  isDryRun: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ count, isDryRun, onConfirm, onCancel }: ConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('')

  const isValid = isDryRun || confirmText === 'DELETE'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="max-w-md w-full"
      >
        <SpotlightCard className="backdrop-blur-sm bg-zinc-950/90">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="inline-block p-4 bg-gradient-to-br from-red-600/20 to-orange-600/20 rounded-2xl mb-4 border border-red-500/30"
            >
              <svg
                className="w-14 h-14 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {isDryRun ? 'Preview Deletion' : 'Confirm Deletion'}
            </h2>
            <p className="text-zinc-400">
              {isDryRun
                ? `Preview deletion of ${count} repositor${count !== 1 ? 'ies' : 'y'}`
                : `You are about to delete ${count} repositor${count !== 1 ? 'ies' : 'y'}`}
            </p>
          </div>

          {!isDryRun && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                placeholder="DELETE"
                autoFocus
              />
            </div>
          )}

          {!isDryRun && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-200">
                <strong>Warning:</strong> This action cannot be undone. All selected repositories will be permanently deleted.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!isValid}
              className={`flex-1 btn-danger ${
                !isValid ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isDryRun ? 'Preview' : 'Delete'}
            </button>
          </div>
        </SpotlightCard>
      </motion.div>
    </motion.div>
  )
}