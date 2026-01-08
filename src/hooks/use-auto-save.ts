'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type AutoSaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

interface UseAutoSaveOptions<T> {
  data: T
  onSave: (data: T) => Promise<void>
  debounceMs?: number
  enabled?: boolean
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus
  lastSaved: Date | null
  error: Error | null
  save: () => Promise<void>
  markUnsaved: () => void
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const dataRef = useRef<T>(data)
  const isInitialMount = useRef(true)
  const isSaving = useRef(false)

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // Manual save function
  const save = useCallback(async () => {
    if (isSaving.current) return

    isSaving.current = true
    setStatus('saving')
    setError(null)

    try {
      await onSave(dataRef.current)
      setLastSaved(new Date())
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Save failed'))
      setStatus('error')
    } finally {
      isSaving.current = false
    }
  }, [onSave])

  // Mark as unsaved manually
  const markUnsaved = useCallback(() => {
    if (status !== 'saving') {
      setStatus('unsaved')
    }
  }, [status])

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!enabled) return

    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Mark as unsaved immediately on change
    if (status !== 'saving') {
      setStatus('unsaved')
    }

    // Set debounce timer
    debounceTimerRef.current = setTimeout(() => {
      save()
    }, debounceMs)

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [data, enabled, debounceMs, save, status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    status,
    lastSaved,
    error,
    save,
    markUnsaved,
  }
}
