'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/image-upload'
import { Trash2, Package, Ruler, Scale, AlertTriangle, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import type { CargoItem } from '@/types/inland'
import { trpc } from '@/lib/trpc/client'

interface CargoItemCardProps {
  item: CargoItem
  onUpdate: (item: CargoItem) => void
  onRemove: () => void
  canRemove: boolean
}

// Legal limits for standard freight (can be configured later)
const LEGAL_LIMITS = {
  length: 53 * 12, // 53 feet in inches
  width: 8.5 * 12, // 8.5 feet (102 inches)
  height: 13.5 * 12, // 13.5 feet (162 inches)
  weight: 80000, // 80,000 lbs
}

export function CargoItemCard({
  item,
  onUpdate,
  onRemove,
  canRemove,
}: CargoItemCardProps) {
  const [isEquipmentMode, setIsEquipmentMode] = useState(item.is_equipment || false)
  const [isCustomEquipment, setIsCustomEquipment] = useState(item.is_custom_equipment || false)
  const [selectedMakeId, setSelectedMakeId] = useState(item.equipment_make_id || '')

  // Fetch makes
  const { data: makes } = trpc.equipment.getMakes.useQuery()

  // Fetch models when make is selected
  const { data: models } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId },
    { enabled: !!selectedMakeId }
  )

  // Fetch dimensions when model is selected
  const { data: dimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: item.equipment_model_id || '' },
    { enabled: !!item.equipment_model_id }
  )

  // Check for oversize/overweight
  const checkLimits = (
    length: number,
    width: number,
    height: number,
    weight: number
  ): { isOversize: boolean; isOverweight: boolean } => {
    const isOversize =
      length > LEGAL_LIMITS.length ||
      width > LEGAL_LIMITS.width ||
      height > LEGAL_LIMITS.height
    const isOverweight = weight > LEGAL_LIMITS.weight
    return { isOversize, isOverweight }
  }

  // Update dimension field
  const updateDimension = (
    field: 'length_inches' | 'width_inches' | 'height_inches' | 'weight_lbs',
    value: number
  ) => {
    const updated = { ...item, [field]: value }
    const { isOversize, isOverweight } = checkLimits(
      updated.length_inches,
      updated.width_inches,
      updated.height_inches,
      updated.weight_lbs
    )
    onUpdate({ ...updated, is_oversize: isOversize, is_overweight: isOverweight })
  }

  // Handle equipment mode toggle
  const handleEquipmentModeToggle = (enabled: boolean) => {
    setIsEquipmentMode(enabled)
    if (!enabled) {
      // Clear equipment fields when disabling
      onUpdate({
        ...item,
        is_equipment: false,
        is_custom_equipment: false,
        equipment_make_id: undefined,
        equipment_model_id: undefined,
        equipment_make_name: undefined,
        equipment_model_name: undefined,
        custom_make_name: undefined,
        custom_model_name: undefined,
      })
      setSelectedMakeId('')
      setIsCustomEquipment(false)
    } else {
      onUpdate({ ...item, is_equipment: true })
    }
  }

  // Handle custom equipment toggle
  const handleCustomEquipmentToggle = (isCustom: boolean) => {
    setIsCustomEquipment(isCustom)
    if (isCustom) {
      // Switch to custom mode - clear database selections
      onUpdate({
        ...item,
        is_custom_equipment: true,
        equipment_make_id: undefined,
        equipment_model_id: undefined,
        equipment_make_name: undefined,
        equipment_model_name: undefined,
        custom_make_name: item.custom_make_name || '',
        custom_model_name: item.custom_model_name || '',
      })
      setSelectedMakeId('')
    } else {
      // Switch to database mode - clear custom entries
      onUpdate({
        ...item,
        is_custom_equipment: false,
        custom_make_name: undefined,
        custom_model_name: undefined,
      })
    }
  }

  // Update custom make/model
  const handleCustomMakeChange = (value: string) => {
    onUpdate({
      ...item,
      custom_make_name: value,
      description: `${value} ${item.custom_model_name || ''}`.trim(),
    })
  }

  const handleCustomModelChange = (value: string) => {
    onUpdate({
      ...item,
      custom_model_name: value,
      description: `${item.custom_make_name || ''} ${value}`.trim(),
    })
  }

  // Handle make selection
  const handleMakeChange = (makeId: string) => {
    const make = makes?.find((m) => m.id === makeId)
    setSelectedMakeId(makeId)
    onUpdate({
      ...item,
      equipment_make_id: makeId,
      equipment_make_name: make?.name || '',
      equipment_model_id: undefined,
      equipment_model_name: undefined,
    })
  }

  // Handle model selection with auto-fill dimensions
  const handleModelChange = (modelId: string) => {
    const model = models?.find((m) => m.id === modelId)
    onUpdate({
      ...item,
      equipment_model_id: modelId,
      equipment_model_name: model?.name || '',
      description: `${item.equipment_make_name || ''} ${model?.name || ''}`.trim(),
    })
  }

  // Auto-fill dimensions when they're loaded
  if (dimensions && item.equipment_model_id && dimensions.model_id === item.equipment_model_id) {
    const shouldUpdate =
      item.length_inches !== dimensions.length_inches ||
      item.width_inches !== dimensions.width_inches ||
      item.height_inches !== dimensions.height_inches ||
      item.weight_lbs !== dimensions.weight_lbs

    if (shouldUpdate) {
      const { isOversize, isOverweight } = checkLimits(
        dimensions.length_inches,
        dimensions.width_inches,
        dimensions.height_inches,
        dimensions.weight_lbs
      )
      onUpdate({
        ...item,
        length_inches: dimensions.length_inches,
        width_inches: dimensions.width_inches,
        height_inches: dimensions.height_inches,
        weight_lbs: dimensions.weight_lbs,
        is_oversize: isOversize,
        is_overweight: isOverweight,
      })
    }
  }

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Label className="text-sm">Equipment Mode</Label>
            <Switch
              checked={isEquipmentMode}
              onCheckedChange={handleEquipmentModeToggle}
            />
          </div>
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Equipment Mode Selectors */}
      {isEquipmentMode && (
        <div className="space-y-3 mb-4">
          {/* Toggle between database and custom entry */}
          <div className="flex items-center gap-4 p-2 rounded-lg bg-muted/50">
            <button
              type="button"
              onClick={() => handleCustomEquipmentToggle(false)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                !isCustomEquipment
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              Select from Database
            </button>
            <button
              type="button"
              onClick={() => handleCustomEquipmentToggle(true)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                isCustomEquipment
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              Custom Entry
            </button>
            {isCustomEquipment && (
              <span className="text-xs text-muted-foreground ml-auto">
                Enter equipment not in database
              </span>
            )}
          </div>

          {/* Database Selection Mode */}
          {!isCustomEquipment && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Make</Label>
                <Select value={selectedMakeId} onValueChange={handleMakeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent>
                    {makes?.map((make) => (
                      <SelectItem key={make.id} value={make.id}>
                        {make.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model</Label>
                <Select
                  value={item.equipment_model_id || ''}
                  onValueChange={handleModelChange}
                  disabled={!selectedMakeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedMakeId ? 'Select model' : 'Select make first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Custom Entry Mode */}
          {isCustomEquipment && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Make (Custom)</Label>
                <Input
                  placeholder="e.g., Caterpillar, Komatsu..."
                  value={item.custom_make_name || ''}
                  onChange={(e) => handleCustomMakeChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model (Custom)</Label>
                <Input
                  placeholder="e.g., 320GC, PC210LC..."
                  value={item.custom_model_name || ''}
                  onChange={(e) => handleCustomModelChange(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description and Quantity */}
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        <div className="md:col-span-3 space-y-1">
          <Label className="text-xs">Description</Label>
          <Input
            placeholder="Cargo description"
            value={item.description}
            onChange={(e) => onUpdate({ ...item, description: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qty</Label>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onUpdate({ ...item, quantity: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>

      {/* Dimensions */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            Length (in)
          </Label>
          <Input
            type="number"
            min={0}
            value={item.length_inches || ''}
            onChange={(e) => updateDimension('length_inches', parseInt(e.target.value) || 0)}
            className={item.is_oversize && item.length_inches > LEGAL_LIMITS.length ? 'border-orange-500' : ''}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            Width (in)
          </Label>
          <Input
            type="number"
            min={0}
            value={item.width_inches || ''}
            onChange={(e) => updateDimension('width_inches', parseInt(e.target.value) || 0)}
            className={item.is_oversize && item.width_inches > LEGAL_LIMITS.width ? 'border-orange-500' : ''}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            Height (in)
          </Label>
          <Input
            type="number"
            min={0}
            value={item.height_inches || ''}
            onChange={(e) => updateDimension('height_inches', parseInt(e.target.value) || 0)}
            className={item.is_oversize && item.height_inches > LEGAL_LIMITS.height ? 'border-orange-500' : ''}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Scale className="h-3 w-3" />
            Weight (lbs)
          </Label>
          <Input
            type="number"
            min={0}
            value={item.weight_lbs || ''}
            onChange={(e) => updateDimension('weight_lbs', parseInt(e.target.value) || 0)}
            className={item.is_overweight ? 'border-red-500' : ''}
          />
        </div>
      </div>

      {/* Warnings */}
      {(item.is_oversize || item.is_overweight) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.is_oversize && (
            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Oversize - May require permits</span>
            </div>
          )}
          {item.is_overweight && (
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Overweight - May require permits</span>
            </div>
          )}
        </div>
      )}

      {/* Cargo Image */}
      <div className="mt-4 pt-4 border-t">
        <Label className="text-xs flex items-center gap-1 mb-2">
          <ImageIcon className="h-3 w-3" />
          Cargo Image (optional)
        </Label>
        <div className="flex items-start gap-4">
          {item.image_url ? (
            <div className="relative w-32 h-24 rounded-lg overflow-hidden border bg-muted">
              <Image
                src={item.image_url}
                alt={item.description || 'Cargo image'}
                fill
                className="object-cover"
                sizes="128px"
              />
            </div>
          ) : null}
          <div className="flex-1">
            <ImageUpload
              value={item.image_url || null}
              onChange={(url) => onUpdate({ ...item, image_url: url || undefined })}
              bucket="cargo-images"
              folder={`cargo/${item.id}`}
              label={item.image_url ? 'Change Image' : 'Upload Image'}
              maxSizeMB={5}
            />
            {item.image_url && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-destructive text-xs h-7"
                onClick={() => onUpdate({ ...item, image_url: undefined })}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
