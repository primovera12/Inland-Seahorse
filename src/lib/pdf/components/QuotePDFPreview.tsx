'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Download, Printer } from 'lucide-react'
import { QuotePDFTemplate } from './QuotePDFTemplate'
import type { UnifiedPDFData } from '../types'
import { cn } from '@/lib/utils'

interface QuotePDFPreviewProps {
  data: UnifiedPDFData
  className?: string
  showControls?: boolean
  onDownload?: () => void
}

// Server-side PDF generation via API
async function generatePDFServer(data: UnifiedPDFData): Promise<Blob> {
  const response = await fetch('/api/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || 'Failed to generate PDF')
  }

  return response.blob()
}

export function QuotePDFPreview({
  data,
  className,
  showControls = true,
  onDownload,
}: QuotePDFPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use server-side Puppeteer for perfect PDF generation
  const handleDownload = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const blob = await generatePDFServer(data)

      // Download the PDF
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quote-${data.quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onDownload?.()
    } catch (err) {
      console.error('PDF generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  // Keep browser print for printing (uses CSS @media print)
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg no-print">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">Quote Preview</h3>
            {isGenerating && (
              <span className="text-sm text-slate-500">Generating PDF...</span>
            )}
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={isGenerating}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>

            <Button size="sm" onClick={handleDownload} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      )}

      {/* PDF Content */}
      <div
        ref={containerRef}
        className="bg-slate-100 dark:bg-slate-800 rounded-lg overflow-auto"
        style={{ maxHeight: showControls ? '70vh' : 'none' }}
      >
        <QuotePDFTemplate data={data} />
      </div>
    </div>
  )
}

// Simple download button component for integration
interface QuotePDFDownloadButtonProps {
  data: UnifiedPDFData
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children?: React.ReactNode
}

export function QuotePDFDownloadButton({
  data,
  className,
  variant = 'default',
  size = 'default',
  children,
}: QuotePDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const blob = await generatePDFServer(data)

      // Download the PDF
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quote-${data.quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleDownload}
      disabled={isGenerating}
      title={error || undefined}
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {children || 'Download PDF'}
    </Button>
  )
}

export default QuotePDFPreview
