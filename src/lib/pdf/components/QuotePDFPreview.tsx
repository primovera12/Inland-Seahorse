'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Download, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { QuotePDFTemplate } from './QuotePDFTemplate'
import type { UnifiedPDFData, PDFSectionVisibility } from '../types'
import { PDF_SECTION_LABELS, DEFAULT_PDF_SECTION_VISIBILITY } from '../types'
import { cn } from '@/lib/utils'

interface QuotePDFPreviewProps {
  data: UnifiedPDFData
  className?: string
  showControls?: boolean
  onDownload?: () => void
  sectionVisibility?: PDFSectionVisibility
  onSectionVisibilityChange?: (visibility: PDFSectionVisibility) => void
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
  sectionVisibility,
  onSectionVisibilityChange,
}: QuotePDFPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSectionToggles, setShowSectionToggles] = useState(false)

  const vis = sectionVisibility || data.sectionVisibility || DEFAULT_PDF_SECTION_VISIBILITY

  const handleToggle = (key: keyof PDFSectionVisibility) => {
    if (!onSectionVisibilityChange) return
    onSectionVisibilityChange({
      ...vis,
      [key]: !vis[key],
    })
  }

  const allVisible = Object.values(vis).every(Boolean)
  const noneVisible = Object.values(vis).every(v => !v)

  const handleShowAll = () => {
    if (!onSectionVisibilityChange) return
    const allOn = { ...vis }
    for (const key in allOn) {
      allOn[key as keyof PDFSectionVisibility] = true
    }
    onSectionVisibilityChange(allOn)
  }

  const handleHideAll = () => {
    if (!onSectionVisibilityChange) return
    const allOff = { ...vis }
    for (const key in allOff) {
      allOff[key as keyof PDFSectionVisibility] = false
    }
    onSectionVisibilityChange(allOff)
  }

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

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Controls */}
      {showControls && (
        <div className="mb-6 no-print space-y-3">
          <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">Quote Preview</h3>
              {isGenerating && (
                <span className="text-sm text-slate-500">Generating PDF...</span>
              )}
              {error && <span className="text-sm text-red-500">{error}</span>}
            </div>

            <div className="flex items-center gap-2">
              {onSectionVisibilityChange && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSectionToggles(!showSectionToggles)}
                >
                  {showSectionToggles ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  Sections
                  {showSectionToggles ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </Button>
              )}
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

          {/* Section Visibility Toggles */}
          {showSectionToggles && onSectionVisibilityChange && (
            <div className="p-4 bg-white dark:bg-slate-800 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Show / Hide PDF Sections
                </h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleShowAll} disabled={allVisible} className="text-xs h-7">
                    Show All
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleHideAll} disabled={noneVisible} className="text-xs h-7">
                    Hide All
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                {(Object.keys(PDF_SECTION_LABELS) as Array<keyof PDFSectionVisibility>).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      id={`pdf-section-${key}`}
                      checked={vis[key]}
                      onCheckedChange={() => handleToggle(key)}
                      className="scale-75"
                    />
                    <Label
                      htmlFor={`pdf-section-${key}`}
                      className={cn(
                        'text-xs cursor-pointer select-none',
                        vis[key] ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 line-through'
                      )}
                    >
                      {PDF_SECTION_LABELS[key]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
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
