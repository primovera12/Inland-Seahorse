'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Package, DollarSign, Truck, AlertTriangle, Lightbulb } from 'lucide-react'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select'
import type {
  InlandLoadBlock,
  CargoItem,
  ServiceItem,
  AccessorialCharge,
  AccessorialBillingUnit,
  InlandEquipmentType,
} from '@/types/inland'
import { formatCurrency, parseCurrencyToCents, formatWholeDollars, parseWholeDollarsToCents } from '@/lib/utils'
import { CargoItemCard } from './cargo-item-card'
import { recommendTruckType, type TruckRecommendation } from '@/lib/truck-recommendation'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

const BILLING_UNIT_LABELS: Record<AccessorialBillingUnit, string> = {
  flat: 'Flat',
  hour: '/hr',
  day: '/day',
  way: '/way',
  week: '/wk',
  month: '/mo',
  stop: '/stop',
}

// Predefined service types for inland transportation
const PREDEFINED_SERVICES = [
  { value: 'line_haul', label: 'Line Haul' },
  { value: 'fuel_surcharge', label: 'Fuel Surcharge' },
  { value: 'driver_assist', label: 'Driver Assist' },
  { value: 'tarp', label: 'Tarp' },
  { value: 'oversize_permit', label: 'Oversize Permit' },
  { value: 'overweight_permit', label: 'Overweight Permit' },
  { value: 'escort', label: 'Escort Service' },
  { value: 'detention', label: 'Detention' },
  { value: 'layover', label: 'Layover' },
  { value: 'stop_off', label: 'Stop Off' },
  { value: 'loading', label: 'Loading' },
  { value: 'unloading', label: 'Unloading' },
  { value: 'rigging', label: 'Rigging' },
  { value: 'crane', label: 'Crane Service' },
  { value: 'forklift', label: 'Forklift Service' },
  { value: 'storage', label: 'Storage' },
  { value: 'expedited', label: 'Expedited Service' },
  { value: 'team_drivers', label: 'Team Drivers' },
  { value: 'weekend_delivery', label: 'Weekend Delivery' },
  { value: 'after_hours', label: 'After Hours Delivery' },
  { value: 'inside_delivery', label: 'Inside Delivery' },
  { value: 'liftgate', label: 'Liftgate' },
  { value: 'residential', label: 'Residential Delivery' },
  { value: 'custom', label: 'Custom Service' },
]

interface LoadBlockCardProps {
  loadBlock: InlandLoadBlock
  onUpdate: (loadBlock: InlandLoadBlock) => void
  onRemove: () => void
  canRemove: boolean
  truckTypes: Array<{ id: string; name: string }>
  accessorialTypes: Array<{
    id: string
    name: string
    default_rate: number
    billing_unit: string
  }>
  equipmentTypes?: InlandEquipmentType[]
  distanceMiles?: number
}

