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
  Receipt,
  Lightbulb,
  AlertTriangle,
  Ruler,
  Scale,
} from 'lucide-react'
import { formatCurrency, parseCurrencyToCents } from '@/lib/utils'
import { formatDimension, formatWeight, parseDimensionFromUnit, type DimensionUnit } from '@/lib/dimensions'
import { trpc } from '@/lib/trpc/client'
import { recommendTruckType, type TruckRecommendation } from '@/lib/truck-recommendation'
import type { InlandEquipmentType } from '@/types/inland'

// Types
export interface CargoItem {
  id: string
  description: string
  quantity: number
  length_inches: number
  width_inches: number
  height_inches: number
  weight_lbs: number
  is_oversize: boolean
  is_overweight: boolean
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

export interface LoadBlockAddress {
  address: string
  city: string
  state: string
  zip: string
}

export interface LoadBlock {
  id: string
  truck_type_id: string
  truck_type_name: string
  // Per-load pickup/dropoff locations (optional - falls back to main addresses)
  pickup?: LoadBlockAddress
  dropoff?: LoadBlockAddress
  use_custom_locations?: boolean // Flag to enable per-load locations
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

export interface EquipmentDimensions {
  length_inches: number
  width_inches: number
  height_inches: number
  weight_lbs: number
  name?: string // Equipment name for display
}

interface InlandTransportFormProps {
  data: InlandTransportData
  onChange: (data: InlandTransportData) => void
  equipmentDimensions?: EquipmentDimensions[] // Equipment dimensions from selected equipment
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

export function InlandTransportForm({ data, onChange, equipmentDimensions }: InlandTransportFormProps) {
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

  // Calculate truck recommendation based on equipment dimensions
  const truckRecommendation = useMemo((): TruckRecommendation | null => {
    if (!equipmentDimensions || equipmentDimensions.length === 0) {
      return null
    }

    // Convert equipment dimensions to cargo items format for the recommendation function
    const cargoItems: CargoItem[] = equipmentDimensions.map((eq, index) => ({
      id: `eq-${index}`,
      description: eq.name || `Equipment ${index + 1}`,
      quantity: 1,
      length_inches: eq.length_inches || 0,
      width_inches: eq.width_inches || 0,
      height_inches: eq.height_inches || 0,
      weight_lbs: eq.weight_lbs || 0,
      is_oversize: false,
      is_overweight: false,
    }))

    // Only recommend if we have valid dimensions
    const hasValidDimensions = cargoItems.some(
      (item) => item.length_inches > 0 || item.width_inches > 0 || item.height_inches > 0 || item.weight_lbs > 0
    )

    if (!hasValidDimensions) {
      return null
    }

    return recommendTruckType(cargoItems, truckTypesData as InlandEquipmentType[] | undefined)
  }, [equipmentDimensions, truckTypesData])

  // Apply truck recommendation to load block
  const applyRecommendation = (recommendation: TruckRecommendation) => {
    if (data.load_blocks.length > 0) {
      const updatedBlocks = [...data.load_blocks]
      updatedBlocks[0] = {
        ...updatedBlocks[0],
        truck_type_id: recommendation.recommendedId,
        truck_type_name: recommendation.recommendedName,
      }
      onChange({ ...data, load_blocks: updatedBlocks })
    }
  }

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
      is_oversize: false,
      is_overweight: false,
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

          {/* Unit Selectors */}
          <div className="flex items-center justify-end gap-3">
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

          {/* Truck Type Recommendation Banner - Always show when there's equipment dimensions */}
          {truckRecommendation && data.load_blocks.length > 0 && (
            <div className={`rounded-lg border p-4 ${
              data.load_blocks[0].truck_type_id === truckRecommendation.recommendedId
                ? 'border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700'
                : 'border-primary/30 bg-primary/5'
            }`}>
              <div className="flex items-start gap-3">
                <Lightbulb className={`h-5 w-5 mt-0.5 shrink-0 ${
                  data.load_blocks[0].truck_type_id === truckRecommendation.recommendedId
                    ? 'text-green-600'
                    : 'text-primary'
                }`} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      Smart Truck Recommendation
                      {data.load_blocks[0].truck_type_id === truckRecommendation.recommendedId && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                          Currently Selected
                        </Badge>
                      )}
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on the equipment dimensions, we recommend using a{' '}
                    <span className="font-semibold text-foreground">{truckRecommendation.recommendedName}</span>.
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {truckRecommendation.requirements.lengthRequired > 0 && (
                      <span>
                        L: {Math.round(truckRecommendation.requirements.lengthRequired / 12)}&apos; {truckRecommendation.requirements.lengthRequired % 12}&quot;
                      </span>
                    )}
                    {truckRecommendation.requirements.widthRequired > 0 && (
                      <span>
                        W: {Math.round(truckRecommendation.requirements.widthRequired / 12)}&apos; {truckRecommendation.requirements.widthRequired % 12}&quot;
                      </span>
                    )}
                    {truckRecommendation.requirements.heightRequired > 0 && (
                      <span>
                        H: {Math.round(truckRecommendation.requirements.heightRequired / 12)}&apos; {truckRecommendation.requirements.heightRequired % 12}&quot;
                      </span>
                    )}
                    {truckRecommendation.requirements.weightRequired > 0 && (
                      <span>
                        {truckRecommendation.requirements.weightRequired.toLocaleString()} lbs
                      </span>
                    )}
                  </div>
                  {(truckRecommendation.isOversizePermitRequired || truckRecommendation.isOverweightPermitRequired) && (
                    <div className="flex gap-2 mt-1">
                      {truckRecommendation.isOversizePermitRequired && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Oversize Permit Required
                        </Badge>
                      )}
                      {truckRecommendation.isOverweightPermitRequired && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Overweight Permit Required
                        </Badge>
                      )}
                    </div>
                  )}
                  {truckRecommendation.multiTruckSuggestion && (
                    <p className="text-xs text-amber-600 font-medium">
                      {truckRecommendation.multiTruckSuggestion.reason}
                    </p>
                  )}
                  {data.load_blocks[0].truck_type_id !== truckRecommendation.recommendedId && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applyRecommendation(truckRecommendation)}
                      className="mt-2"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Use {truckRecommendation.recommendedName}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Load Blocks */}
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

