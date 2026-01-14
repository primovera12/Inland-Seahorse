'use client'

import { useState, useEffect, useRef } from 'react'
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
import { formatDimension, formatWeight } from '@/lib/dimensions'
import { LOCATIONS, COST_FIELDS, type LocationName, type CostField } from '@/types/equipment'
import type { EquipmentBlock, MiscellaneousFee } from '@/types/quotes'
import { MiscFeesList, calculateMiscFeesTotal } from './misc-fees-list'
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

  // Use refs to avoid stale closure issues when rates/dimensions return from cache
  const blockRef = useRef(block)
  const onUpdateRef = useRef(onUpdate)

  // Keep refs in sync with latest props
  useEffect(() => {
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

  // Fetch rates when model and location change
  const { data: rates } = trpc.equipment.getRates.useQuery(
    { modelId: selectedModelId, location: block.location },
    { enabled: !!selectedModelId }
  )

  // Fetch dimensions when model changes
  const { data: dimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: selectedModelId },
    { enabled: !!selectedModelId }
  )

  // Update costs when rates change - uses refs to avoid stale closure
  useEffect(() => {
    if (rates) {
      const newCosts: Record<CostField, number> = {} as Record<CostField, number>
      COST_FIELDS.forEach((field) => {
        newCosts[field] = rates[field] || 0
      })
      onUpdateRef.current({ ...blockRef.current, costs: newCosts })
    }
  }, [rates])

  // Update dimensions when model changes - uses refs to avoid stale closure
  useEffect(() => {
    if (dimensions) {
      onUpdateRef.current({
        ...blockRef.current,
        length_inches: dimensions.length_inches,
        width_inches: dimensions.width_inches,
        height_inches: dimensions.height_inches,
        weight_lbs: dimensions.weight_lbs,
      })
    }
  }, [dimensions])

  // Calculate costs subtotal (without fees)
  const calculateCostsSubtotal = () => {
    return COST_FIELDS.reduce((total, field) => {
      if (!block.enabled_costs[field]) return total
      const cost = block.cost_overrides[field] ?? block.costs[field]
      return total + cost
    }, 0)
  }

  const costsSubtotal = calculateCostsSubtotal()
  const miscFees = block.misc_fees || []
  const miscFeesTotal = calculateMiscFeesTotal(miscFees, costsSubtotal)
  const subtotal = costsSubtotal + miscFeesTotal
  const totalWithQuantity = subtotal * block.quantity

  // Update parent when subtotal changes
  useEffect(() => {
    if (block.subtotal !== subtotal || block.total_with_quantity !== totalWithQuantity || block.misc_fees_total !== miscFeesTotal) {
      onUpdate({ ...block, subtotal, misc_fees_total: miscFeesTotal, total_with_quantity: totalWithQuantity })
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
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={block.location} onValueChange={handleLocationChange}>
                  <SelectTrigger>
                    <SelectValue />
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
            {selectedModelId && block.length_inches && (
              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium mb-3">Dimensions</h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Length</p>
                    <p className="font-mono">{formatDimension(block.length_inches || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Width</p>
                    <p className="font-mono">{formatDimension(block.width_inches || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Height</p>
                    <p className="font-mono">{formatDimension(block.height_inches || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-mono">{formatWeight(block.weight_lbs || 0)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Costs */}
            <div className="space-y-3">
              <h4 className="font-medium">Cost Breakdown</h4>
              <div className="grid gap-2">
                {COST_FIELDS.map((field) => {
                  const baseCost = block.costs[field]
                  const override = block.cost_overrides[field]
                  const displayValue = override ?? baseCost
                  const isEnabled = block.enabled_costs[field]

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
