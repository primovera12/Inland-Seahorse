'use client'

import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react'
import type { AutoSaveStatus } from '@/hooks/use-auto-save'

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus
  lastSaved: Date | null
  error?: Error | null
  className?: string
}

function formatLastSaved(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  error,
  className = '',
}: AutoSaveIndicatorProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'idle':
        return null
      case 'unsaved':
        return (
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
            <Cloud className="h-3.5 w-3.5" />
            <span>Unsaved changes</span>
          </span>
        )
      case 'saving':
        return (
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Saving...</span>
          </span>
        )
      case 'saved':
        return (
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
            <Check className="h-3.5 w-3.5" />
            <span>
              Saved{lastSaved ? ` ${formatLastSaved(lastSaved)}` : ''}
            </span>
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-500" title={error?.message}>
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Save failed</span>
          </span>
        )
    }
  }

  const display = getStatusDisplay()
  if (!display) return null

  return (
    <div className={`text-xs font-medium ${className}`}>
      {display}
    </div>
  )
}
