'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Truck,
  MapPin,
  Plus,
  Trash2,
  Package,
  Receipt,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertTriangle,
  Ruler,
  Scale,
} from 'lucide-react'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils'
import { formatDimension, formatWeight, parseDimensionFromUnit, type DimensionUnit } from '@/lib/dimensions'
import { trpc } from '@/lib/trpc/client'

// Types
export interface CargoItem {
  id: string
  description: string
  quantity: number
  length_inches: number
  width_inches: number
  height_inches: number
  weight_lbs: number
}

export interface ServiceItem {
  id: string
  name: string
  description?: string
  rate: number // cents
  quantity: number
  total: number // cents
}

export interface AccessorialCharge {
  id: string
  name: string
  billing_unit: string
  rate: number // cents
  quantity: number
  total: number // cents
}

export interface LoadBlock {
  id: string
  truck_type_id: string
  truck_type_name: string
  cargo_items: CargoItem[]
  service_items: ServiceItem[]
  accessorial_charges: AccessorialCharge[]
  subtotal: number
}

export interface InlandTransportData {
  enabled: boolean
  pickup_address: string
  pickup_city: string
  pickup_state: string
  pickup_zip: string
  dropoff_address: string
  dropoff_city: string
  dropoff_state: string
  dropoff_zip: string
  transport_cost: number // cents - kept for backwards compatibility
  notes: string
  // New enhanced fields
  load_blocks: LoadBlock[]
  total: number // cents
}

interface InlandTransportFormProps {
  data: InlandTransportData
  onChange: (data: InlandTransportData) => void
}

// Default service types
const DEFAULT_SERVICE_TYPES: SearchableSelectOption[] = [
  { value: 'line-haul', label: 'Line Haul', description: 'Primary transportation charge' },
  { value: 'drayage', label: 'Drayage', description: 'Short-distance hauling (port/rail to warehouse)' },
  { value: 'inland-transportation', label: 'Inland Transportation', description: 'Overland freight movement' },
  { value: 'loading', label: 'Loading', description: 'Loading cargo onto transport' },
  { value: 'unloading', label: 'Unloading', description: 'Unloading cargo from transport' },
  { value: 'fuel-surcharge', label: 'Fuel Surcharge', description: 'Fuel cost adjustment' },
  { value: 'flatbed-service', label: 'Flatbed Service', description: 'Flatbed trailer transportation' },
  { value: 'lowboy-service', label: 'Lowboy Service', description: 'Lowboy trailer for heavy equipment' },
  { value: 'step-deck-service', label: 'Step Deck Service', description: 'Step deck trailer transportation' },
  { value: 'oversized-load', label: 'Oversized Load', description: 'Permit and escort for oversized cargo' },
  { value: 'pilot-car', label: 'Pilot Car / Escort', description: 'Safety escort vehicle service' },
  { value: 'tarp-service', label: 'Tarp Service', description: 'Tarping and covering cargo' },
]

// Default accessorial types
const DEFAULT_ACCESSORIAL_TYPES: SearchableSelectOption[] = [
  { value: 'detention', label: 'Detention', description: 'Waiting time at pickup/delivery' },
  { value: 'layover', label: 'Layover', description: 'Overnight stay required' },
  { value: 'tonu', label: 'TONU', description: 'Truck Ordered Not Used (cancellation fee)' },
  { value: 'tolls', label: 'Tolls', description: 'Highway toll charges' },
  { value: 'permits', label: 'Permits', description: 'Oversize/overweight permits' },
  { value: 'escort-service', label: 'Escort Service', description: 'Pilot car for oversized loads' },
  { value: 'storage', label: 'Storage', description: 'Temporary cargo storage' },
  { value: 'tarping', label: 'Tarping', description: 'Load covering service' },
  { value: 'lumper-fee', label: 'Lumper Fee', description: 'Loading/unloading assistance' },
]

// Billing unit options
const BILLING_UNITS = [
  { value: 'flat', label: 'Flat Fee' },
  { value: 'hour', label: '/Hour' },
  { value: 'day', label: '/Day' },
  { value: 'way', label: '/Way' },
  { value: 'stop', label: '/Stop' },
]

// Dimension unit options
const DIMENSION_UNITS: { value: DimensionUnit; label: string }[] = [
  { value: 'feet', label: 'ft.in' },
  { value: 'inches', label: 'in' },
  { value: 'cm', label: 'cm' },
  { value: 'meters', label: 'm' },
]