export function LoadBlockCard({
  loadBlock,
  onUpdate,
  onRemove,
  canRemove,
  truckTypes,
  accessorialTypes,
  equipmentTypes,
  distanceMiles,
}: LoadBlockCardProps) {
  const utils = trpc.useUtils()

  // Mutation to create new truck type
  const createTruckTypeMutation = trpc.inland.createEquipmentType.useMutation({
    onSuccess: (data) => {
      toast.success(`Truck type "${data.name}" added`)
      // Invalidate truck types cache to refetch
      utils.inland.getEquipmentTypes.invalidate()
      // Select the newly created truck type
      if (data) {
        onUpdate({
          ...loadBlock,
          truck_type_id: data.id,
          truck_type_name: data.name,
        })
      }
    },
    onError: (error) => {
      toast.error(`Failed to add truck type: ${error.message}`)
    },
  })

  // Handle adding custom truck type
  const handleAddCustomTruckType = (name: string) => {
    createTruckTypeMutation.mutate({
      name,
      // Default dimensions for a standard flatbed
      max_length_inches: 53 * 12, // 53 feet
      max_width_inches: 102, // 8.5 feet
      max_height_inches: 13.5 * 12, // 13.5 feet
      max_weight_lbs: 48000, // Standard flatbed weight capacity
      base_rate_cents: 0,
    })
  }

  // Calculate truck recommendation based on cargo
  const recommendation = useMemo((): TruckRecommendation | null => {
    if (loadBlock.cargo_items.length === 0) return null
    return recommendTruckType(loadBlock.cargo_items, equipmentTypes)
  }, [loadBlock.cargo_items, equipmentTypes])

  // Calculate subtotal (services only) and accessorials total (separately)
  const calculateTotals = (
    services: ServiceItem[],
    accessorials: AccessorialCharge[]
  ) => {
    const serviceTotal = services.reduce((sum, s) => sum + s.total, 0)
    const accessorialTotal = accessorials.reduce((sum, a) => sum + a.total, 0)
    return { subtotal: serviceTotal, accessorials_total: accessorialTotal }
  }

  const updateTruckType = (truckTypeId: string) => {
    const truck = truckTypes.find((t) => t.id === truckTypeId)
    onUpdate({
      ...loadBlock,
      truck_type_id: truckTypeId,
      truck_type_name: truck?.name || '',
    })
  }

  // Service Items
  const addServiceItem = () => {
    const newService: ServiceItem = {
      id: crypto.randomUUID(),
      name: 'Line Haul',
      rate: 0,
      quantity: 1,
      total: 0,
    }
    const newServices = [...loadBlock.service_items, newService]
    const { subtotal, accessorials_total } = calculateTotals(newServices, loadBlock.accessorial_charges)
    onUpdate({ ...loadBlock, service_items: newServices, subtotal, accessorials_total })
  }

  const updateServiceItem = (index: number, field: keyof ServiceItem, value: string | number) => {
    const newServices = [...loadBlock.service_items]
    const service = { ...newServices[index] }

    if (field === 'rate') {
      service.rate = typeof value === 'number' ? value : parseCurrencyToCents(value)
      service.total = service.rate * service.quantity
    } else if (field === 'quantity') {
      service.quantity = typeof value === 'number' ? value : parseInt(value) || 1
      service.total = service.rate * service.quantity
    } else if (field === 'name') {
      service.name = String(value)
    }

    newServices[index] = service
    const { subtotal, accessorials_total } = calculateTotals(newServices, loadBlock.accessorial_charges)
    onUpdate({ ...loadBlock, service_items: newServices, subtotal, accessorials_total })
  }

  const removeServiceItem = (index: number) => {
    const newServices = loadBlock.service_items.filter((_, i) => i !== index)
    const { subtotal, accessorials_total } = calculateTotals(newServices, loadBlock.accessorial_charges)
    onUpdate({ ...loadBlock, service_items: newServices, subtotal, accessorials_total })
  }

  // Accessorial Charges
  const addEmptyAccessorial = () => {
    const newCharge: AccessorialCharge = {
      id: crypto.randomUUID(),
      accessorial_type_id: '',
      name: 'Select accessorial',
      billing_unit: 'flat' as AccessorialBillingUnit,
      rate: 0,
      quantity: 1,
      total: 0,
    }

    const newAccessorials = [...loadBlock.accessorial_charges, newCharge]
    const { subtotal, accessorials_total } = calculateTotals(loadBlock.service_items, newAccessorials)
    onUpdate({ ...loadBlock, accessorial_charges: newAccessorials, subtotal, accessorials_total })
  }

  const updateAccessorialType = (index: number, typeId: string) => {
    const type = accessorialTypes.find((t) => t.id === typeId)
    if (!type) return

    const newAccessorials = [...loadBlock.accessorial_charges]
    const charge = { ...newAccessorials[index] }
    charge.accessorial_type_id = typeId
    charge.name = type.name
    charge.billing_unit = type.billing_unit as AccessorialBillingUnit
    charge.rate = type.default_rate
    charge.total = charge.rate * charge.quantity

    newAccessorials[index] = charge
    const { subtotal, accessorials_total } = calculateTotals(loadBlock.service_items, newAccessorials)
    onUpdate({ ...loadBlock, accessorial_charges: newAccessorials, subtotal, accessorials_total })
  }

  const updateAccessorialBillingUnit = (index: number, billingUnit: AccessorialBillingUnit) => {
    const newAccessorials = [...loadBlock.accessorial_charges]
    const charge = { ...newAccessorials[index] }
    charge.billing_unit = billingUnit

    newAccessorials[index] = charge
    const { subtotal, accessorials_total } = calculateTotals(loadBlock.service_items, newAccessorials)
    onUpdate({ ...loadBlock, accessorial_charges: newAccessorials, subtotal, accessorials_total })
  }

  const updateAccessorial = (
    index: number,
    field: keyof AccessorialCharge,
    value: string | number
  ) => {
    const newAccessorials = [...loadBlock.accessorial_charges]
    const charge = { ...newAccessorials[index] }

    if (field === 'rate') {
      charge.rate = typeof value === 'number' ? value : parseCurrencyToCents(value)
      charge.total = charge.rate * charge.quantity
    } else if (field === 'quantity') {
      charge.quantity = typeof value === 'number' ? value : parseInt(value) || 1
      charge.total = charge.rate * charge.quantity
    }

    newAccessorials[index] = charge
    const { subtotal, accessorials_total } = calculateTotals(loadBlock.service_items, newAccessorials)
    onUpdate({ ...loadBlock, accessorial_charges: newAccessorials, subtotal, accessorials_total })
  }

  const removeAccessorial = (index: number) => {
    const newAccessorials = loadBlock.accessorial_charges.filter((_, i) => i !== index)
    const { subtotal, accessorials_total } = calculateTotals(loadBlock.service_items, newAccessorials)
    onUpdate({ ...loadBlock, accessorial_charges: newAccessorials, subtotal, accessorials_total })
  }

  // Cargo Items
  const addCargoItem = () => {
    const newItem: CargoItem = {
      id: crypto.randomUUID(),
      description: 'Cargo Item',
      quantity: 1,
      length_inches: 0,
      width_inches: 0,
      height_inches: 0,
      weight_lbs: 0,
      is_oversize: false,
      is_overweight: false,
    }
    onUpdate({ ...loadBlock, cargo_items: [...loadBlock.cargo_items, newItem] })
  }

  const updateCargoItem = (index: number, updatedItem: CargoItem) => {
    const newItems = [...loadBlock.cargo_items]
    newItems[index] = updatedItem
    onUpdate({ ...loadBlock, cargo_items: newItems })
  }

  const removeCargoItem = (index: number) => {
    const newItems = loadBlock.cargo_items.filter((_, i) => i !== index)
    onUpdate({ ...loadBlock, cargo_items: newItems })
  }

  // Apply truck recommendation
  const applyRecommendation = () => {
    if (recommendation) {
      // Match by exact ID, exact name, or case-insensitive name match
      const truck = truckTypes.find((t) =>
        t.id === recommendation.recommendedId ||
        t.name === recommendation.recommendedName ||
        t.name.toLowerCase() === recommendation.recommendedName.toLowerCase() ||
        t.name.toLowerCase().includes(recommendation.recommendedId.toLowerCase())
      )
      if (truck) {
        onUpdate({
          ...loadBlock,
          truck_type_id: truck.id,
          truck_type_name: truck.name,
        })
      }
    }
  }

  // Calculate line haul based on distance
  const calculateLineHaul = () => {
    if (!distanceMiles) return
    // Base rate: $3.50/mile for this example
    const ratePerMile = 350 // cents
    const lineHaulTotal = Math.round(distanceMiles * ratePerMile)

    const lineHaulIndex = loadBlock.service_items.findIndex(
      (s) => s.name.toLowerCase().includes('line haul')
    )

    if (lineHaulIndex >= 0) {
      updateServiceItem(lineHaulIndex, 'rate', lineHaulTotal)
    }
  }

  // Available accessorials (not already added)
  const availableAccessorials = accessorialTypes.filter(
    (type) => !loadBlock.accessorial_charges.some((c) => c.accessorial_type_id === type.id)
  )

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Load</span>
            {loadBlock.truck_type_name && (
              <Badge variant="outline" className="text-xs">
                {loadBlock.truck_type_name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium">{formatCurrency(loadBlock.subtotal)}</span>
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
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cargo Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Cargo Items
            </Label>
            <Button variant="outline" size="sm" onClick={addCargoItem}>
              <Plus className="h-3 w-3 mr-1" />
              Add Cargo
            </Button>
          </div>

          {loadBlock.cargo_items.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/30">
              No cargo items. Add cargo to enable truck recommendations.
            </div>
          ) : (
            <div className="space-y-3">
              {loadBlock.cargo_items.map((item, index) => (
                <CargoItemCard
                  key={item.id}
                  item={item}
                  onUpdate={(updated) => updateCargoItem(index, updated)}
                  onRemove={() => removeCargoItem(index)}
                  canRemove={loadBlock.cargo_items.length > 0}
                />
              ))}
            </div>
          )}

          {/* Truck Recommendation */}
          {recommendation && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <Label className="text-sm font-medium">Truck Recommendation</Label>
                </div>
                {recommendation.recommendedId !== loadBlock.truck_type_id && (
                  <Button variant="outline" size="sm" onClick={applyRecommendation}>
                    Apply
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{recommendation.recommendedName}</span>
                {recommendation.recommendedId === loadBlock.truck_type_id && (
                  <Badge variant="secondary" className="text-xs">Selected</Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-3">{recommendation.reason}</p>

              {/* Permit Warnings */}
              {(recommendation.isOversizePermitRequired || recommendation.isOverweightPermitRequired) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {recommendation.isOversizePermitRequired && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Oversize Permit Required
                    </Badge>
                  )}
                  {recommendation.isOverweightPermitRequired && (
                    <Badge variant="outline" className="text-red-600 border-red-300 dark:text-red-400 dark:border-red-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Overweight Permit Required
                    </Badge>
                  )}
                </div>
              )}

              {/* Multi-truck suggestion */}
              {recommendation.multiTruckSuggestion && (
                <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-950/30 text-sm">
                  <span className="font-medium">{recommendation.multiTruckSuggestion.count} trucks needed:</span>{' '}
                  <span className="text-muted-foreground">{recommendation.multiTruckSuggestion.reason}</span>
                </div>
              )}

              {/* Requirements summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Max Length</p>
                  <p className="font-mono">{Math.round(recommendation.requirements.lengthRequired / 12)}&apos; {recommendation.requirements.lengthRequired % 12}&quot;</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Width</p>
                  <p className="font-mono">{Math.round(recommendation.requirements.widthRequired / 12)}&apos; {recommendation.requirements.widthRequired % 12}&quot;</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Height</p>
                  <p className="font-mono">{Math.round(recommendation.requirements.heightRequired / 12)}&apos; {recommendation.requirements.heightRequired % 12}&quot;</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Weight</p>
                  <p className="font-mono">{recommendation.requirements.weightRequired.toLocaleString()} lbs</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Truck Type Selection - After cargo so recommendation can inform choice */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Truck Type
          </Label>
          <SearchableSelect
            value={loadBlock.truck_type_id}
            onChange={updateTruckType}
            options={truckTypes.map((truck): SearchableSelectOption => ({
              value: truck.id,
              label: truck.name,
            }))}
            placeholder="Select truck type"
            searchPlaceholder="Search trucks..."
            className="w-full sm:w-[250px]"
            allowCustom
            customPlaceholder="Enter new truck type name..."
            onCustomAdd={handleAddCustomTruckType}
          />
        </div>

        {/* Service Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Services
            </Label>
            <div className="flex gap-2">
              {distanceMiles && (
                <Button variant="outline" size="sm" onClick={calculateLineHaul}>
                  Calc Line Haul
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={addServiceItem}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {loadBlock.service_items.map((service, index) => (
              <div key={service.id} className="flex flex-wrap items-center gap-2 p-2 rounded bg-muted/30 sm:bg-transparent sm:p-0">
                <SearchableSelect
                  value={PREDEFINED_SERVICES.find(s => s.label === service.name)?.value || 'custom'}
                  onChange={(value) => {
                    const selected = PREDEFINED_SERVICES.find(s => s.value === value)
                    if (selected) {
                      updateServiceItem(index, 'name', selected.label)
                    }
                  }}
                  options={PREDEFINED_SERVICES.map((s): SearchableSelectOption => ({
                    value: s.value,
                    label: s.label,
                  }))}
                  placeholder="Select service"
                  searchPlaceholder="Search services..."
                  className="w-full sm:w-[180px]"
                />
                {service.name === 'Custom Service' && (
                  <Input
                    className="flex-1 min-w-[120px]"
                    placeholder="Custom service name"
                    value={service.name === 'Custom Service' ? '' : service.name}
                    onChange={(e) => updateServiceItem(index, 'name', e.target.value || 'Custom Service')}
                  />
                )}
                <Input
                  className="w-16 sm:w-20"
                  type="number"
                  min={1}
                  value={service.quantity}
                  onChange={(e) => updateServiceItem(index, 'quantity', e.target.value)}
                  placeholder="Qty"
                />
                <div className="relative w-24 sm:w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    className="pl-5 text-right font-mono"
                    placeholder="0"
                    value={formatWholeDollars(service.rate)}
                    onChange={(e) => updateServiceItem(index, 'rate', parseWholeDollarsToCents(e.target.value))}
                  />
                </div>
                <span className="w-20 sm:w-24 text-right font-mono text-sm">
                  ${formatWholeDollars(service.total)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeServiceItem(index)}
                  className="shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Accessorials */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Accessorials</Label>
            <Button variant="outline" size="sm" onClick={addEmptyAccessorial}>
              <Plus className="h-3 w-3 mr-1" />
              Add Accessorial
            </Button>
          </div>

          {loadBlock.accessorial_charges.length > 0 && (
            <div className="space-y-2">
              {loadBlock.accessorial_charges.map((charge, index) => (
                <div
                  key={charge.id}
                  className="flex flex-wrap items-center gap-2 p-2 rounded bg-muted/50"
                >
                  <SearchableSelect
                    value={charge.accessorial_type_id}
                    onChange={(typeId) => updateAccessorialType(index, typeId)}
                    options={accessorialTypes.map((type): SearchableSelectOption => ({
                      value: type.id,
                      label: type.name,
                    }))}
                    placeholder="Select type"
                    searchPlaceholder="Search accessorials..."
                    className="w-full sm:w-[160px]"
                  />
                  <Input
                    className="w-14 sm:w-16"
                    type="number"
                    min={1}
                    value={charge.quantity}
                    onChange={(e) => updateAccessorial(index, 'quantity', e.target.value)}
                  />
                  <Select
                    value={charge.billing_unit}
                    onValueChange={(value) => updateAccessorialBillingUnit(index, value as AccessorialBillingUnit)}
                  >
                    <SelectTrigger className="w-[70px] sm:w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="hour">/hr</SelectItem>
                      <SelectItem value="day">/day</SelectItem>
                      <SelectItem value="way">/way</SelectItem>
                      <SelectItem value="week">/wk</SelectItem>
                      <SelectItem value="month">/mo</SelectItem>
                      <SelectItem value="stop">/stop</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative w-20 sm:w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      className="pl-5 text-right font-mono"
                      value={formatWholeDollars(charge.rate)}
                      onChange={(e) => updateAccessorial(index, 'rate', parseWholeDollarsToCents(e.target.value))}
                    />
                  </div>
                  <span className="w-16 sm:w-20 text-right font-mono text-sm">
                    ${formatWholeDollars(charge.total)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAccessorial(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-sm">Notes</Label>
          <Input
            placeholder="Load notes..."
            value={loadBlock.notes || ''}
            onChange={(e) => onUpdate({ ...loadBlock, notes: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
