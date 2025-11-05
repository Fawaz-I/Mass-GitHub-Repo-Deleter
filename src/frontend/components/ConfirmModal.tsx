import { useState } from 'react'
import { motion } from 'framer-motion'
import { SpotlightCard } from './ui/SpotlightCard'
import type { BulkAction } from '../../types'

interface ConfirmModalProps {
  count: number
  action: BulkAction
  isDryRun: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ count, action, isDryRun, onConfirm, onCancel }: ConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('')

  const confirmWord = action === 'delete' ? 'DELETE' : 'ARCHIVE'
  const showConfirmInput = action === 'delete' ? !isDryRun : true
  const isValid = showConfirmInput ? confirmText === confirmWord : true
  const title = action === 'delete'
    ? isDryRun
      ? 'Preview Deletion'
      : 'Confirm Deletion'
    : 'Confirm Archiving'
  const description = action === 'delete'
    ? isDryRun
      ? `Preview deletion of ${count} repositor${count !== 1 ? 'ies' : 'y'}`
      : `You are about to delete ${count} repositor${count !== 1 ? 'ies' : 'y'}`
    : `You are about to archive ${count} repositor${count !== 1 ? 'ies' : 'y'}`
  const warningText = action === 'delete'
    ? 'This action cannot be undone. All selected repositories will be permanently deleted.'
    : 'Repositories can be unarchived later, but they will become read-only until you do so.'
  const confirmButtonText = action === 'delete' ? (isDryRun ? 'Preview' : 'Delete') : 'Archive'
  const accentBorder = action === 'delete' && !isDryRun ? 'border-red-500/30' : 'border-orange-500/30'

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
              className={`inline-block p-4 bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-2xl mb-4 border ${accentBorder}`}
            >
              <svg
                className="w-14 h-14 text-orange-400"
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
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-zinc-400">{description}</p>
          </div>

          {showConfirmInput && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Type <span className="font-mono font-bold text-orange-400">{confirmWord}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder={confirmWord}
                autoFocus
              />
            </div>
          )}

          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-sm text-orange-200">
              <strong>Warning:</strong> {warningText}
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!isValid}
              className={`flex-1 ${action === 'delete' && !isDryRun ? 'btn-danger' : 'btn-primary'} ${
                !isValid ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {confirmButtonText}
            </button>
          </div>
        </SpotlightCard>
      </motion.div>
    </motion.div>
  )
}