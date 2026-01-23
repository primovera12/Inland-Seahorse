'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FileText, Download, Printer, ExternalLink, Loader2, AlertCircle } from 'lucide-react'

interface PDFPreviewProps {
  quoteNumber: string
  onGeneratePDF?: () => Promise<string | null> // Returns data URL or null
  isReady: boolean // Whether all required data is available
}

export function PDFPreview({ quoteNumber, onGeneratePDF, isReady }: PDFPreviewProps) {
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState({
    includeLoadDiagrams: true,
    includePermitDetails: true,
    includeRouteMap: true,
  })

  const generatePreview = async () => {
    if (!onGeneratePDF) {
      setError('PDF generation not configured')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const dataUrl = await onGeneratePDF()
      setPdfDataUrl(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!pdfDataUrl) return

    const link = document.createElement('a')
    link.href = pdfDataUrl
    link.download = `quote-${quoteNumber}.pdf`
    link.click()
  }

  const handlePrint = () => {
    window.print()
  }

  const handleOpenInTab = () => {
    if (pdfDataUrl) {
      window.open(pdfDataUrl, '_blank')
    }
  }

  return (
    <div className="space-y-4">
      {/* Options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">PDF Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="load-diagrams">Include load diagrams</Label>
            <Switch
              id="load-diagrams"
              checked={options.includeLoadDiagrams}
              onCheckedChange={(v) => setOptions({ ...options, includeLoadDiagrams: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="permit-details">Include permit details</Label>
            <Switch
              id="permit-details"
              checked={options.includePermitDetails}
              onCheckedChange={(v) => setOptions({ ...options, includePermitDetails: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="route-map">Include route map</Label>
            <Switch
              id="route-map"
              checked={options.includeRouteMap}
              onCheckedChange={(v) => setOptions({ ...options, includeRouteMap: v })}
            />
          </div>
          <Button
            onClick={generatePreview}
            disabled={isGenerating || !isReady}
            className="w-full mt-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Preview'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Area */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Preview
          </CardTitle>
          <CardDescription>Quote #{quoteNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          {!isReady ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-center">Complete the quote details first</p>
              <p className="text-sm mt-2">Customer, route, and cargo are required</p>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p>Generating PDF preview...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-16 text-destructive">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p className="text-center">{error}</p>
              <Button variant="outline" onClick={generatePreview} className="mt-4">
                Retry
              </Button>
            </div>
          ) : pdfDataUrl ? (
            <iframe
              src={pdfDataUrl}
              className="w-full h-[600px] border rounded-lg"
              title="Quote PDF Preview"
            />
          ) : (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-center">Click &quot;Generate Preview&quot; to see the PDF</p>
              <p className="text-sm mt-2">
                PDF will include quote details, pricing, and optional diagrams
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={handleDownload}
          disabled={!pdfDataUrl}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button
          onClick={handlePrint}
          disabled={!isReady}
          variant="outline"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button
          onClick={handleOpenInTab}
          disabled={!pdfDataUrl}
          variant="outline"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open
        </Button>
      </div>
    </div>
  )
}
