'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Wand2,
  ArrowLeft
} from 'lucide-react'
import type { LoadItem } from '@/lib/load-planner/types'

interface AICargoParserProps {
  onItemsParsed: (items: LoadItem[]) => void
  onCancel: () => void
}

type ParseMode = 'image' | 'text' | null

interface ParseResult {
  success: boolean
  items: LoadItem[]
  confidence: number
  warnings: string[]
  errors: string[]
  rawText?: string
}

export function AICargoParser({ onItemsParsed, onCancel }: AICargoParserProps) {
  const [mode, setMode] = useState<ParseMode>(null)
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<ParseResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image upload handler
  const handleImageUpload = useCallback(async (file: File) => {
    setIsLoading(true)
    setResult(null)

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove data URL prefix to get just the base64
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Call API
      const response = await fetch('/api/load-planner/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type
        })
      })

      const data = await response.json()
      setResult({
        success: data.success,
        items: data.items || [],
        confidence: data.confidence || 0,
        warnings: data.warnings || [],
        errors: data.errors || [],
        rawText: data.rawText
      })
    } catch (error) {
      setResult({
        success: false,
        items: [],
        confidence: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Failed to process image']
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Text parse handler
  const handleParseText = useCallback(async () => {
    if (!text.trim()) return

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/load-planner/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      const data = await response.json()
      setResult({
        success: data.success,
        items: data.items || [],
        confidence: data.confidence || 0,
        warnings: data.warnings || [],
        errors: data.errors || [],
        rawText: text
      })
    } catch (error) {
      setResult({
        success: false,
        items: [],
        confidence: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Failed to parse text']
      })
    } finally {
      setIsLoading(false)
    }
  }, [text])

  // Drag and drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        handleImageUpload(file)
      }
    }
  }, [handleImageUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleImageUpload(files[0])
    }
  }, [handleImageUpload])

  // Accept parsed items
  const handleAccept = useCallback(() => {
    if (result?.items.length) {
      onItemsParsed(result.items)
    }
  }, [result, onItemsParsed])

  // Reset to start
  const handleReset = useCallback(() => {
    setResult(null)
    setMode(null)
    setText('')
  }, [])

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI Cargo Parser (Beta)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selection */}
        {!mode && !result && (
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => setMode('image')}
            >
              <Upload className="h-6 w-6" />
              <span>Upload Image</span>
              <span className="text-xs text-muted-foreground">
                Packing list, spec sheet, photo
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => setMode('text')}
            >
              <FileText className="h-6 w-6" />
              <span>Paste Text</span>
              <span className="text-xs text-muted-foreground">
                Spreadsheet data, cargo list
              </span>
            </Button>
          </div>
        )}

        {/* Image Upload */}
        {mode === 'image' && !result && (
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted'}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isLoading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileSelect}
              disabled={isLoading}
            />
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Analyzing image with AI...</p>
              </div>
            ) : isDragging ? (
              <p>Drop the image here...</p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p>Drag & drop an image, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supports: PNG, JPG, WebP, GIF
                </p>
              </div>
            )}
          </div>
        )}

        {/* Text Input */}
        {mode === 'text' && !result && (
          <div className="space-y-4">
            <Textarea
              placeholder={`Paste cargo list, spreadsheet data, or item descriptions here...

Example formats:
- Excavator, 25' x 10' x 11', 52,000 lbs
- Item: Transformer, L: 8ft, W: 6ft, H: 9ft, Weight: 15000#
- 2x Steel Beams, 40ft long, 2ft wide, 3ft tall, 8000 lbs each`}
              className="min-h-[200px] font-mono text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoading}
            />
            <Button
              onClick={handleParseText}
              disabled={!text.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Parse with AI
                </>
              )}
            </Button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Status */}
            {result.success ? (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="ml-2">
                  Found <strong>{result.items.length}</strong> item(s) with{' '}
                  <span className={getConfidenceColor(result.confidence)}>
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  {result.errors.join(', ') || 'Failed to parse cargo'}
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="ml-2">
                  <ul className="list-disc list-inside">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Parsed Items Preview */}
            {result.items.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">L x W x H (ft)</th>
                      <th className="px-3 py-2 text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((item, i) => (
                      <tr key={item.id || i} className="border-t">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {item.length.toFixed(1)} x {item.width.toFixed(1)} x{' '}
                          {item.height.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {item.weight.toLocaleString()} lbs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              {result.items.length > 0 && (
                <Button onClick={handleAccept} className="flex-1">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Use These Items ({result.items.length})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Back button when in a mode but no result */}
        {mode && !result && !isLoading && (
          <Button
            variant="ghost"
            onClick={() => {
              setMode(null)
              setText('')
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
