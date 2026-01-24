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

  // Process a single file and return its items
  const processFile = useCallback(async (file: File): Promise<LoadItem[]> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/load-planner/analyze', {
      method: 'POST',
      body: formData
    })
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || `Failed to parse ${file.name}`)
    }
    return data.parsedLoad?.items || []
  }, [])

  // Process text and return items
  const processText = useCallback(async (text: string): Promise<LoadItem[]> => {
    const response = await fetch('/api/load-planner/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailText: text })
    })
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to parse text')
    }
    return data.parsedLoad?.items || []
  }, [])

  const analyzeContent = useCallback(async (files?: File[], text?: string) => {
    onLoading(true)
    onError(null)

    try {
      let allItems: LoadItem[] = []

      if (files && files.length > 0) {
        const totalFiles = files.length

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const fileName = file.name.toLowerCase()
          const fileSize = (file.size / 1024).toFixed(1)
          const fileNum = i + 1

          // Show progress for multiple files
          const prefix = totalFiles > 1 ? `[File ${fileNum}/${totalFiles}] ` : ''

          updateStatus(`${prefix}Step 1/4: Reading ${file.name} (${fileSize} KB)...`)
          await new Promise(r => setTimeout(r, 200))

          if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            updateStatus(`${prefix}Step 2/4: Extracting rows from spreadsheet...`)
          } else if (fileName.endsWith('.pdf')) {
            updateStatus(`${prefix}Step 2/4: Extracting text and images from PDF...`)
          } else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            updateStatus(`${prefix}Step 2/4: Encoding image for parsing...`)
          } else {
            updateStatus(`${prefix}Step 2/4: Reading file contents...`)
          }
          await new Promise(r => setTimeout(r, 200))

          updateStatus(`${prefix}Step 3/4: Parsing cargo data... (this may take 10-30 seconds)`)

          try {
            const fileItems = await processFile(file)
            // Re-ID items to avoid conflicts across files
            const reIdItems = fileItems.map((item, idx) => ({
              ...item,
              id: `file${i}-item-${idx}-${item.id}`
            }))
            allItems = [...allItems, ...reIdItems]
            updateStatus(`${prefix}Step 4/4: Found ${fileItems.length} items from ${file.name}`)
            await new Promise(r => setTimeout(r, 300))
          } catch (fileErr) {
            // Continue with other files even if one fails
            console.error(`Error processing ${file.name}:`, fileErr)
            updateStatus(`${prefix}⚠️ Failed to parse ${file.name}, continuing with other files...`)
            await new Promise(r => setTimeout(r, 500))
          }
        }

        if (allItems.length === 0) {
          throw new Error('No cargo items could be extracted from any files. Try different formats or add more details.')
        }

      } else if (text) {
        updateStatus('Step 1/4: Preparing text for parsing...')
        await new Promise(r => setTimeout(r, 300))
        updateStatus('Step 2/4: Parsing cargo data... (this may take 10-30 seconds)')

        allItems = await processText(text)

        if (allItems.length === 0) {
          throw new Error('No cargo items could be extracted. Try a different format or add more details.')
        }

        updateStatus(`Step 3/4: Found ${allItems.length} items!`)
        await new Promise(r => setTimeout(r, 300))
      } else {
        throw new Error('No input provided')
      }

      updateStatus(`Planning optimal truck loads for ${allItems.length} items...`)
      await new Promise(r => setTimeout(r, 400))

      // Generate load plan for all combined items
      const loadPlan = generateBasicLoadPlan(allItems)

      updateStatus(`✓ Complete! Loaded ${allItems.length} items onto ${loadPlan.totalTrucks} truck${loadPlan.totalTrucks > 1 ? 's' : ''}`)
      await new Promise(r => setTimeout(r, 300))

      onAnalyzed({
        items: allItems,
        loadPlan,
        parseMethod: 'pattern'
      })
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      onLoading(false)
      updateStatus('')
    }
  }, [onAnalyzed, onLoading, onError, updateStatus, processFile, processText])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      // Convert FileList to array for processing
      analyzeContent(Array.from(files))
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
      // Convert FileList to array for processing
      analyzeContent(Array.from(files))
    }
    // Reset input to allow selecting same files again
    e.target.value = ''
  }, [analyzeContent])

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      analyzeContent(undefined, textInput.trim())
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
            multiple
          />

          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />

          <p className="text-lg font-medium text-gray-700">
            {isDragging ? 'Drop your files here' : 'Drop files here'}
          </p>

          <p className="text-sm text-gray-500 mt-2">
            or click to browse (multiple files supported)
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
