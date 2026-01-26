'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Upload, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { LoadItem } from '@/lib/load-planner'

interface BulkEntryRow {
  id: string
  description: string
  length: string
  width: string
  height: string
  weight: string
  quantity: string
}

interface BulkCargoEntryProps {
  unitSystem: 'imperial' | 'metric'
  onAddItems: (items: LoadItem[]) => void
  metersToFeet: (m: number) => number
  kgToLbs: (kg: number) => number
}

const createEmptyRow = (): BulkEntryRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  description: '',
  length: '',
  width: '',
  height: '',
  weight: '',
  quantity: '1',
})

export function BulkCargoEntry({
  unitSystem,
  onAddItems,
  metersToFeet,
  kgToLbs,
}: BulkCargoEntryProps) {
  const [rows, setRows] = useState<BulkEntryRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ])

  const addRow = useCallback(() => {
    setRows(prev => [...prev, createEmptyRow()])
  }, [])

  const removeRow = useCallback((id: string) => {
    setRows(prev => {
      if (prev.length <= 1) return prev // Keep at least one row
      return prev.filter(row => row.id !== id)
    })
  }, [])

  const updateRow = useCallback((id: string, field: keyof BulkEntryRow, value: string) => {
    setRows(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ))
  }, [])

  // Handle paste from clipboard (Excel/Google Sheets)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (!pastedText) return

    // Check if it looks like tabular data (has tabs or multiple lines)
    if (!pastedText.includes('\t') && !pastedText.includes('\n')) return

    e.preventDefault()

    const lines = pastedText.trim().split('\n')
    const newRows: BulkEntryRow[] = []

    for (const line of lines) {
      const cells = line.split('\t').map(c => c.trim())
      if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue

      // Expected format: Description, Length, Width, Height, Weight, Quantity
      // Or: Description, L, W, H, Weight (quantity defaults to 1)
      const row = createEmptyRow()
      row.description = cells[0] || ''
      row.length = cells[1] || ''
      row.width = cells[2] || ''
      row.height = cells[3] || ''
      row.weight = cells[4] || ''
      row.quantity = cells[5] || '1'
      newRows.push(row)
    }

    if (newRows.length > 0) {
      setRows(newRows)
      toast.success(`Pasted ${newRows.length} rows from clipboard`)
    }
  }, [])

  // Validate and add all valid rows as cargo items
  const handleAddAll = useCallback(() => {
    const validItems: LoadItem[] = []
    let invalidCount = 0

    for (const row of rows) {
      const desc = row.description.trim()
      const rawLength = parseFloat(row.length) || 0
      const rawWidth = parseFloat(row.width) || 0
      const rawHeight = parseFloat(row.height) || 0
      const rawWeight = parseFloat(row.weight) || 0
      const quantity = parseInt(row.quantity) || 1

      // Skip empty rows
      if (!desc && !rawLength && !rawWidth && !rawHeight) continue

      // Validate required fields
      if (!desc || rawLength <= 0 || rawWidth <= 0 || rawHeight <= 0) {
        invalidCount++
        continue
      }

      // Convert to imperial if needed
      const length = unitSystem === 'metric' ? metersToFeet(rawLength) : rawLength
      const width = unitSystem === 'metric' ? metersToFeet(rawWidth) : rawWidth
      const height = unitSystem === 'metric' ? metersToFeet(rawHeight) : rawHeight
      const weight = unitSystem === 'metric' ? kgToLbs(rawWeight) : rawWeight

      validItems.push({
        id: `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: desc,
        length,
        width,
        height,
        weight,
        quantity,
        stackable: true,
        dimensionsSource: 'manual',
      })
    }

    if (validItems.length === 0) {
      toast.error('No valid items to add. Check that all rows have description and dimensions.')
      return
    }

    onAddItems(validItems)

    // Reset to empty rows
    setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()])

    if (invalidCount > 0) {
      toast.success(`Added ${validItems.length} items (${invalidCount} rows skipped due to missing data)`)
    } else {
      toast.success(`Added ${validItems.length} items`)
    }
  }, [rows, unitSystem, metersToFeet, kgToLbs, onAddItems])

  const dimUnit = unitSystem === 'imperial' ? 'ft' : 'm'
  const weightUnit = unitSystem === 'imperial' ? 'lbs' : 'kg'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Enter multiple items or paste from Excel (Desc, L, W, H, Weight, Qty)
        </div>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Add Row
        </Button>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[1fr,80px,80px,80px,80px,60px,40px] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>Description</span>
        <span>L ({dimUnit})</span>
        <span>W ({dimUnit})</span>
        <span>H ({dimUnit})</span>
        <span>Wt ({weightUnit})</span>
        <span>Qty</span>
        <span></span>
      </div>

      {/* Data rows */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto" onPaste={handlePaste}>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid grid-cols-[1fr,80px,80px,80px,80px,60px,40px] gap-2 items-center"
          >
            <Input
              value={row.description}
              onChange={e => updateRow(row.id, 'description', e.target.value)}
              placeholder="Item name"
              className="h-8 text-sm"
            />
            <Input
              type="number"
              step="0.1"
              value={row.length}
              onChange={e => updateRow(row.id, 'length', e.target.value)}
              placeholder="0"
              className="h-8 text-sm"
            />
            <Input
              type="number"
              step="0.1"
              value={row.width}
              onChange={e => updateRow(row.id, 'width', e.target.value)}
              placeholder="0"
              className="h-8 text-sm"
            />
            <Input
              type="number"
              step="0.1"
              value={row.height}
              onChange={e => updateRow(row.id, 'height', e.target.value)}
              placeholder="0"
              className="h-8 text-sm"
            />
            <Input
              type="number"
              value={row.weight}
              onChange={e => updateRow(row.id, 'weight', e.target.value)}
              placeholder="0"
              className="h-8 text-sm"
            />
            <Input
              type="number"
              min="1"
              value={row.quantity}
              onChange={e => updateRow(row.id, 'quantity', e.target.value)}
              placeholder="1"
              className="h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => removeRow(row.id)}
              disabled={rows.length <= 1}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={handleAddAll}>
          <Check className="h-4 w-4 mr-2" />
          Add All Valid Items
        </Button>
      </div>
    </div>
  )
}
