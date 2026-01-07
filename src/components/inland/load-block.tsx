'use client'

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
import { Trash2, Plus, Package, DollarSign } from 'lucide-react'
import type {
  InlandLoadBlock,
  CargoItem,
  ServiceItem,
  AccessorialCharge,
  AccessorialBillingUnit,
} from '@/types/inland'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils'

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
  distanceMiles?: number
}

export function LoadBlockCard({
  loadBlock,
  onUpdate,
  onRemove,
  canRemove,
  truckTypes,
  accessorialTypes,
  distanceMiles,
}: LoadBlockCardProps) {
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
