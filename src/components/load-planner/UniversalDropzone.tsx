'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, Image, FileSpreadsheet, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { LoadItem, LoadPlan, TruckType } from '@/lib/load-planner/types'
import { trucks } from '@/lib/load-planner/trucks'

interface LoadPlanResult {
  loads: Array<{
    id: string
    items: LoadItem[]
    truck: TruckType
    placements: Array<{
      itemId: string
      x: number
      z: number
      rotated: boolean
    }>
    utilization: {
      weight: number
      space: number
    }
    warnings: string[]
  }>
  totalTrucks: number
  totalWeight: number
  totalItems: number
  warnings: string[]
}

interface UniversalDropzoneProps {
  onAnalyzed: (result: {
    items: LoadItem[]
    loadPlan: LoadPlanResult
    parseMethod: 'AI' | 'pattern'
  }) => void
  onLoading: (loading: boolean) => void
  onError: (error: string | null) => void
  onStatusChange?: (status: string) => void
}

export function UniversalDropzone({ onAnalyzed, onLoading, onError, onStatusChange }: UniversalDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [mode, setMode] = useState<'drop' | 'text'>('drop')
  const [textInput, setTextInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateStatus = useCallback((status: string) => {
    onStatusChange?.(status)
  }, [onStatusChange])

  const analyzeContent = useCallback(async (file?: File, text?: string) => {
    onLoading(true)
    onError(null)

    try {
      let response: Response

      if (file) {
        // Show file-specific status
        const fileName = file.name.toLowerCase()
        updateStatus(`Reading ${file.name}...`)
        await new Promise(r => setTimeout(r, 300)) // Brief pause for UX

        if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          updateStatus('Extracting data from spreadsheet...')
        } else if (fileName.endsWith('.pdf')) {
          updateStatus('Extracting text from PDF...')
        } else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          updateStatus('Processing image with AI vision...')
        } else {
          updateStatus('Reading file contents...')
        }
        await new Promise(r => setTimeout(r, 500))

        updateStatus('Analyzing with Claude Opus 4.5...')

        const formData = new FormData()
        formData.append('file', file)
        response = await fetch('/api/load-planner/analyze', {
          method: 'POST',
          body: formData
        })
      } else if (text) {
        updateStatus('Preparing text for analysis...')
        await new Promise(r => setTimeout(r, 300))
        updateStatus('Analyzing with Claude Opus 4.5...')

        response = await fetch('/api/load-planner/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailText: text })
        })
      } else {
        throw new Error('No input provided')
      }

      updateStatus('Processing AI response...')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed')
      }

      // Get items from parsed load
      const items: LoadItem[] = data.parsedLoad?.items || []

      if (items.length === 0) {
        throw new Error('No cargo items could be extracted. Try a different format or add more details.')
      }

      updateStatus(`Found ${items.length} items! Planning load across trucks...`)
      await new Promise(r => setTimeout(r, 400))

      // Get or generate load plan
      const loadPlan: LoadPlanResult = data.loadPlan || generateBasicLoadPlan(items)

      updateStatus(`Done! Loaded onto ${loadPlan.totalTrucks} truck${loadPlan.totalTrucks > 1 ? 's' : ''}`)
      await new Promise(r => setTimeout(r, 300))

      onAnalyzed({
        items,
        loadPlan,
        parseMethod: data.metadata?.parseMethod || 'pattern'
      })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      onLoading(false)
      updateStatus('')
    }
  }, [onAnalyzed, onLoading, onError, updateStatus])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      analyzeContent(files[0])
    }
  }, [analyzeContent])

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
      analyzeContent(files[0])
    }
  }, [analyzeContent])

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      analyzeContent(undefined, textInput)
    }
  }, [textInput, analyzeContent])

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'drop' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('drop')}
        >
          Upload File
        </Button>
        <Button
          variant={mode === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('text')}
        >
          Paste Text
        </Button>
      </div>

      {mode === 'drop' ? (
        /* Dropzone */
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
            ${isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.xlsx,.xls,.csv,.txt,.eml,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileSelect}
          />

          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />

          <p className="text-lg font-medium text-gray-700">
            {isDragging ? 'Drop your file here' : 'Drop any file here'}
          </p>

          <p className="text-sm text-gray-500 mt-2">
            or click to browse
          </p>

          <div className="flex items-center justify-center gap-3 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" /> PDF
            </span>
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4" /> Excel/CSV
            </span>
            <span className="flex items-center gap-1">
              <Image className="w-4 h-4" /> Images
            </span>
            <span className="flex items-center gap-1">
              <File className="w-4 h-4" /> Text
            </span>
          </div>
        </div>
      ) : (
        /* Text Input */
        <div className="space-y-3">
          <Textarea
            placeholder="Paste your cargo details here...

Examples:
- Email with dimensions: 'Transformer 21ft x 10ft x 13ft, 197,000 lbs'
- Packing list text
- Any format with dimensions and weights"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={8}
            className="resize-none"
          />
          <Button
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            className="w-full"
          >
            Analyze Text
          </Button>
        </div>
      )}
    </div>
  )
}

// Generate a basic load plan from items when API doesn't return one
function generateBasicLoadPlan(items: LoadItem[]): LoadPlanResult {
  // Get the actual flatbed-53 truck from the database
  const defaultTruck = trucks.find(t => t.id === 'flatbed-53') || trucks[0]

  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0)
  const totalArea = items.reduce((sum, item) => sum + (item.length * item.width * item.quantity), 0)
  const truckArea = defaultTruck.deckLength * defaultTruck.deckWidth

  return {
    loads: [{
      id: 'load-1',
      items: items,
      truck: defaultTruck,
      placements: items.map((item, i) => ({
        itemId: item.id,
        x: i * 5, // Simple stagger for now
        z: 0,
        rotated: false
      })),
      utilization: {
        weight: Math.round((totalWeight / defaultTruck.maxCargoWeight) * 100),
        space: Math.round((totalArea / truckArea) * 100)
      },
      warnings: totalWeight > defaultTruck.maxCargoWeight ? ['Weight exceeds truck capacity'] : []
    }],
    totalTrucks: 1,
    totalWeight,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    warnings: []
  }
}
