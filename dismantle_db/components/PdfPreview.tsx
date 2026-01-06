'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface PdfPreviewProps {
  pdfBlob: Blob | null
  isGenerating: boolean
  className?: string
}

export default function PdfPreview({ pdfBlob, isGenerating, className = '' }: PdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(100)
  const previousUrlRef = useRef<string | null>(null)

  // Create blob URL and handle cleanup
  useEffect(() => {
    // Revoke previous URL to prevent memory leaks
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current)
      previousUrlRef.current = null
    }

    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
      previousUrlRef.current = url
    } else {
      setPdfUrl(null)
    }

    // Cleanup on unmount
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current)
        previousUrlRef.current = null
      }
    }
  }, [pdfBlob])

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 25, 200))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 25, 50))
  }, [])

  const handleResetZoom = useCallback(() => {
    setScale(100)
  }, [])

  return (
    <div className={`flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
        <span className="text-sm font-medium">PDF Preview</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Zoom Out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-xs hover:bg-gray-700 rounded transition-colors"
            title="Reset Zoom"
          >
            {scale}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative overflow-auto bg-gray-200">
        {isGenerating && (
          <div className="absolute inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center z-10">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow">
              <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-gray-600">Updating preview...</span>
            </div>
          </div>
        )}

        {pdfUrl ? (
          <div
            className="min-h-full flex justify-center p-4"
            style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              key={pdfUrl}
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              className="w-[816px] h-[1056px] bg-white shadow-lg border-0"
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-center">
              {isGenerating ? 'Generating preview...' : 'Fill in the form to see a live preview of your quote'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
