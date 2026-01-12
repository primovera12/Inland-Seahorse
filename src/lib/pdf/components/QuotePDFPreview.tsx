'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Download, Printer, ExternalLink } from 'lucide-react'
import { QuotePDFTemplate } from './QuotePDFTemplate'
import { useQuotePDF } from '../hooks/useQuotePDF'
import type { UnifiedPDFData } from '../types'
import { cn } from '@/lib/utils'

interface QuotePDFPreviewProps {
  data: UnifiedPDFData
  className?: string
  showControls?: boolean
  onDownload?: () => void
}

export function QuotePDFPreview({
  data,
  className,
  showControls = true,
  onDownload,
}: QuotePDFPreviewProps) {
  const { containerRef, isGenerating, progress, error, downloadPDF, previewPDF, print } =
    useQuotePDF()

  const handleDownload = async () => {
    await downloadPDF(data, {
      filename: `quote-${data.quoteNumber}.pdf`,
    })
    onDownload?.()
  }

  const handlePreview = async () => {
    await previewPDF()
  }

  const handlePrint = () => {
    print()
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg no-print">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">Quote Preview</h3>
            {isGenerating && (
              <span className="text-sm text-slate-500">
                Generating... {Math.round(progress)}%
              </span>
            )}
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={isGenerating}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>

            <Button variant="outline" size="sm" onClick={handlePreview} disabled={isGenerating}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview
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

  const handleDownload = async () => {
    setIsGenerating(true)

    try {
      // Create hidden container
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '210mm'
      container.style.backgroundColor = '#ffffff'
      document.body.appendChild(container)

      // Import and render
      const { createRoot } = await import('react-dom/client')
      const { createElement } = await import('react')
      const { downloadUnifiedPDF } = await import('../unified-pdf-generator')

      const root = createRoot(container)
      root.render(createElement(QuotePDFTemplate, { data }))

      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 500))

      const element = container.querySelector('#quote-pdf-content') as HTMLElement
      if (element) {
        await downloadUnifiedPDF(element, data, {
          filename: `quote-${data.quoteNumber}.pdf`,
        })
      }

      root.unmount()
      document.body.removeChild(container)
    } catch (err) {
      console.error('PDF generation error:', err)
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
