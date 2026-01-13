'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Download, Printer } from 'lucide-react'
import { QuotePDFTemplate } from './QuotePDFTemplate'
import type { UnifiedPDFData } from '../types'
import { unifiedPDFDataToMultiEquipmentPDF } from '../types'
import { generatePDFFromElement } from '../unified-pdf-generator'
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
  const [progress, setProgress] = useState(0)

  // Use html2canvas to capture the visual design exactly
  const handleDownload = async () => {
    if (!containerRef.current) {
      setError('PDF container not found')
      return
    }

    // Find the rendered PDF content element
    const element = containerRef.current.querySelector('#quote-pdf-content') as HTMLElement
    if (!element) {
      setError('PDF content not found')
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress(0)

    try {
      // Generate PDF from the rendered HTML using html2canvas
      const pdf = await generatePDFFromElement(element, {
        scale: 2,
        quality: 0.95,
        onProgress: setProgress,
      })

      // Download the PDF
      pdf.save(`quote-${data.quoteNumber}.pdf`)
      onDownload?.()
    } catch (err) {
      console.error('PDF generation error (html2canvas):', err)
      // Fallback to jsPDF generator which creates a clean PDF
      setError('Using alternative PDF generator...')
      try {
        const pdfData = unifiedPDFDataToMultiEquipmentPDF(data)
        await downloadMultiEquipmentQuotePDFAsync(pdfData, `quote-${data.quoteNumber}.pdf`)
        setError(null)
        onDownload?.()
      } catch (fallbackErr) {
        console.error('Fallback PDF generation also failed:', fallbackErr)
        setError('PDF generation failed. Please try again.')
      }
    } finally {
      setIsGenerating(false)
      setProgress(0)
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
              <span className="text-sm text-slate-500">
                Generating PDF... {progress > 0 && `${Math.round(progress)}%`}
              </span>
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
      // Use the direct generator which renders the template and captures it
      const { generateUnifiedPDFDirect } = await import('../unified-pdf-generator')
      const pdf = await generateUnifiedPDFDirect(data, {
        scale: 2,
        quality: 0.95,
      })
      pdf.save(`quote-${data.quoteNumber}.pdf`)
    } catch (err) {
      console.error('PDF generation error:', err)
      // Fallback to print dialog
      window.print()
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
