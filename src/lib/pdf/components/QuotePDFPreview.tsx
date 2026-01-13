'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Download, Printer } from 'lucide-react'
import { QuotePDFTemplate } from './QuotePDFTemplate'
import type { UnifiedPDFData } from '../types'
import { unifiedPDFDataToMultiEquipmentPDF } from '../types'
import { downloadMultiEquipmentQuotePDFAsync } from '../quote-generator'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use jsPDF generator for reliable downloads (no html2canvas issues)
  const handleDownload = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const pdfData = unifiedPDFDataToMultiEquipmentPDF(data)
      await downloadMultiEquipmentQuotePDFAsync(pdfData, `quote-${data.quoteNumber}.pdf`)
      onDownload?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
      console.error('PDF generation error:', err)
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

  const handleDownload = async () => {
    setIsGenerating(true)
    try {
      // Use jsPDF generator for reliable downloads
      const pdfData = unifiedPDFDataToMultiEquipmentPDF(data)
      await downloadMultiEquipmentQuotePDFAsync(pdfData, `quote-${data.quoteNumber}.pdf`)
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