                    {/* Per-Load Custom Locations */}
                    {data.load_blocks.length > 1 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm">Custom Pickup/Dropoff for this load</Label>
                          </div>
                          <Switch
                            checked={block.use_custom_locations || false}
                            onCheckedChange={(checked) => {
                              const updatedBlock = {
                                ...block,
                                use_custom_locations: checked,
                                pickup: checked ? (block.pickup || { address: '', city: '', state: '', zip: '' }) : undefined,
                                dropoff: checked ? (block.dropoff || { address: '', city: '', state: '', zip: '' }) : undefined,
                              }
                              updateLoadBlock(blockIndex, updatedBlock)
                            }}
                          />
                        </div>

                        {block.use_custom_locations && (
                          <div className="grid gap-4 md:grid-cols-2 p-4 rounded-lg bg-muted/30 border">
                            {/* Custom Pickup */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <MapPin className="h-4 w-4 text-green-600" />
                                <span>Pickup Location</span>
                              </div>
                              <AddressAutocomplete
                                id={`load-${blockIndex}-pickup`}
                                placeholder="Pickup address..."
                                value={block.pickup?.address || ''}
                                onChange={(value) => {
                                  const updatedBlock = {
                                    ...block,
                                    pickup: { ...block.pickup!, address: value },
                                  }
                                  updateLoadBlock(blockIndex, updatedBlock)
                                }}
                                onSelect={(components) => {
                                  const updatedBlock = {
                                    ...block,
                                    pickup: {
                                      address: components.address,
                                      city: components.city || '',
                                      state: components.state || '',
                                      zip: components.zip || '',
                                    },
                                  }
                                  updateLoadBlock(blockIndex, updatedBlock)
                                }}
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                  placeholder="City"
                                  value={block.pickup?.city || ''}
                                  onChange={(e) => {
                                    const updatedBlock = {
                                      ...block,
                                      pickup: { ...block.pickup!, city: e.target.value },
                                    }
                                    updateLoadBlock(blockIndex, updatedBlock)
                                  }}
                                  className="h-8 text-sm"
                                />
                                <Input
                                  placeholder="State"
                                  value={block.pickup?.state || ''}
                                  onChange={(e) => {
                                    const updatedBlock = {
                                      ...block,
                                      pickup: { ...block.pickup!, state: e.target.value },
                                    }
                                    updateLoadBlock(blockIndex, updatedBlock)
                                  }}
                                  className="h-8 text-sm"
                                />
                                <Input
                                  placeholder="ZIP"
                                  value={block.pickup?.zip || ''}
                                  onChange={(e) => {
                                    const updatedBlock = {
                                      ...block,
                                      pickup: { ...block.pickup!, zip: e.target.value },
                                    }
                                    updateLoadBlock(blockIndex, updatedBlock)
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>

                            {/* Custom Dropoff */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <MapPin className="h-4 w-4 text-red-600" />
                                <span>Dropoff Location</span>
                              </div>
                              <AddressAutocomplete
                                id={`load-${blockIndex}-dropoff`}
                                placeholder="Dropoff address..."
                                value={block.dropoff?.address || ''}
                                onChange={(value) => {
                                  const updatedBlock = {
                                    ...block,
                                    dropoff: { ...block.dropoff!, address: value },
                                  }
                                  updateLoadBlock(blockIndex, updatedBlock)
                                }}
                                onSelect={(components) => {
                                  const updatedBlock = {
                                    ...block,
                                    dropoff: {
                                      address: components.address,
                                      city: components.city || '',
                                      state: components.state || '',
                                      zip: components.zip || '',
                                    },
                                  }
                                  updateLoadBlock(blockIndex, updatedBlock)
                                }}
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                  placeholder="City"
                                  value={block.dropoff?.city || ''}
                                  onChange={(e) => {
                                    const updatedBlock = {
                                      ...block,
                                      dropoff: { ...block.dropoff!, city: e.target.value },
                                    }
                                    updateLoadBlock(blockIndex, updatedBlock)
                                  }}
                                  className="h-8 text-sm"
                                />
                                <Input
                                  placeholder="State"
                                  value={block.dropoff?.state || ''}
                                  onChange={(e) => {
                                    const updatedBlock = {
                                      ...block,
                                      dropoff: { ...block.dropoff!, state: e.target.value },
                                    }
                                    updateLoadBlock(blockIndex, updatedBlock)
                                  }}
                                  className="h-8 text-sm"
                                />
                                <Input
                                  placeholder="ZIP"
                                  value={block.dropoff?.zip || ''}
                                  onChange={(e) => {
                                    const updatedBlock = {
                                      ...block,
                                      dropoff: { ...block.dropoff!, zip: e.target.value },
                                    }
                                    updateLoadBlock(blockIndex, updatedBlock)
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Service Items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Services
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addServiceItem(blockIndex)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Service
                        </Button>
                      </div>
                      {block.service_items.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg border-dashed">
                          No services added. Click &quot;Add Service&quot; to add one.
                        </div>
                      ) : (
                        block.service_items.map((item, itemIndex) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="col-span-12 md:col-span-5">
                              <Label className="text-xs">Service</Label>
                              <SearchableSelect
                                options={serviceTypes}
                                value={serviceTypes.find((s) => s.label === item.name)?.value || ''}
                                onChange={(value) => {
                                  const serviceType = serviceTypes.find((s) => s.value === value)
                                  if (serviceType) {
                                    updateServiceItem(blockIndex, itemIndex, 'name', serviceType.label)
                                  }
                                }}
                                placeholder="Select service..."
                                searchPlaceholder="Search services..."
                                allowCustom
                                customPlaceholder="Custom service name"
                                onCustomAdd={(val) => {
                                  // Add to service types and update this item
                                  const newServiceType: SearchableSelectOption = {
                                    value: `custom-${crypto.randomUUID()}`,
                                    label: val,
                                    description: 'Custom service',
                                  }
                                  setServiceTypes((prev) => [...prev, newServiceType])
                                  updateServiceItem(blockIndex, itemIndex, 'name', val)
                                }}
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
                        ))
                      )}
                    </div>

                    <Separator />

                    {/* Accessorial Charges */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Accessorial Fees
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addAccessorialCharge(blockIndex)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Fee
                        </Button>
                      </div>
                      {block.accessorial_charges.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg border-dashed">
                          No fees added. Click &quot;Add Fee&quot; to add one.
                        </div>
                      ) : (
                        block.accessorial_charges.map((charge, chargeIndex) => (
                          <div
                            key={charge.id}
                            className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="col-span-12 md:col-span-4">
                              <Label className="text-xs">Fee Type</Label>
                              <SearchableSelect
                                options={accessorialTypes}
                                value={accessorialTypes.find((a) => a.label === charge.name)?.value || ''}
                                onChange={(value) => {
                                  const accessorialType = accessorialTypes.find((a) => a.value === value)
                                  if (accessorialType) {
                                    updateAccessorialCharge(blockIndex, chargeIndex, 'name', accessorialType.label)
                                  }
                                }}
                                placeholder="Select fee type..."
                                searchPlaceholder="Search fees..."
                                allowCustom
                                customPlaceholder="Custom fee name"
                                onCustomAdd={(val) => {
                                  // Add to accessorial types and update this item
                                  const newAccessorialType: SearchableSelectOption = {
                                    value: `custom-${crypto.randomUUID()}`,
                                    label: val,
                                    description: 'Custom fee',
                                  }
                                  setAccessorialTypes((prev) => [...prev, newAccessorialType])
                                  updateAccessorialCharge(blockIndex, chargeIndex, 'name', val)
                                }}
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
                        ))
                      )}
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
          {totalCost > 0 && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Inland Transportation Total</span>
                <span className="text-lg font-bold font-mono text-primary">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