// Weight unit options
const WEIGHT_UNITS = [
  { value: 'lbs', label: 'lbs' },
  { value: 'kg', label: 'kg' },
]

export const initialInlandTransportData: InlandTransportData = {
  enabled: false,
  pickup_address: '',
  pickup_city: '',
  pickup_state: '',
  pickup_zip: '',
  dropoff_address: '',
  dropoff_city: '',
  dropoff_state: '',
  dropoff_zip: '',
  transport_cost: 0,
  notes: '',
  load_blocks: [],
  total: 0,
}

export function InlandTransportForm({ data, onChange }: InlandTransportFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [serviceTypes, setServiceTypes] = useState<SearchableSelectOption[]>(DEFAULT_SERVICE_TYPES)
  const [accessorialTypes, setAccessorialTypes] = useState<SearchableSelectOption[]>(DEFAULT_ACCESSORIAL_TYPES)
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('feet')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')

  // Fetch truck types from API
  const { data: truckTypesData } = trpc.inland.getEquipmentTypes.useQuery(undefined, {
    enabled: data.enabled,
  })

  const truckTypes = useMemo(() => {
    if (!truckTypesData) {
      return [
        { id: 'flatbed', name: 'Flatbed' },
        { id: 'step-deck', name: 'Step Deck' },
        { id: 'lowboy', name: 'Lowboy' },
        { id: 'rgn', name: 'RGN' },
        { id: 'dry-van', name: 'Dry Van' },
      ]
    }
    return truckTypesData.map((t) => ({ id: t.id, name: t.name }))
  }, [truckTypesData])

  // Initialize with default load block if empty
  useEffect(() => {
    if (data.enabled && data.load_blocks.length === 0) {
      const defaultLoadBlock: LoadBlock = {
        id: crypto.randomUUID(),
        truck_type_id: truckTypes[0]?.id || 'flatbed',
        truck_type_name: truckTypes[0]?.name || 'Flatbed',
        cargo_items: [],
        service_items: [
          {
            id: crypto.randomUUID(),
            name: 'Line Haul',
            rate: 0,
            quantity: 1,
            total: 0,
          },
        ],
        accessorial_charges: [],
        subtotal: 0,
      }
      onChange({ ...data, load_blocks: [defaultLoadBlock] })
    }
  }, [data.enabled, data.load_blocks.length, truckTypes])

  const updateField = <K extends keyof InlandTransportData>(
    field: K,
    value: InlandTransportData[K]
  ) => {
    onChange({ ...data, [field]: value })
  }

  // Load block management
  const addLoadBlock = () => {
    const newBlock: LoadBlock = {
      id: crypto.randomUUID(),
      truck_type_id: truckTypes[0]?.id || 'flatbed',
      truck_type_name: truckTypes[0]?.name || 'Flatbed',
      cargo_items: [],
      service_items: [
        {
          id: crypto.randomUUID(),
          name: 'Line Haul',
          rate: 0,
          quantity: 1,
          total: 0,
        },
      ],
      accessorial_charges: [],
      subtotal: 0,
    }
    const newBlocks = [...data.load_blocks, newBlock]
    recalculateTotal(newBlocks)
  }

  const updateLoadBlock = (index: number, block: LoadBlock) => {
    const newBlocks = [...data.load_blocks]
    // Recalculate block subtotal
    const servicesTotal = block.service_items.reduce((sum, s) => sum + s.total, 0)
    const accessorialsTotal = block.accessorial_charges.reduce((sum, a) => sum + a.total, 0)
    block.subtotal = servicesTotal + accessorialsTotal
    newBlocks[index] = block
    recalculateTotal(newBlocks)
  }

  const removeLoadBlock = (index: number) => {
    const newBlocks = data.load_blocks.filter((_, i) => i !== index)
    recalculateTotal(newBlocks)
  }

  const recalculateTotal = (blocks: LoadBlock[]) => {
    const total = blocks.reduce((sum, block) => sum + block.subtotal, 0)
    onChange({ ...data, load_blocks: blocks, total, transport_cost: total })
  }

  // Cargo item management
  const addCargoItem = (blockIndex: number) => {
    const newItem: CargoItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      length_inches: 0,
      width_inches: 0,
      height_inches: 0,
      weight_lbs: 0,
    }
    const block = { ...data.load_blocks[blockIndex] }
    block.cargo_items = [...block.cargo_items, newItem]
    updateLoadBlock(blockIndex, block)
  }

  const updateCargoItem = (blockIndex: number, itemIndex: number, field: keyof CargoItem, value: any) => {
    const block = { ...data.load_blocks[blockIndex] }
    const item = { ...block.cargo_items[itemIndex], [field]: value }
    block.cargo_items = [...block.cargo_items]
    block.cargo_items[itemIndex] = item
    updateLoadBlock(blockIndex, block)
  }

  const removeCargoItem = (blockIndex: number, itemIndex: number) => {
    const block = { ...data.load_blocks[blockIndex] }
    block.cargo_items = block.cargo_items.filter((_, i) => i !== itemIndex)
    updateLoadBlock(blockIndex, block)
  }

  // Service item management
  const addServiceItem = (blockIndex: number) => {
    const newItem: ServiceItem = {
      id: crypto.randomUUID(),
      name: '',
      rate: 0,
      quantity: 1,
      total: 0,
    }
    const block = { ...data.load_blocks[blockIndex] }
    block.service_items = [...block.service_items, newItem]
    updateLoadBlock(blockIndex, block)
  }

  const updateServiceItem = (
    blockIndex: number,
    itemIndex: number,
    field: keyof ServiceItem,
    value: any
  ) => {
    const block = { ...data.load_blocks[blockIndex] }
    const item = { ...block.service_items[itemIndex], [field]: value }
    // Recalculate total
    if (field === 'rate' || field === 'quantity') {
      item.total = item.rate * item.quantity
    }
    block.service_items = [...block.service_items]
    block.service_items[itemIndex] = item
    updateLoadBlock(blockIndex, block)
  }

  const removeServiceItem = (blockIndex: number, itemIndex: number) => {
    const block = { ...data.load_blocks[blockIndex] }
    block.service_items = block.service_items.filter((_, i) => i !== itemIndex)
    updateLoadBlock(blockIndex, block)
  }

  // Accessorial charge management
  const addAccessorialCharge = (blockIndex: number) => {
    const newCharge: AccessorialCharge = {
      id: crypto.randomUUID(),
      name: '',
      billing_unit: 'flat',
      rate: 0,
      quantity: 1,
      total: 0,
    }
    const block = { ...data.load_blocks[blockIndex] }
    block.accessorial_charges = [...block.accessorial_charges, newCharge]
    updateLoadBlock(blockIndex, block)
  }

  const updateAccessorialCharge = (
    blockIndex: number,
    chargeIndex: number,
    field: keyof AccessorialCharge,
    value: any
  ) => {
    const block = { ...data.load_blocks[blockIndex] }
    const charge = { ...block.accessorial_charges[chargeIndex], [field]: value }
    // Recalculate total
    if (field === 'rate' || field === 'quantity') {
      charge.total = charge.rate * charge.quantity
    }
    block.accessorial_charges = [...block.accessorial_charges]
    block.accessorial_charges[chargeIndex] = charge
    updateLoadBlock(blockIndex, block)
  }

  const removeAccessorialCharge = (blockIndex: number, chargeIndex: number) => {
    const block = { ...data.load_blocks[blockIndex] }
    block.accessorial_charges = block.accessorial_charges.filter((_, i) => i !== chargeIndex)
    updateLoadBlock(blockIndex, block)
  }

  // Handle custom service type
  const handleCustomServiceAdd = (customValue: string, blockIndex: number) => {
    const newServiceType: SearchableSelectOption = {
      value: `custom-${crypto.randomUUID()}`,
      label: customValue,
      description: 'Custom service',
    }
    setServiceTypes((prev) => [...prev, newServiceType])
    // Add the service item to the block
    const block = { ...data.load_blocks[blockIndex] }
    const newItem: ServiceItem = {
      id: crypto.randomUUID(),
      name: customValue,
      rate: 0,
      quantity: 1,
      total: 0,
    }
    block.service_items = [...block.service_items, newItem]
    updateLoadBlock(blockIndex, block)
  }

  // Handle custom accessorial type
  const handleCustomAccessorialAdd = (customValue: string, blockIndex: number) => {
    const newAccessorialType: SearchableSelectOption = {
      value: `custom-${crypto.randomUUID()}`,
      label: customValue,
      description: 'Custom fee',
    }
    setAccessorialTypes((prev) => [...prev, newAccessorialType])
    // Add the accessorial charge to the block
    const block = { ...data.load_blocks[blockIndex] }
    const newCharge: AccessorialCharge = {
      id: crypto.randomUUID(),
      name: customValue,
      billing_unit: 'flat',
      rate: 0,
      quantity: 1,
      total: 0,
    }
    block.accessorial_charges = [...block.accessorial_charges, newCharge]
    updateLoadBlock(blockIndex, block)
  }

  // Calculate total
  const totalCost = useMemo(() => {
    return data.load_blocks.reduce((sum, block) => sum + block.subtotal, 0)
  }, [data.load_blocks])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Inland Transportation</CardTitle>
              <CardDescription>
                Add transportation costs from port to final destination
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={(enabled) => updateField('enabled', enabled)}
          />
        </div>
      </CardHeader>
      {data.enabled && (
        <CardContent className="space-y-6">
          {/* Pickup Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-green-600" />
              <span>Pickup Location</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="pickup_address">Address</Label>
                <AddressAutocomplete
                  id="pickup_address"
                  placeholder="Start typing pickup address..."
                  value={data.pickup_address}
                  onChange={(value) => updateField('pickup_address', value)}
                  onSelect={(components) => {
                    onChange({
                      ...data,
                      pickup_address: components.address,
                      pickup_city: components.city || data.pickup_city,
                      pickup_state: components.state || data.pickup_state,
                      pickup_zip: components.zip || data.pickup_zip,
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_city">City</Label>
                <Input
                  id="pickup_city"
                  placeholder="City"
                  value={data.pickup_city}
                  onChange={(e) => updateField('pickup_city', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup_state">State</Label>
                  <Input
                    id="pickup_state"
                    placeholder="State"
                    value={data.pickup_state}
                    onChange={(e) => updateField('pickup_state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_zip">ZIP</Label>
                  <Input
                    id="pickup_zip"
                    placeholder="ZIP"
                    value={data.pickup_zip}
                    onChange={(e) => updateField('pickup_zip', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dropoff Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-red-600" />
              <span>Dropoff Location</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="dropoff_address">Address</Label>
                <AddressAutocomplete
                  id="dropoff_address"
                  placeholder="Start typing dropoff address..."
                  value={data.dropoff_address}
                  onChange={(value) => updateField('dropoff_address', value)}
                  onSelect={(components) => {
                    onChange({
                      ...data,
                      dropoff_address: components.address,
                      dropoff_city: components.city || data.dropoff_city,
                      dropoff_state: components.state || data.dropoff_state,
                      dropoff_zip: components.zip || data.dropoff_zip,
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff_city">City</Label>
                <Input
                  id="dropoff_city"
                  placeholder="City"
                  value={data.dropoff_city}
                  onChange={(e) => updateField('dropoff_city', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dropoff_state">State</Label>
                  <Input
                    id="dropoff_state"
                    placeholder="State"
                    value={data.dropoff_state}
                    onChange={(e) => updateField('dropoff_state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoff_zip">ZIP</Label>
                  <Input
                    id="dropoff_zip"
                    placeholder="ZIP"
                    value={data.dropoff_zip}
                    onChange={(e) => updateField('dropoff_zip', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Advanced Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}
                {showAdvanced ? 'Simple Mode' : 'Advanced Mode'}
              </Button>
              {!showAdvanced && (
                <span className="text-xs text-muted-foreground">
                  (Cargo, Services, Accessorial Fees)
                </span>
              )}
            </div>
            {/* Unit Selectors */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <Select value={dimensionUnit} onValueChange={(v) => setDimensionUnit(v as DimensionUnit)}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSION_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <Select value={weightUnit} onValueChange={(v) => setWeightUnit(v as 'lbs' | 'kg')}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHT_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {showAdvanced ? (
            /* Advanced Mode - Load Blocks */
            <div className="space-y-4">
              {data.load_blocks.map((block, blockIndex) => (
                <Card key={block.id} className="border-l-4 border-l-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">Load {blockIndex + 1}</CardTitle>
                          <CardDescription>
                            {block.truck_type_name}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatCurrency(block.subtotal)}
                        </span>
                        {data.load_blocks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLoadBlock(blockIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Truck Type Selection */}
                    <div className="space-y-2">
                      <Label>Truck Type</Label>
                      <SearchableSelect
                        options={truckTypes.map((t) => ({
                          value: t.id,
                          label: t.name,
                        }))}
                        value={block.truck_type_id}
                        onChange={(value) => {
                          const truckType = truckTypes.find((t) => t.id === value)
                          const updatedBlock = {
                            ...block,
                            truck_type_id: value,
                            truck_type_name: truckType?.name || value,
                          }
                          updateLoadBlock(blockIndex, updatedBlock)
                        }}
                        placeholder="Select truck type..."
                        searchPlaceholder="Search trucks..."
                      />
                    </div>

                    {/* Cargo Items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Cargo Items
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addCargoItem(blockIndex)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Cargo
                        </Button>
                      </div>
                      {block.cargo_items.map((item, itemIndex) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="col-span-12 md:col-span-3">
                            <Label className="text-xs">Description</Label>
                            <Input
                              placeholder="Item description"
                              value={item.description}
                              onChange={(e) =>
                                updateCargoItem(blockIndex, itemIndex, 'description', e.target.value)
                              }
                              className="h-8"
                            />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">L ({dimensionUnit === 'feet' ? 'ft.in' : dimensionUnit})</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.length_inches ? (dimensionUnit === 'feet' ? Math.floor(item.length_inches / 12) + '.' + (item.length_inches % 12) : item.length_inches) : ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                const inches = parseDimensionFromUnit(val, dimensionUnit)
                                updateCargoItem(blockIndex, itemIndex, 'length_inches', inches)
                              }}
                              className="h-8 font-mono"
                            />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">W</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.width_inches ? (dimensionUnit === 'feet' ? Math.floor(item.width_inches / 12) + '.' + (item.width_inches % 12) : item.width_inches) : ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                const inches = parseDimensionFromUnit(val, dimensionUnit)
                                updateCargoItem(blockIndex, itemIndex, 'width_inches', inches)
                              }}
                              className="h-8 font-mono"
                            />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">H</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.height_inches ? (dimensionUnit === 'feet' ? Math.floor(item.height_inches / 12) + '.' + (item.height_inches % 12) : item.height_inches) : ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                const inches = parseDimensionFromUnit(val, dimensionUnit)
                                updateCargoItem(blockIndex, itemIndex, 'height_inches', inches)
                              }}
                              className="h-8 font-mono"
                            />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">Weight ({weightUnit})</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.weight_lbs ? (weightUnit === 'kg' ? Math.round(item.weight_lbs / 2.20462) : item.weight_lbs) : ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                const lbs = weightUnit === 'kg' ? Math.round(val * 2.20462) : val
                                updateCargoItem(blockIndex, itemIndex, 'weight_lbs', lbs)
                              }}
                              className="h-8 font-mono"
                            />
                          </div>
                          <div className="col-span-12 md:col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeCargoItem(blockIndex, itemIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Service Items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Services
                        </Label>
                        <div className="flex items-center gap-2">
                          <SearchableSelect
                            options={serviceTypes}
                            value=""
                            onChange={(value) => {
                              const serviceType = serviceTypes.find((s) => s.value === value)
                              if (serviceType) {
                                const updatedBlock = { ...block }
                                updatedBlock.service_items = [
                                  ...updatedBlock.service_items,
                                  {
                                    id: crypto.randomUUID(),
                                    name: serviceType.label,
                                    description: serviceType.description,
                                    rate: 0,
                                    quantity: 1,
                                    total: 0,
                                  },
                                ]
                                updateLoadBlock(blockIndex, updatedBlock)
                              }
                            }}
                            placeholder="Add service..."
                            searchPlaceholder="Search services..."
                            allowCustom
                            customPlaceholder="Custom service name"
                            onCustomAdd={(val) => handleCustomServiceAdd(val, blockIndex)}
                            className="w-48"
                          />
                        </div>
                      </div>
                      {block.service_items.map((item, itemIndex) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="col-span-12 md:col-span-5">
                            <Label className="text-xs">Service</Label>
                            <Input
                              value={item.name}
                              onChange={(e) =>
                                updateServiceItem(blockIndex, itemIndex, 'name', e.target.value)
                              }
                              className="h-8"
                            />
                          </div>
                          <div className="col-span-4 md:col-span-3">
                            <Label className="text-xs">Rate</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                $
                              </span>
                              <Input
                                type="text"
                                placeholder="0.00"
                                value={item.rate ? formatCurrency(item.rate).replace('$', '') : ''}
                                onChange={(e) => {
                                  const cents = parseCurrencyToCents(e.target.value)
                                  updateServiceItem(blockIndex, itemIndex, 'rate', cents)
                                }}
                                className="h-8 pl-5 font-mono"
                              />
                            </div>
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateServiceItem(
                                  blockIndex,
                                  itemIndex,
                                  'quantity',
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="h-8 font-mono"
                            />
                          </div>
                          <div className="col-span-4 md:col-span-2 flex items-end justify-between gap-2">
                            <div className="flex-1">
                              <Label className="text-xs">Total</Label>
                              <div className="h-8 flex items-center font-mono text-sm">
                                {formatCurrency(item.total)}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeServiceItem(blockIndex, itemIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Accessorial Charges */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Accessorial Fees
                        </Label>
                        <SearchableSelect
                          options={accessorialTypes}
                          value=""
                          onChange={(value) => {
                            const accessorialType = accessorialTypes.find((a) => a.value === value)
                            if (accessorialType) {
                              const updatedBlock = { ...block }
                              updatedBlock.accessorial_charges = [
                                ...updatedBlock.accessorial_charges,
                                {
                                  id: crypto.randomUUID(),
                                  name: accessorialType.label,
                                  billing_unit: 'flat',
                                  rate: 0,
                                  quantity: 1,
                                  total: 0,
                                },
                              ]
                              updateLoadBlock(blockIndex, updatedBlock)
                            }
                          }}
                          placeholder="Add fee..."
                          searchPlaceholder="Search fees..."
                          allowCustom
                          customPlaceholder="Custom fee name"
                          onCustomAdd={(val) => handleCustomAccessorialAdd(val, blockIndex)}
                          className="w-48"
                        />
                      </div>
                      {block.accessorial_charges.map((charge, chargeIndex) => (
                        <div
                          key={charge.id}
                          className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="col-span-12 md:col-span-4">
                            <Label className="text-xs">Fee Name</Label>
                            <Input
                              value={charge.name}
                              onChange={(e) =>
                                updateAccessorialCharge(
                                  blockIndex,
                                  chargeIndex,
                                  'name',
                                  e.target.value
                                )
                              }
                              className="h-8"
                            />
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <Label className="text-xs">Unit</Label>
                            <Select
                              value={charge.billing_unit}
                              onValueChange={(v) =>
                                updateAccessorialCharge(blockIndex, chargeIndex, 'billing_unit', v)
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BILLING_UNITS.map((unit) => (
                                  <SelectItem key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <Label className="text-xs">Rate</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                $
                              </span>
                              <Input
                                type="text"
                                placeholder="0.00"
                                value={charge.rate ? formatCurrency(charge.rate).replace('$', '') : ''}
                                onChange={(e) => {
                                  const cents = parseCurrencyToCents(e.target.value)
                                  updateAccessorialCharge(blockIndex, chargeIndex, 'rate', cents)
                                }}
                                className="h-8 pl-5 font-mono"
                              />
                            </div>
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min={1}
                              value={charge.quantity}
                              onChange={(e) =>
                                updateAccessorialCharge(
                                  blockIndex,
                                  chargeIndex,
                                  'quantity',
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="h-8 font-mono"
                            />
                          </div>
                          <div className="col-span-12 md:col-span-2 flex items-end justify-between gap-2">
                            <div className="flex-1">
                              <Label className="text-xs">Total</Label>
                              <div className="h-8 flex items-center font-mono text-sm">
                                {formatCurrency(charge.total)}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeAccessorialCharge(blockIndex, chargeIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addLoadBlock}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Load Block
              </Button>
            </div>
          ) : (
            /* Simple Mode - Just Transport Cost */
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transport_cost">Transport Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="transport_cost"
                      type="text"
                      placeholder="0.00"
                      value={data.transport_cost ? formatCurrency(data.transport_cost).replace('$', '') : ''}
                      onChange={(e) => {
                        const cents = parseCurrencyToCents(e.target.value)
                        updateField('transport_cost', cents)
                        updateField('total', cents)
                      }}
                      className="pl-7 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="transport_notes">Transportation Notes</Label>
            <Textarea
              id="transport_notes"
              placeholder="Special instructions, delivery requirements, etc."
              value={data.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          {(totalCost > 0 || data.transport_cost > 0) && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Inland Transportation Total</span>
                <span className="text-lg font-bold font-mono text-primary">
                  {formatCurrency(showAdvanced ? totalCost : data.transport_cost)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
