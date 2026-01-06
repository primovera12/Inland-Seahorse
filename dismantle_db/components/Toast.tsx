'use client'

import { useEffect } from 'react'

export interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div
        className={`px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
          type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}
      >
        {message}
      </div>
    </div>
  )
}
