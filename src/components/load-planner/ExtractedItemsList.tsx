'use client'

import { useState } from 'react'
import type { LoadItem } from '@/lib/load-planner/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Pencil, Trash2, Check, X, Plus, ChevronDown, ChevronUp, Package, Copy, AlertTriangle, Layers, Box } from 'lucide-react'

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
      quantity: item.quantity,
      stackable: item.stackable ?? false,
      fragile: item.fragile ?? false,
      hazmat: item.hazmat ?? false,
      bottomOnly: item.bottomOnly ?? false,
      maxLayers: item.maxLayers,
      orientation: item.orientation ?? 3,
      geometry: item.geometry ?? 'box',
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
      stackable: false,
      fragile: false,
      hazmat: false,
      bottomOnly: false,
      maxLayers: undefined,
      orientation: 3, // Rotatable by default
      geometry: 'box',
    }
    onChange([...items, newItem])
    handleEdit(newItem)
  }

  const handleDuplicate = (item: LoadItem) => {
    const newItem: LoadItem = {
      ...item,
      id: `item-${Date.now()}`,
      description: `${item.description} (copy)`
    }
    onChange([...items, newItem])
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
      {/* Header with count */}
      {items.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {items.length} item{items.length !== 1 ? 's' : ''} ({items.reduce((sum, i) => sum + i.quantity, 0)} total units)
          </span>
          {items.length > 3 && (
            <span className="text-xs text-muted-foreground">Scroll to see all</span>
          )}
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="py-8 text-center">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-1">No items added yet</p>
          <p className="text-xs text-gray-400">
            Upload a file or add items manually
          </p>
        </div>
      )}

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
                </div>

                {/* Cargo Options Section */}
                <Separator className="my-3" />
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Cargo Options
                  </Label>

                  {/* Boolean toggles in a grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`stackable-${item.id}`}
                        checked={editValues.stackable || false}
                        onCheckedChange={(checked) => setEditValues({ ...editValues, stackable: checked })}
                      />
                      <Label htmlFor={`stackable-${item.id}`} className="text-xs">Stackable</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id={`fragile-${item.id}`}
                        checked={editValues.fragile || false}
                        onCheckedChange={(checked) => setEditValues({ ...editValues, fragile: checked })}
                      />
                      <Label htmlFor={`fragile-${item.id}`} className="text-xs">Fragile</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id={`hazmat-${item.id}`}
                        checked={editValues.hazmat || false}
                        onCheckedChange={(checked) => setEditValues({ ...editValues, hazmat: checked })}
                      />
                      <Label htmlFor={`hazmat-${item.id}`} className="text-xs text-red-600">Hazmat</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id={`bottomOnly-${item.id}`}
                        checked={editValues.bottomOnly || false}
                        onCheckedChange={(checked) => setEditValues({ ...editValues, bottomOnly: checked })}
                      />
                      <Label htmlFor={`bottomOnly-${item.id}`} className="text-xs">Bottom Only</Label>
                    </div>
                  </div>

                  {/* Conditional max layers field */}
                  {editValues.stackable && (
                    <div className="flex items-center gap-3">
                      <Label className="text-xs whitespace-nowrap">Max Layers:</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={editValues.maxLayers || ''}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          maxLayers: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        placeholder="Unlimited"
                        className="w-24 h-8"
                      />
                    </div>
                  )}

                  {/* Geometry & Orientation */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Shape</Label>
                      <Select
                        value={editValues.geometry || 'box'}
                        onValueChange={(value) => setEditValues({
                          ...editValues,
                          geometry: value as 'box' | 'cylinder' | 'hollow-cylinder'
                        })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="cylinder">Cylinder</SelectItem>
                          <SelectItem value="hollow-cylinder">Hollow Cylinder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Orientation</Label>
                      <Select
                        value={String(editValues.orientation || 3)}
                        onValueChange={(value) => setEditValues({
                          ...editValues,
                          orientation: parseInt(value) as 1 | 3 | 63
                        })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Fixed (No Rotation)</SelectItem>
                          <SelectItem value="3">Rotatable (Default)</SelectItem>
                          <SelectItem value="63">Tiltable (Any Position)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Save/Cancel buttons */}
                <div className="flex gap-1 mt-4 justify-end">
                  <Button size="sm" onClick={handleSave}>
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{item.description}</span>
                      {item.quantity > 1 && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                          x{item.quantity}
                        </span>
                      )}
                      {item.hazmat && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          HAZMAT
                        </Badge>
                      )}
                      {item.fragile && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300 text-[10px] px-1.5 py-0">
                          Fragile
                        </Badge>
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
                      title="Edit item"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDuplicate(item)}
                      title="Duplicate item"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(item.id)}
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === item.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {/* Cargo Option Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {item.stackable && (
                        <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                          Stackable{item.maxLayers ? ` (max ${item.maxLayers})` : ''}
                        </Badge>
                      )}
                      {item.bottomOnly && (
                        <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                          Bottom Only
                        </Badge>
                      )}
                      {item.fragile && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                          Fragile
                        </Badge>
                      )}
                      {item.hazmat && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          HAZMAT
                        </Badge>
                      )}
                      {!item.stackable && !item.bottomOnly && !item.fragile && !item.hazmat && (
                        <span className="text-xs text-gray-400">No special handling requirements</span>
                      )}
                    </div>

                    {/* Shape & Orientation */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Box className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">Shape:</span>{' '}
                        <span className="capitalize">{item.geometry || 'box'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Orientation:</span>{' '}
                        <span>
                          {item.orientation === 1 ? 'Fixed' : item.orientation === 63 ? 'Tiltable' : 'Rotatable'}
                        </span>
                      </div>
                      {item.sku && (
                        <div className="col-span-2">
                          <span className="text-gray-500">SKU:</span> {item.sku}
                        </div>
                      )}
                    </div>
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
