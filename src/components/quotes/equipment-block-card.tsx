'use client'

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils'
import { formatDimension, formatWeight, inchesToFtInInput, ftInInputToInches } from '@/lib/dimensions'
import { LOCATIONS, COST_FIELDS, type LocationName, type CostField } from '@/types/equipment'
import type { EquipmentBlock, MiscellaneousFee } from '@/types/quotes'
import { MiscFeesList, calculateMiscFeesTotal } from './misc-fees-list'
import { ImageUpload } from '@/components/ui/image-upload'
import { ChevronDown, ChevronUp, Trash2, Copy } from 'lucide-react'

const COST_LABELS: Record<CostField, string> = {
  dismantling_loading_cost: 'Dismantling & Loading',
  loading_cost: 'Loading Only',
  blocking_bracing_cost: 'Blocking & Bracing',
  rigging_cost: 'Rigging',
  storage_cost: 'Storage',
  transport_cost: 'Transport',
  equipment_cost: 'Equipment',
  labor_cost: 'Labor',
  permit_cost: 'Permits',
  escort_cost: 'Escort',
  miscellaneous_cost: 'Miscellaneous',
}

interface EquipmentBlockCardProps {
  block: EquipmentBlock
  index: number
  onUpdate: (block: EquipmentBlock) => void
  onRemove: () => void
  onDuplicate: () => void
  canRemove: boolean
}

// Helper to sanitize cost value - converts NaN/undefined/null to 0
function sanitizeCost(value: number | null | undefined): number {
  if (value === null || value === undefined || isNaN(value)) {
    return 0
  }
  return value
}

