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
import {
  inchesToFtInInput,
  ftInInputToInches,
  formatDimension,
  formatWeight,
  parseDimensionToInches,
  parseWeightToLbs,
  type DimensionUnit,
  type WeightUnit,
} from '@/lib/dimensions'

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

// Unit options for dimensions and weight
const DIMENSION_UNITS: { value: DimensionUnit; label: string }[] = [
  { value: 'ft-in', label: 'ft-in' },
  { value: 'inches', label: 'in' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
  { value: 'meters', label: 'm' },
]

const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'lbs', label: 'lbs' },
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
]

export function CargoItemCard({
  item,
  onUpdate,
  onRemove,
  canRemove,
}: CargoItemCardProps) {
  const [isEquipmentMode, setIsEquipmentMode] = useState(item.is_equipment || false)
  const [isCustomEquipment, setIsCustomEquipment] = useState(item.is_custom_equipment || false)
  const [selectedMakeId, setSelectedMakeId] = useState(item.equipment_make_id || '')

  // Unit selection state
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('ft-in')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs')

  // Local input state (in selected unit)
  const [dimensionInputs, setDimensionInputs] = useState({
    length: inchesToFtInInput(item.length_inches),
    width: inchesToFtInInput(item.width_inches),
    height: inchesToFtInInput(item.height_inches),
  })
  const [weightInput, setWeightInput] = useState(String(item.weight_lbs || ''))

  // Fetch makes
  const { data: makes } = trpc.equipment.getMakes.useQuery()

  // Fetch models when make is selected
  const { data: models } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId },
    { enabled: !!selectedMakeId }
  )

  // Fetch dimensions (includes images) when model is selected
  const { data: dimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: item.equipment_model_id || '' },
    { enabled: !!item.equipment_model_id }
  )

  // Mutation to save equipment images back to library
  const updateEquipmentImages = trpc.equipment.updateImages.useMutation()

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

  // Update dimension field (internal - receives inches)
  const updateDimensionInches = (
    field: 'length_inches' | 'width_inches' | 'height_inches',
    inches: number
  ) => {
    const updated = { ...item, [field]: inches }
    const { isOversize, isOverweight } = checkLimits(
      updated.length_inches,
      updated.width_inches,
      updated.height_inches,
      updated.weight_lbs
    )
    onUpdate({ ...updated, is_oversize: isOversize, is_overweight: isOverweight })
  }

  // Update weight field (internal - receives lbs)
  const updateWeightLbs = (lbs: number) => {
    const updated = { ...item, weight_lbs: lbs }
    const { isOversize, isOverweight } = checkLimits(
      updated.length_inches,
      updated.width_inches,
      updated.height_inches,
      updated.weight_lbs
    )
    onUpdate({ ...updated, is_oversize: isOversize, is_overweight: isOverweight })
  }

  // Handle dimension input change (with unit conversion)
  const handleDimensionInputChange = (
    field: 'length' | 'width' | 'height',
    value: string
  ) => {
    setDimensionInputs(prev => ({ ...prev, [field]: value }))
  }

  // Handle dimension blur (parse, convert to inches, and save)
  const handleDimensionBlur = (field: 'length' | 'width' | 'height') => {
    const inputValue = dimensionInputs[field]
    const inchesField = `${field}_inches` as 'length_inches' | 'width_inches' | 'height_inches'

    // Parse value based on selected unit
    const inches = parseDimensionToInches(inputValue, dimensionUnit)

    // Update the display to normalized format based on unit
    if (dimensionUnit === 'ft-in') {
      setDimensionInputs(prev => ({ ...prev, [field]: inchesToFtInInput(inches) }))
    } else {
      // For other units, just keep the numeric value
      setDimensionInputs(prev => ({ ...prev, [field]: inputValue }))
    }

    updateDimensionInches(inchesField, inches)
  }

  // Handle weight input change
  const handleWeightInputChange = (value: string) => {
    setWeightInput(value)
  }

  // Handle weight blur (parse, convert to lbs, and save)
  const handleWeightBlur = () => {
    const lbs = parseWeightToLbs(weightInput, weightUnit)
    updateWeightLbs(lbs)
  }

  // Handle dimension unit change - convert existing values
  const handleDimensionUnitChange = (newUnit: DimensionUnit) => {
    setDimensionUnit(newUnit)
    // Reset inputs to reflect current values in new unit format
    if (newUnit === 'ft-in') {
      setDimensionInputs({
        length: inchesToFtInInput(item.length_inches),
        width: inchesToFtInInput(item.width_inches),
        height: inchesToFtInInput(item.height_inches),
      })
    } else {
      // For other units, clear inputs - user will re-enter
      setDimensionInputs({ length: '', width: '', height: '' })
    }
  }

  // Handle weight unit change
  const handleWeightUnitChange = (newUnit: WeightUnit) => {
    setWeightUnit(newUnit)
    // Clear input - user will re-enter in new unit
    setWeightInput('')
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

  // Auto-fill dimensions and images when they're loaded from library
  if (dimensions && item.equipment_model_id && dimensions.model_id === item.equipment_model_id) {
    const dimData = dimensions as typeof dimensions & { front_image_url?: string; side_image_url?: string }
    const shouldUpdate =
      item.length_inches !== dimData.length_inches ||
      item.width_inches !== dimData.width_inches ||
      item.height_inches !== dimData.height_inches ||
      item.weight_lbs !== dimData.weight_lbs ||
      // Also check if library has images that the item doesn't
      (dimData.front_image_url && !item.front_image_url) ||
      (dimData.side_image_url && !item.side_image_url)

    if (shouldUpdate) {
      const { isOversize, isOverweight } = checkLimits(
        dimData.length_inches,
        dimData.width_inches,
        dimData.height_inches,
        dimData.weight_lbs
      )
      onUpdate({
        ...item,
        length_inches: dimData.length_inches,
        width_inches: dimData.width_inches,
        height_inches: dimData.height_inches,
        weight_lbs: dimData.weight_lbs,
        is_oversize: isOversize,
        is_overweight: isOverweight,
        // Auto-fill images from library if available and item doesn't have them
        front_image_url: item.front_image_url || dimData.front_image_url || undefined,
        side_image_url: item.side_image_url || dimData.side_image_url || undefined,
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

      {/* Dimensions with Unit Selection */}
      <div className="space-y-3">
        {/* Unit Selectors */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Dimensions:</Label>
            <Select value={dimensionUnit} onValueChange={(v) => handleDimensionUnitChange(v as DimensionUnit)}>
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSION_UNITS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value} className="text-xs">
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Weight:</Label>
            <Select value={weightUnit} onValueChange={(v) => handleWeightUnitChange(v as WeightUnit)}>
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHT_UNITS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value} className="text-xs">
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dimension Inputs */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              Length ({dimensionUnit})
            </Label>
            <Input
              type="text"
              placeholder={dimensionUnit === 'ft-in' ? 'e.g., 30-4' : '0'}
              value={dimensionInputs.length}
              onChange={(e) => handleDimensionInputChange('length', e.target.value)}
              onBlur={() => handleDimensionBlur('length')}
              className={item.is_oversize && item.length_inches > LEGAL_LIMITS.length ? 'border-orange-500' : ''}
            />
            {item.length_inches > 0 && (
              <p className="text-xs text-muted-foreground">{formatDimension(item.length_inches)}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              Width ({dimensionUnit})
            </Label>
            <Input
              type="text"
              placeholder={dimensionUnit === 'ft-in' ? 'e.g., 10-4' : '0'}
              value={dimensionInputs.width}
              onChange={(e) => handleDimensionInputChange('width', e.target.value)}
              onBlur={() => handleDimensionBlur('width')}
              className={item.is_oversize && item.width_inches > LEGAL_LIMITS.width ? 'border-orange-500' : ''}
            />
            {item.width_inches > 0 && (
              <p className="text-xs text-muted-foreground">{formatDimension(item.width_inches)}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              Height ({dimensionUnit})
            </Label>
            <Input
              type="text"
              placeholder={dimensionUnit === 'ft-in' ? 'e.g., 10-10' : '0'}
              value={dimensionInputs.height}
              onChange={(e) => handleDimensionInputChange('height', e.target.value)}
              onBlur={() => handleDimensionBlur('height')}
              className={item.is_oversize && item.height_inches > LEGAL_LIMITS.height ? 'border-orange-500' : ''}
            />
            {item.height_inches > 0 && (
              <p className="text-xs text-muted-foreground">{formatDimension(item.height_inches)}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Scale className="h-3 w-3" />
              Weight ({weightUnit})
            </Label>
            <Input
              type="text"
              placeholder="0"
              value={weightInput}
              onChange={(e) => handleWeightInputChange(e.target.value)}
              onBlur={handleWeightBlur}
              className={item.is_overweight ? 'border-red-500' : ''}
            />
            {item.weight_lbs > 0 && (
              <p className="text-xs text-muted-foreground">{formatWeight(item.weight_lbs)}</p>
            )}
          </div>
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

      {/* Cargo/Equipment Images */}
      <div className="mt-4 pt-4 border-t">
        <Label className="text-xs flex items-center gap-1 mb-2">
          <ImageIcon className="h-3 w-3" />
          {isEquipmentMode ? 'Equipment Images' : 'Cargo Image'} (optional)
        </Label>

        {/* Equipment Mode: Show front and side image uploads */}
        {isEquipmentMode ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Front Image */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Front View</Label>
              <div className="flex flex-col items-center gap-2">
                {item.front_image_url ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                    <Image
                      src={item.front_image_url}
                      alt={`${item.description || 'Equipment'} - Front`}
                      fill
                      className="object-contain"
                      sizes="200px"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-lg border-2 border-dashed bg-muted/30 flex items-center justify-center text-muted-foreground text-xs">
                    No front image
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <ImageUpload
                    value={item.front_image_url || null}
                    onChange={(url) => {
                      onUpdate({ ...item, front_image_url: url || undefined })
                      // Save to library if model is selected from database
                      if (url && item.equipment_model_id && !isCustomEquipment) {
                        updateEquipmentImages.mutate({
                          modelId: item.equipment_model_id,
                          frontImageUrl: url,
                        })
                      }
                    }}
                    bucket="cargo-images"
                    folder={`equipment/${item.equipment_model_id || item.id}/front`}
                    label={item.front_image_url ? 'Change' : 'Upload Front'}
                    maxSizeMB={5}
                  />
                  {item.front_image_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive text-xs h-7 px-2"
                      onClick={() => onUpdate({ ...item, front_image_url: undefined })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Side Image */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Side View</Label>
              <div className="flex flex-col items-center gap-2">
                {item.side_image_url ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                    <Image
                      src={item.side_image_url}
                      alt={`${item.description || 'Equipment'} - Side`}
                      fill
                      className="object-contain"
                      sizes="200px"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video rounded-lg border-2 border-dashed bg-muted/30 flex items-center justify-center text-muted-foreground text-xs">
                    No side image
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <ImageUpload
                    value={item.side_image_url || null}
                    onChange={(url) => {
                      onUpdate({ ...item, side_image_url: url || undefined })
                      // Save to library if model is selected from database
                      if (url && item.equipment_model_id && !isCustomEquipment) {
                        updateEquipmentImages.mutate({
                          modelId: item.equipment_model_id,
                          sideImageUrl: url,
                        })
                      }
                    }}
                    bucket="cargo-images"
                    folder={`equipment/${item.equipment_model_id || item.id}/side`}
                    label={item.side_image_url ? 'Change' : 'Upload Side'}
                    maxSizeMB={5}
                  />
                  {item.side_image_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive text-xs h-7 px-2"
                      onClick={() => onUpdate({ ...item, side_image_url: undefined })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standard cargo mode: Single image upload */
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
        )}
      </div>
    </div>
  )
}
