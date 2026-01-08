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
import { Trash2, Plus, Package, DollarSign, Truck, AlertTriangle, FileText, Lightbulb } from 'lucide-react'
import type {
  InlandLoadBlock,
  CargoItem,
  ServiceItem,
  AccessorialCharge,
  AccessorialBillingUnit,
  InlandEquipmentType,
} from '@/types/inland'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils'
import { CargoItemCard } from './cargo-item-card'
import { recommendTruckType, type TruckRecommendation } from '@/lib/truck-recommendation'

const BILLING_UNIT_LABELS: Record<AccessorialBillingUnit, string> = {
  flat: 'Flat',
  hour: '/hr',
  day: '/day',
  way: '/way',
  week: '/wk',
  month: '/mo',
  stop: '/stop',
}

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
  // Calculate truck recommendation based on cargo
  const recommendation = useMemo((): TruckRecommendation | null => {
    if (loadBlock.cargo_items.length === 0) return null
    return recommendTruckType(loadBlock.cargo_items, equipmentTypes)
  }, [loadBlock.cargo_items, equipmentTypes])

  const calculateSubtotal = (
    services: ServiceItem[],
    accessorials: AccessorialCharge[]
  ) => {
    const serviceTotal = services.reduce((sum, s) => sum + s.total, 0)
    const accessorialTotal = accessorials.reduce((sum, a) => sum + a.total, 0)
    return serviceTotal + accessorialTotal
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
      name: 'Service',
      rate: 0,
      quantity: 1,
      total: 0,
    }
    const newServices = [...loadBlock.service_items, newService]
    const subtotal = calculateSubtotal(newServices, loadBlock.accessorial_charges)
    onUpdate({ ...loadBlock, service_items: newServices, subtotal })
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
    const subtotal = calculateSubtotal(newServices, loadBlock.accessorial_charges)
    onUpdate({ ...loadBlock, service_items: newServices, subtotal })
  }

  const removeServiceItem = (index: number) => {
    const newServices = loadBlock.service_items.filter((_, i) => i !== index)
    const subtotal = calculateSubtotal(newServices, loadBlock.accessorial_charges)
    onUpdate({ ...loadBlock, service_items: newServices, subtotal })
  }

  // Accessorial Charges
  const addAccessorial = (typeId: string) => {
    const type = accessorialTypes.find((t) => t.id === typeId)
    if (!type) return

    const newCharge: AccessorialCharge = {
      id: crypto.randomUUID(),
      accessorial_type_id: typeId,
      name: type.name,
      billing_unit: type.billing_unit as AccessorialBillingUnit,
      rate: type.default_rate,
      quantity: 1,
      total: type.default_rate,
    }

    const newAccessorials = [...loadBlock.accessorial_charges, newCharge]
    const subtotal = calculateSubtotal(loadBlock.service_items, newAccessorials)
    onUpdate({ ...loadBlock, accessorial_charges: newAccessorials, subtotal })
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
    const subtotal = calculateSubtotal(loadBlock.service_items, newAccessorials)
    onUpdate({ ...loadBlock, accessorial_charges: newAccessorials, subtotal })
  }

  const removeAccessorial = (index: number) => {
    const newAccessorials = loadBlock.accessorial_charges.filter((_, i) => i !== index)
    const subtotal = calculateSubtotal(loadBlock.service_items, newAccessorials)
    onUpdate({ ...loadBlock, accessorial_charges: newAccessorials, subtotal })
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
      const truck = truckTypes.find((t) => t.id === recommendation.recommendedId || t.name === recommendation.recommendedName)
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
            <div className="space-y-1">
              <Label>Truck Type</Label>
              <Select value={loadBlock.truck_type_id} onValueChange={updateTruckType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {truckTypes.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      {truck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
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
              <div key={service.id} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Service name"
                  value={service.name}
                  onChange={(e) => updateServiceItem(index, 'name', e.target.value)}
                />
                <Input
                  className="w-24"
                  type="number"
                  min={1}
                  value={service.quantity}
                  onChange={(e) => updateServiceItem(index, 'quantity', e.target.value)}
                />
                <Input
                  className="w-28 text-right font-mono"
                  placeholder="$0.00"
                  value={formatCurrency(service.rate).replace('$', '')}
                  onChange={(e) => updateServiceItem(index, 'rate', e.target.value)}
                />
                <span className="w-24 text-right font-mono text-sm">
                  {formatCurrency(service.total)}
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
            {availableAccessorials.length > 0 && (
              <Select onValueChange={addAccessorial}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Add accessorial" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccessorials.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {loadBlock.accessorial_charges.length > 0 && (
            <div className="space-y-2">
              {loadBlock.accessorial_charges.map((charge, index) => (
                <div
                  key={charge.id}
                  className="flex items-center gap-2 p-2 rounded bg-muted/50"
                >
                  <span className="flex-1 text-sm">{charge.name}</span>
                  <Input
                    className="w-20"
                    type="number"
                    min={1}
                    value={charge.quantity}
                    onChange={(e) => updateAccessorial(index, 'quantity', e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {BILLING_UNIT_LABELS[charge.billing_unit]}
                  </span>
                  <Input
                    className="w-24 text-right font-mono"
                    value={formatCurrency(charge.rate).replace('$', '')}
                    onChange={(e) => updateAccessorial(index, 'rate', e.target.value)}
                  />
                  <span className="w-24 text-right font-mono text-sm">
                    {formatCurrency(charge.total)}
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