export function EquipmentBlockCard({
  block,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
  canRemove,
}: EquipmentBlockCardProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [selectedMakeId, setSelectedMakeId] = useState(block.make_id || '')
  const [selectedModelId, setSelectedModelId] = useState(block.model_id || '')

  // Track if we've done the initial sync to avoid overwriting user selections
  const initialSyncDone = useRef(false)

  // Sync selectedMakeId and selectedModelId when block prop changes (e.g., when editing existing quote)
  useEffect(() => {
    // Always sync on first data load or when IDs change from external source
    if (block.make_id !== undefined) {
      const shouldSyncMake = block.make_id !== selectedMakeId || !initialSyncDone.current
      if (shouldSyncMake && block.make_id) {
        setSelectedMakeId(block.make_id)
      }
    }
    if (block.model_id !== undefined) {
      const shouldSyncModel = block.model_id !== selectedModelId || !initialSyncDone.current
      if (shouldSyncModel && block.model_id) {
        setSelectedModelId(block.model_id)
      }
    }
    // Mark initial sync as done after first render with data
    if ((block.make_id || block.model_id) && !initialSyncDone.current) {
      initialSyncDone.current = true
    }
  }, [block.make_id, block.model_id, selectedMakeId, selectedModelId])

  // Use refs to avoid stale closure issues when rates/dimensions return from cache
  const blockRef = useRef(block)
  const onUpdateRef = useRef(onUpdate)

  // Keep refs in sync with latest props - useLayoutEffect ensures this runs
  // synchronously before useEffect callbacks, preventing stale data issues
  useLayoutEffect(() => {
    blockRef.current = block
    onUpdateRef.current = onUpdate
  })

  // Fetch makes
  const { data: makes } = trpc.equipment.getMakes.useQuery()

  // Fetch models when make is selected
  const { data: models } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId },
    { enabled: !!selectedMakeId }
  )

  // Fetch rates when model and location are both selected
  const { data: rates } = trpc.equipment.getRates.useQuery(
    { modelId: selectedModelId, location: block.location! },
    { enabled: !!selectedModelId && !!block.location }
  )

  // Fetch dimensions when model changes
  // Use refetchOnMount to ensure fresh data when model changes
  const {
    data: dimensions,
    isFetching: dimensionsFetching,
    isSuccess: dimensionsSuccess,
    refetch: refetchDimensions,
  } = trpc.equipment.getDimensions.useQuery(
    { modelId: selectedModelId },
    {
      enabled: !!selectedModelId,
      refetchOnMount: 'always',
      staleTime: 0, // Always consider data stale to force refetch
    }
  )

  // Track the last model ID we updated dimensions for to prevent stale updates
  const lastDimensionsModelIdRef = useRef<string | null>(null)

  // Force refetch when model changes to ensure we get fresh data
  useEffect(() => {
    if (selectedModelId && selectedModelId !== lastDimensionsModelIdRef.current) {
      // Reset the ref immediately to prevent re-triggering
      lastDimensionsModelIdRef.current = selectedModelId
      // Force a refetch to get fresh data for this model
      refetchDimensions()
    }
  }, [selectedModelId, refetchDimensions])

  // State for equipment images (local state for optimistic UI)
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(
    block.front_image_url || null
  )
  const [sideImageUrl, setSideImageUrl] = useState<string | null>(
    block.side_image_url || null
  )

  // Mutation to update equipment images in database
  const updateImagesMutation = trpc.equipment.updateImages.useMutation()

  // Mutation to update equipment dimensions in database
  const upsertDimensionsMutation = trpc.equipment.upsertDimensions.useMutation()

  // Mutations for creating new makes and models on the fly
  const utils = trpc.useUtils()
  const createMakeMutation = trpc.equipment.createMake.useMutation({
    onSuccess: () => {
      utils.equipment.getMakes.invalidate()
    },
  })
  const createModelMutation = trpc.equipment.createModel.useMutation({
    onSuccess: () => {
      if (selectedMakeId) {
        utils.equipment.getModels.invalidate({ makeId: selectedMakeId })
      }
    },
  })

  // Local state for editable dimensions (stored in inches internally)
  const [localDimensions, setLocalDimensions] = useState({
    length_inches: block.length_inches || 0,
    width_inches: block.width_inches || 0,
    height_inches: block.height_inches || 0,
    weight_lbs: block.weight_lbs || 0,
  })

  // Local state for ft-in display strings (what user sees/types)
  const [dimensionInputs, setDimensionInputs] = useState({
    length: inchesToFtInInput(block.length_inches || 0),
    width: inchesToFtInInput(block.width_inches || 0),
    height: inchesToFtInInput(block.height_inches || 0),
    weight: String(block.weight_lbs || ''),
  })

  // Debounce timer ref for dimension auto-save
  const dimensionSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync local dimensions when block dimensions change (e.g., from database load)
  useEffect(() => {
    setLocalDimensions({
      length_inches: block.length_inches || 0,
      width_inches: block.width_inches || 0,
      height_inches: block.height_inches || 0,
      weight_lbs: block.weight_lbs || 0,
    })
    // Also sync the display strings
    setDimensionInputs({
      length: inchesToFtInInput(block.length_inches || 0),
      width: inchesToFtInInput(block.width_inches || 0),
      height: inchesToFtInInput(block.height_inches || 0),
      weight: String(block.weight_lbs || ''),
    })
  }, [block.length_inches, block.width_inches, block.height_inches, block.weight_lbs])

  // Auto-save dimensions to database with debounce
  const saveDimensionsToDatabase = useCallback(async (dims: typeof localDimensions) => {
    if (!selectedModelId) return

    try {
      await upsertDimensionsMutation.mutateAsync({
        modelId: selectedModelId,
        length_inches: dims.length_inches,
        width_inches: dims.width_inches,
        height_inches: dims.height_inches,
        weight_lbs: dims.weight_lbs,
      })
    } catch (error) {
      console.error('Failed to save dimensions:', error)
    }
  }, [selectedModelId, upsertDimensionsMutation])

  // Handle dimension input change (while typing - just update the display string)
  const handleDimensionInputChange = useCallback((field: 'length' | 'width' | 'height', value: string) => {
    setDimensionInputs(prev => ({ ...prev, [field]: value }))
  }, [])

  // Handle dimension blur (when leaving field - parse, convert, and save)
  const handleDimensionBlur = useCallback((field: 'length' | 'width' | 'height') => {
    const inputValue = dimensionInputs[field]
    const inchesField = `${field}_inches` as keyof typeof localDimensions

    // Smart parse: ftInInputToInches handles "30-4", "30.4", "30 4", or plain numbers
    const inches = ftInInputToInches(inputValue)

    // Update the display to the normalized ft-in format
    setDimensionInputs(prev => ({ ...prev, [field]: inchesToFtInInput(inches) }))

    // Update local dimensions
    const newDimensions = { ...localDimensions, [inchesField]: inches }
    setLocalDimensions(newDimensions)

    // Update block immediately for UI
    onUpdate({ ...block, [inchesField]: inches })

    // Debounce database save
    if (dimensionSaveTimerRef.current) {
      clearTimeout(dimensionSaveTimerRef.current)
    }
    dimensionSaveTimerRef.current = setTimeout(() => {
      saveDimensionsToDatabase(newDimensions)
    }, 1000)
  }, [dimensionInputs, localDimensions, block, onUpdate, saveDimensionsToDatabase])

  // Handle weight change (numbers only)
  const handleWeightChange = useCallback((value: string) => {
    setDimensionInputs(prev => ({ ...prev, weight: value }))
    const weightLbs = parseInt(value) || 0

    const newDimensions = { ...localDimensions, weight_lbs: weightLbs }
    setLocalDimensions(newDimensions)

    // Update block immediately for UI
    onUpdate({ ...block, weight_lbs: weightLbs })

    // Debounce database save
    if (dimensionSaveTimerRef.current) {
      clearTimeout(dimensionSaveTimerRef.current)
    }
    dimensionSaveTimerRef.current = setTimeout(() => {
      saveDimensionsToDatabase(newDimensions)
    }, 1000)
  }, [localDimensions, block, onUpdate, saveDimensionsToDatabase])

  // Cleanup timer on unmount AND when model changes
  // CRITICAL: Clear pending saves when switching models to prevent
  // old dimensions from being saved to the new model
  useEffect(() => {
    // Clear any pending save when model changes
    if (dimensionSaveTimerRef.current) {
      clearTimeout(dimensionSaveTimerRef.current)
      dimensionSaveTimerRef.current = null
    }
    return () => {
      if (dimensionSaveTimerRef.current) {
        clearTimeout(dimensionSaveTimerRef.current)
      }
    }
  }, [selectedModelId])

  // Update costs when rates change - uses refs to avoid stale closure
  // Also depends on selectedModelId and location to handle cached data scenarios
  useEffect(() => {
    if (rates && selectedModelId) {
      const newCosts: Record<CostField, number> = {} as Record<CostField, number>
      COST_FIELDS.forEach((field) => {
        newCosts[field] = rates[field] || 0
      })
      onUpdateRef.current({ ...blockRef.current, costs: newCosts })
    }
  }, [rates, selectedModelId, block.location])

  // Update dimensions when model changes - uses refs to avoid stale closure
  // Also clears dimensions when switching to a model without dimensions
  useEffect(() => {
    // Only update when:
    // 1. We have a model selected
    // 2. Query has completed successfully (not fetching anymore)
    // 3. The query was successful (isSuccess)
    if (selectedModelId && !dimensionsFetching && dimensionsSuccess) {
      onUpdateRef.current({
        ...blockRef.current,
        length_inches: dimensions?.length_inches ?? 0,
        width_inches: dimensions?.width_inches ?? 0,
        height_inches: dimensions?.height_inches ?? 0,
        weight_lbs: dimensions?.weight_lbs ?? 0,
      })
    }
  }, [dimensions, selectedModelId, dimensionsFetching, dimensionsSuccess])

  // Sync images from dimensions when model changes
  // Also clears images when switching to a model without dimensions
  useEffect(() => {
    // Only update when query has successfully completed
    if (selectedModelId && !dimensionsFetching && dimensionsSuccess) {
      setFrontImageUrl(dimensions?.front_image_url || null)
      setSideImageUrl(dimensions?.side_image_url || null)
      // Also update block with image URLs
      onUpdateRef.current({
        ...blockRef.current,
        front_image_url: dimensions?.front_image_url || undefined,
        side_image_url: dimensions?.side_image_url || undefined,
      })
    }
  }, [dimensions, selectedModelId, dimensionsFetching, dimensionsSuccess])

  // Handle front image change
  const handleFrontImageChange = async (url: string | null) => {
    setFrontImageUrl(url)
    onUpdate({ ...block, front_image_url: url || undefined })

    // Save to database
    if (selectedModelId) {
      try {
        await updateImagesMutation.mutateAsync({
          modelId: selectedModelId,
          frontImageUrl: url,
        })
      } catch (error) {
        console.error('Failed to update front image:', error)
      }
    }
  }

  // Handle side image change
  const handleSideImageChange = async (url: string | null) => {
    setSideImageUrl(url)
    onUpdate({ ...block, side_image_url: url || undefined })

    // Save to database
    if (selectedModelId) {
      try {
        await updateImagesMutation.mutateAsync({
          modelId: selectedModelId,
          sideImageUrl: url,
        })
      } catch (error) {
        console.error('Failed to update side image:', error)
      }
    }
  }

  // Calculate costs subtotal (without fees)
  const calculateCostsSubtotal = () => {
    return COST_FIELDS.reduce((total, field) => {
      if (!block.enabled_costs[field]) return total
      const cost = sanitizeCost(block.cost_overrides[field] ?? block.costs[field])
      return total + cost
    }, 0)
  }

  const costsSubtotal = calculateCostsSubtotal()
  const miscFees = block.misc_fees || []
  const miscFeesTotal = calculateMiscFeesTotal(miscFees, costsSubtotal)
  const subtotal = costsSubtotal + miscFeesTotal
  const totalWithQuantity = subtotal * block.quantity

  // Update parent when subtotal changes - uses refs to avoid stale closure
  useEffect(() => {
    const currentBlock = blockRef.current
    if (currentBlock.subtotal !== subtotal || currentBlock.total_with_quantity !== totalWithQuantity || currentBlock.misc_fees_total !== miscFeesTotal) {
      onUpdateRef.current({ ...currentBlock, subtotal, misc_fees_total: miscFeesTotal, total_with_quantity: totalWithQuantity })
    }
  }, [subtotal, totalWithQuantity, miscFeesTotal])

  // Handle fee changes
  const handleFeesChange = (newFees: MiscellaneousFee[]) => {
    onUpdate({ ...block, misc_fees: newFees })
  }

  const handleMakeChange = (makeId: string) => {
    const make = makes?.find((m) => m.id === makeId)
    setSelectedMakeId(makeId)
    setSelectedModelId('')
    onUpdate({
      ...block,
      make_id: makeId,
      make_name: make?.name || '',
      model_id: undefined,
      model_name: '',
    })
  }

  const handleModelChange = (modelId: string) => {
    const model = models?.find((m) => m.id === modelId)
    setSelectedModelId(modelId)
    onUpdate({
      ...block,
      model_id: modelId,
      model_name: model?.name || '',
    })
  }

  // Create a new make on the fly
  const handleCreateMake = async (makeName: string) => {
    try {
      const newMake = await createMakeMutation.mutateAsync({ name: makeName })
      // Select the newly created make
      setSelectedMakeId(newMake.id)
      setSelectedModelId('')
      onUpdate({
        ...block,
        make_id: newMake.id,
        make_name: newMake.name,
        model_id: undefined,
        model_name: '',
      })
    } catch (error) {
      console.error('Failed to create make:', error)
    }
  }

  // Create a new model on the fly
  const handleCreateModel = async (modelName: string) => {
    if (!selectedMakeId) return
    try {
      const newModel = await createModelMutation.mutateAsync({
        makeId: selectedMakeId,
        name: modelName,
      })
      // Select the newly created model
      setSelectedModelId(newModel.id)
      onUpdate({
        ...block,
        model_id: newModel.id,
        model_name: newModel.name,
      })
    } catch (error) {
      console.error('Failed to create model:', error)
    }
  }

  const handleLocationChange = (location: LocationName) => {
    onUpdate({ ...block, location })
  }

  const handleQuantityChange = (quantity: number) => {
    onUpdate({ ...block, quantity: Math.max(1, quantity) })
  }

  const handleToggleCost = (field: CostField) => {
    onUpdate({
      ...block,
      enabled_costs: {
        ...block.enabled_costs,
        [field]: !block.enabled_costs[field],
      },
    })
  }

  const handleOverrideCost = (field: CostField, value: number | null) => {
    onUpdate({
      ...block,
      cost_overrides: {
        ...block.cost_overrides,
        [field]: value,
      },
    })
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 hover:bg-transparent">
                <CardTitle className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Equipment {index + 1}
                  {block.make_name && block.model_name && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      - {block.make_name} {block.model_name}
                    </span>
                  )}
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-mono text-primary">
                {formatCurrency(totalWithQuantity)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDuplicate}
                title="Duplicate"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  className="text-destructive"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Equipment Selection */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Make</Label>
                <SearchableSelect
                  value={selectedMakeId}
                  onChange={handleMakeChange}
                  options={makes?.map((make) => ({
                    value: make.id,
                    label: make.name,
                  })) || []}
                  placeholder="Select make"
                  searchPlaceholder="Search makes..."
                  emptyMessage="No makes found"
                  allowCustom
                  customPlaceholder="Enter new make name..."
                  onCustomAdd={handleCreateMake}
                />
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <SearchableSelect
                  value={selectedModelId}
                  onChange={handleModelChange}
                  options={models?.map((model) => ({
                    value: model.id,
                    label: model.name,
                  })) || []}
                  placeholder="Select model"
                  searchPlaceholder="Search models..."
                  emptyMessage="No models found"
                  disabled={!selectedMakeId}
                  allowCustom
                  customPlaceholder="Enter new model name..."
                  onCustomAdd={handleCreateModel}
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={block.location || ''} onValueChange={handleLocationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={block.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="text-center font-mono"
                />
              </div>
            </div>

            {/* Dimensions */}
            {selectedModelId && (
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Dimensions</h4>
                  {upsertDimensionsMutation.isPending && (
                    <span className="text-xs text-muted-foreground">Saving...</span>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Length (ft-in)</Label>
                    <Input
                      type="text"
                      value={dimensionInputs.length}
                      onChange={(e) => handleDimensionInputChange('length', e.target.value)}
                      onBlur={() => handleDimensionBlur('length')}
                      placeholder="e.g., 30-4"
                      className="font-mono"
                    />
                    {localDimensions.length_inches > 0 && (
                      <p className="text-xs text-muted-foreground">{localDimensions.length_inches}" total</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Width (ft-in)</Label>
                    <Input
                      type="text"
                      value={dimensionInputs.width}
                      onChange={(e) => handleDimensionInputChange('width', e.target.value)}
                      onBlur={() => handleDimensionBlur('width')}
                      placeholder="e.g., 10-6"
                      className="font-mono"
                    />
                    {localDimensions.width_inches > 0 && (
                      <p className="text-xs text-muted-foreground">{localDimensions.width_inches}" total</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Height (ft-in)</Label>
                    <Input
                      type="text"
                      value={dimensionInputs.height}
                      onChange={(e) => handleDimensionInputChange('height', e.target.value)}
                      onBlur={() => handleDimensionBlur('height')}
                      placeholder="e.g., 10-10"
                      className="font-mono"
                    />
                    {localDimensions.height_inches > 0 && (
                      <p className="text-xs text-muted-foreground">{localDimensions.height_inches}" total</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Weight (lbs)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={dimensionInputs.weight}
                      onChange={(e) => handleWeightChange(e.target.value)}
                      placeholder="0"
                      className="font-mono"
                    />
                    {localDimensions.weight_lbs > 0 && (
                      <p className="text-xs text-muted-foreground">{formatWeight(localDimensions.weight_lbs)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Equipment Images */}
            {selectedModelId && (
              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium mb-3">Equipment Images</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Front View</Label>
                    <ImageUpload
                      value={frontImageUrl}
                      onChange={handleFrontImageChange}
                      folder={`equipment/${selectedModelId}`}
                      label="Upload Front Image"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Side View</Label>
                    <ImageUpload
                      value={sideImageUrl}
                      onChange={handleSideImageChange}
                      folder={`equipment/${selectedModelId}`}
                      label="Upload Side Image"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Costs */}
            <div className="space-y-3">
              <h4 className="font-medium">Cost Breakdown</h4>
              <div className="grid gap-2">
                {COST_FIELDS.map((field) => {
                  const baseCost = sanitizeCost(block.costs[field])
                  const override = block.cost_overrides[field]
                  const displayValue = sanitizeCost(override ?? baseCost)
                  const isEnabled = block.enabled_costs[field]

                  // Show all rows in editor - hiding $0 rows only happens in PDF

                  return (
                    <div
                      key={field}
                      className={`flex items-center gap-3 p-2 rounded-lg border ${
                        isEnabled ? 'bg-background' : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => handleToggleCost(field)}
                        className="scale-90"
                      />
                      <span className="flex-1 text-sm">{COST_LABELS[field]}</span>
                      <Input
                        type="text"
                        value={formatCurrency(displayValue).replace('$', '')}
                        onChange={(e) => {
                          const cents = parseCurrencyToCents(e.target.value)
                          handleOverrideCost(field, cents === baseCost ? null : cents)
                        }}
                        disabled={!isEnabled}
                        className="w-28 text-right font-mono text-sm h-8"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Miscellaneous Fees */}
            <div className="rounded-lg border p-4 bg-muted/20">
              <MiscFeesList
                fees={miscFees}
                onChange={handleFeesChange}
                subtotal={costsSubtotal}
                compact
              />
            </div>

            {/* Block Summary */}
            <div className="space-y-2 pt-2 border-t text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costs subtotal:</span>
                <span className="font-mono">{formatCurrency(costsSubtotal)}</span>
              </div>
              {miscFeesTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fees:</span>
                  <span className="font-mono">{formatCurrency(miscFeesTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Unit total:</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {block.quantity > 1 && (
                <div className="flex justify-between font-medium text-primary">
                  <span>× {block.quantity} units:</span>
                  <span className="font-mono">{formatCurrency(totalWithQuantity)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
