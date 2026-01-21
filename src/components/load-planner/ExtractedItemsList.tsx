'use client'

import { useState } from 'react'
import type { LoadItem } from '@/lib/load-planner/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Check, X, Plus, ChevronDown, ChevronUp } from 'lucide-react'

interface ExtractedItemsListProps {
  items: LoadItem[]
  onChange: (items: LoadItem[]) => void
}

export function ExtractedItemsList({ items, onChange }: ExtractedItemsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<LoadItem>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleEdit = (item: LoadItem) => {
    setEditingId(item.id)
    setEditValues({
      description: item.description,
      length: item.length,
      width: item.width,
      height: item.height,
      weight: item.weight,
      quantity: item.quantity
    })
  }

  const handleSave = () => {
    if (!editingId) return

    onChange(items.map(item =>
      item.id === editingId
        ? { ...item, ...editValues }
        : item
    ))
    setEditingId(null)
    setEditValues({})
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValues({})
  }

  const handleDelete = (id: string) => {
    onChange(items.filter(item => item.id !== id))
  }

  const handleAddItem = () => {
    const newItem: LoadItem = {
      id: `item-${Date.now()}`,
      description: 'New Item',
      quantity: 1,
      length: 10,
      width: 8,
      height: 8,
      weight: 5000,
      stackable: true,
      fragile: false,
      hazmat: false
    }
    onChange([...items, newItem])
    handleEdit(newItem)
  }

  const formatDimensions = (item: LoadItem) => {
    return `${item.length.toFixed(1)}' x ${item.width.toFixed(1)}' x ${item.height.toFixed(1)}'`
  }

  const formatWeight = (weight: number) => {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(1)}k lbs`
    }
    return `${weight.toLocaleString()} lbs`
  }

  return (
    <div className="space-y-2">
      {/* Items List */}
      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`
              border rounded-lg transition-all
              ${editingId === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            {editingId === item.id ? (
              /* Edit Mode */
              <div className="p-3 space-y-3">
                <Input
                  value={editValues.description || ''}
                  onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                  placeholder="Item name"
                  className="font-medium"
                />

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Length (ft)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editValues.length || 0}
                      onChange={(e) => setEditValues({ ...editValues, length: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Width (ft)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editValues.width || 0}
                      onChange={(e) => setEditValues({ ...editValues, width: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Height (ft)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editValues.height || 0}
                      onChange={(e) => setEditValues({ ...editValues, height: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Weight (lbs)</label>
                    <Input
                      type="number"
                      value={editValues.weight || 0}
                      onChange={(e) => setEditValues({ ...editValues, weight: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Quantity</label>
                    <Input
                      type="number"
                      min="1"
                      value={editValues.quantity || 1}
                      onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="flex gap-1 mt-4">
                    <Button size="sm" onClick={handleSave}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.description}</span>
                      {item.quantity > 1 && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                          x{item.quantity}
                        </span>
                      )}
                      {expandedId === item.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {formatDimensions(item)} &bull; {formatWeight(item.weight)}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === item.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Stackable:</span>{' '}
                      <span className={item.stackable ? 'text-green-600' : 'text-red-600'}>
                        {item.stackable ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Fragile:</span>{' '}
                      <span className={item.fragile ? 'text-orange-600' : 'text-gray-600'}>
                        {item.fragile ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {item.sku && (
                      <div className="col-span-2">
                        <span className="text-gray-500">SKU:</span> {item.sku}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Item Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAddItem}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Item Manually
      </Button>

      {/* Summary */}
      {items.length > 0 && (
        <div className="pt-3 border-t border-gray-200 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>Total Items:</span>
            <span className="font-medium text-gray-700">
              {items.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total Weight:</span>
            <span className="font-medium text-gray-700">
              {formatWeight(items.reduce((sum, i) => sum + (i.weight * i.quantity), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
