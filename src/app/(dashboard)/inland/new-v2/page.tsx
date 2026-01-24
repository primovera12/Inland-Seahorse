'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { CustomerForm, type CustomerAddress } from '@/components/quotes/customer-form'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select'
import { trpc } from '@/lib/trpc/client'
import { generateInlandQuoteNumber, formatCurrency, formatDate, formatWholeDollars, parseWholeDollarsToCents } from '@/lib/utils'
import { toast } from 'sonner'
import {
  MapPin,
  Package,
  Truck,
  DollarSign,
  User,
  Save,
  AlertTriangle,
  Upload,
  Plus,
  Trash2,
  FileText,
  FileWarning,
} from 'lucide-react'

// Load Planner Components
import { UniversalDropzone } from '@/components/load-planner/UniversalDropzone'
import { ExtractedItemsList } from '@/components/load-planner/ExtractedItemsList'
import { TrailerDiagram } from '@/components/load-planner/TrailerDiagram'
import { TruckSelector } from '@/components/load-planner/TruckSelector'
import { RouteIntelligence } from '@/components/load-planner/RouteIntelligence'
import {
  planLoads,
  type LoadItem,
  type LoadPlan,
  type TruckType,
  type CargoSpecs,
} from '@/lib/load-planner'
import type { RouteResult } from '@/lib/load-planner/route-calculator'
import type { DetailedRoutePermitSummary } from '@/lib/load-planner/types'
import { SimpleRouteMap } from '@/components/inland-quote/SimpleRouteMap'
import { QuotePDFPreview, type UnifiedPDFData } from '@/lib/pdf'
import { useRouter } from 'next/navigation'
import {
  DEFAULT_ACCESSORIAL_TYPES,
  ACCESSORIAL_BILLING_UNITS,
  type AccessorialCharge,
  type AccessorialBillingUnit
} from '@/types/inland'

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

interface ServiceItem {
  id: string
  name: string
  rate: number // in cents
  quantity: number
  total: number // in cents
  truckIndex?: number // optional - for per-truck pricing
}

// Editable permit costs - allows user to override calculated values
interface EditablePermitCost {
  id: string
  stateCode: string
  stateName: string
  permitFee: number // in cents (user-editable)
  escortCost: number // in cents (user-editable)
  notes?: string
  // Calculated values for reference
  calculatedPermitFee?: number // original calculated value in cents
  calculatedEscortCost?: number // original calculated value in cents
  distanceMiles?: number
}

export default function NewInlandQuoteV2Page() {
  const router = useRouter()

  // Tab state - Customer is first tab
  const [activeTab, setActiveTab] = useState('customer')

  // Quote number
  const [quoteNumber, setQuoteNumber] = useState('')

  // Route state
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupCity, setPickupCity] = useState('')
  const [pickupState, setPickupState] = useState('')
  const [pickupZip, setPickupZip] = useState('')
  const [pickupLat, setPickupLat] = useState<number>()
  const [pickupLng, setPickupLng] = useState<number>()
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [dropoffCity, setDropoffCity] = useState('')
  const [dropoffState, setDropoffState] = useState('')
  const [dropoffZip, setDropoffZip] = useState('')
  const [dropoffLat, setDropoffLat] = useState<number>()
  const [dropoffLng, setDropoffLng] = useState<number>()
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null)
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [routePolyline, setRoutePolyline] = useState<string>('')
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null)

  // Cargo entry mode toggle: 'ai' for drag-drop/paste, 'manual' for manual form entry
  const [cargoEntryMode, setCargoEntryMode] = useState<'ai' | 'manual'>('ai')

  // Manual entry state (for equipment mode)
  const [manualDescription, setManualDescription] = useState('')
  const [manualLength, setManualLength] = useState('')
  const [manualWidth, setManualWidth] = useState('')
  const [manualHeight, setManualHeight] = useState('')
  const [manualWeight, setManualWeight] = useState('')
  const [manualQuantity, setManualQuantity] = useState('1')
  const [isEquipmentMode, setIsEquipmentMode] = useState(false)
  const [selectedMakeId, setSelectedMakeId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  // Cargo state (NEW - using feet, AI-parsed)
  const [cargoItems, setCargoItems] = useState<LoadItem[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [parsingStatus, setParsingStatus] = useState<string>('')

  // Load plan state (automatically calculated)
  const [loadPlan, setLoadPlan] = useState<LoadPlan | null>(null)

  // Customer state
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [customerAddress, setCustomerAddress] = useState<CustomerAddress>({
    address: '',
    city: '',
    state: '',
    zip: '',
  })
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

  // Notes
  const [internalNotes, setInternalNotes] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')

  // Services/Pricing (merged)
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([])
  const [pricingPerTruck, setPricingPerTruck] = useState(false)

  // Accessorial charges
  const [accessorialItems, setAccessorialItems] = useState<AccessorialCharge[]>([])

  // Editable permit costs - allows overriding calculated values
  const [editablePermitCosts, setEditablePermitCosts] = useState<EditablePermitCost[]>([])

  // Fetch settings for PDF and service types
  const { data: settings } = trpc.settings.get.useQuery()
  const { data: serviceTypes } = trpc.inland.getServiceTypes.useQuery()

  // Equipment database queries (for manual entry mode)
  const { data: equipmentMakes } = trpc.equipment.getMakes.useQuery()
  const { data: equipmentModels } = trpc.equipment.getModels.useQuery(
    { makeId: selectedMakeId! },
    { enabled: !!selectedMakeId }
  )
  const { data: equipmentDimensions } = trpc.equipment.getDimensions.useQuery(
    { modelId: selectedModelId! },
    { enabled: !!selectedModelId }
  )

  // Generate quote number on mount
  useEffect(() => {
    setQuoteNumber(generateInlandQuoteNumber())
  }, [])

  // Auto-calculate load plan when cargo changes
  useEffect(() => {
    if (cargoItems.length === 0) {
      setLoadPlan(null)
      return
    }

    // Check if all items have valid dimensions
    const validItems = cargoItems.filter(
      (item) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
    )

    if (validItems.length === 0) {
      setLoadPlan(null)
      return
    }

    // Convert LoadItem[] to ParsedLoad for planLoads
    const maxLength = Math.max(...validItems.map(i => i.length))
    const maxWidth = Math.max(...validItems.map(i => i.width))
    const maxHeight = Math.max(...validItems.map(i => i.height))
    const maxWeight = Math.max(...validItems.map(i => i.weight * i.quantity))
    const totalWeight = validItems.reduce((sum, i) => sum + i.weight * i.quantity, 0)

    const parsedLoad = {
      length: maxLength,
      width: maxWidth,
      height: maxHeight,
      weight: maxWeight,
      totalWeight,
      items: validItems,
      confidence: 100,
    }

    // Calculate full load plan
    const plan = planLoads(parsedLoad)
    setLoadPlan(plan)
  }, [cargoItems])

  // Auto-populate dimensions when equipment model is selected
  useEffect(() => {
    if (equipmentDimensions && isEquipmentMode) {
      // Convert inches to feet for display (dimensions come in inches from DB)
      setManualLength((equipmentDimensions.length / 12).toFixed(2))
      setManualWidth((equipmentDimensions.width / 12).toFixed(2))
      setManualHeight((equipmentDimensions.height / 12).toFixed(2))
      setManualWeight(equipmentDimensions.weight.toString())
    }
  }, [equipmentDimensions, isEquipmentMode])

  // Handler for adding a manual cargo item
  const handleAddManualItem = useCallback(() => {
    const length = parseFloat(manualLength) || 0
    const width = parseFloat(manualWidth) || 0
    const height = parseFloat(manualHeight) || 0
    const weight = parseFloat(manualWeight) || 0
    const quantity = parseInt(manualQuantity) || 1

    if (!manualDescription.trim()) {
      toast.error('Please enter a description')
      return
    }

    if (length <= 0 || width <= 0 || height <= 0) {
      toast.error('Please enter valid dimensions')
      return
    }

    // Find the make and model names from the selected IDs
    const makeName = selectedMakeId
      ? equipmentMakes?.find(m => m.id === selectedMakeId)?.name
      : undefined
    const modelName = selectedModelId
      ? equipmentModels?.find(m => m.id === selectedModelId)?.name
      : undefined

    const newItem: LoadItem = {
      id: `manual-${Date.now()}`,
      description: manualDescription.trim(),
      quantity,
      length, // in feet
      width,
      height,
      weight,
      stackable: true,
      // Equipment fields (mapped for later use)
      ...(isEquipmentMode && selectedMakeId && selectedModelId && {
        equipmentMatched: true,
        equipmentMakeId: selectedMakeId,
        equipmentModelId: selectedModelId,
        dimensionsSource: 'database' as const,
      }),
    }

    setCargoItems(prev => [...prev, newItem])

    // Reset form
    setManualDescription('')
    setManualLength('')
    setManualWidth('')
    setManualHeight('')
    setManualWeight('')
    setManualQuantity('1')
    if (isEquipmentMode) {
      setSelectedMakeId(null)
      setSelectedModelId(null)
    }

    toast.success('Cargo item added')
  }, [
    manualDescription,
    manualLength,
    manualWidth,
    manualHeight,
    manualWeight,
    manualQuantity,
    isEquipmentMode,
    selectedMakeId,
    selectedModelId,
    equipmentMakes,
    equipmentModels,
  ])

  // Calculate totals from service items
  const servicesTotal = useMemo(() => {
    return serviceItems.reduce((sum, s) => sum + s.total, 0)
  }, [serviceItems])

  // Calculate totals from accessorial charges
  const accessorialsTotal = useMemo(() => {
    return accessorialItems.reduce((sum, a) => sum + a.total, 0)
  }, [accessorialItems])

  // Grand total = services only (accessorials are "if applicable" and shown separately)
  const grandTotal = useMemo(() => {
    return servicesTotal
  }, [servicesTotal])

  // Service item functions
  const addServiceItem = (truckIndex?: number) => {
    const newService: ServiceItem = {
      id: crypto.randomUUID(),
      name: 'Line Haul',
      rate: 0,
      quantity: 1,
      total: 0,
      truckIndex: pricingPerTruck ? truckIndex : undefined,
    }
    setServiceItems([...serviceItems, newService])
  }

  const updateServiceItem = (index: number, field: keyof ServiceItem, value: string | number) => {
    const newServices = [...serviceItems]
    const service = { ...newServices[index] }

    if (field === 'rate') {
      service.rate = typeof value === 'number' ? value : parseWholeDollarsToCents(String(value))
      service.total = service.rate * service.quantity
    } else if (field === 'quantity') {
      service.quantity = typeof value === 'number' ? value : parseInt(String(value)) || 1
      service.total = service.rate * service.quantity
    } else if (field === 'name') {
      service.name = String(value)
    }

    newServices[index] = service
    setServiceItems(newServices)
  }

  const removeServiceItem = (index: number) => {
    setServiceItems(serviceItems.filter((_, i) => i !== index))
  }

  // Accessorial charge functions
  const addAccessorialItem = () => {
    const defaultType = DEFAULT_ACCESSORIAL_TYPES[0]
    const newAccessorial: AccessorialCharge = {
      id: crypto.randomUUID(),
      accessorial_type_id: '',
      name: defaultType.name,
      billing_unit: defaultType.billing_unit,
      rate: defaultType.default_rate,
      quantity: 1,
      total: defaultType.default_rate,
    }
    setAccessorialItems([...accessorialItems, newAccessorial])
  }

  const updateAccessorialItem = (index: number, field: keyof AccessorialCharge, value: string | number) => {
    const newAccessorials = [...accessorialItems]
    const accessorial = { ...newAccessorials[index] }

    if (field === 'name') {
      accessorial.name = String(value)
      // Find matching default type and update billing unit and rate
      const matchingType = DEFAULT_ACCESSORIAL_TYPES.find(t => t.name === value)
      if (matchingType) {
        accessorial.billing_unit = matchingType.billing_unit
        accessorial.rate = matchingType.default_rate
        accessorial.total = accessorial.rate * accessorial.quantity
      }
    } else if (field === 'billing_unit') {
      accessorial.billing_unit = value as AccessorialBillingUnit
    } else if (field === 'rate') {
      accessorial.rate = typeof value === 'number' ? value : parseWholeDollarsToCents(String(value))
      accessorial.total = accessorial.rate * accessorial.quantity
    } else if (field === 'quantity') {
      accessorial.quantity = typeof value === 'number' ? value : parseInt(String(value)) || 1
      accessorial.total = accessorial.rate * accessorial.quantity
    }

    newAccessorials[index] = accessorial
    setAccessorialItems(newAccessorials)
  }

  const removeAccessorialItem = (index: number) => {
    setAccessorialItems(accessorialItems.filter((_, i) => i !== index))
  }

  // Accessorial type options for dropdown
  const accessorialOptions = useMemo(() => {
    return DEFAULT_ACCESSORIAL_TYPES.map(t => ({
      value: t.name,
      label: t.name,
    }))
  }, [])

  // Billing unit options for dropdown
  const billingUnitOptions = useMemo(() => {
    return ACCESSORIAL_BILLING_UNITS.map(u => ({
      value: u,
      label: u === 'flat' ? 'Flat Rate' :
             u === 'hour' ? 'Per Hour' :
             u === 'day' ? 'Per Day' :
             u === 'way' ? 'Per Way' :
             u === 'week' ? 'Per Week' :
             u === 'month' ? 'Per Month' :
             u === 'stop' ? 'Per Stop' : u,
    }))
  }, [])

  // Service options from database or fallback
  const serviceOptions = useMemo(() => {
    if (serviceTypes && serviceTypes.length > 0) {
      return [
        ...serviceTypes.map(s => ({ value: s.id, label: s.name })),
        { value: 'custom', label: 'Custom Service' }
      ]
    }
    return PREDEFINED_SERVICES
  }, [serviceTypes])

  // Calculate per-truck cargo specs for permit calculation
  // This allows us to show which trucks need permits vs which are legal
  interface TruckCargoSpecs extends CargoSpecs {
    truckIndex: number
    truckName: string
    truckId: string
    isOversize: boolean
    isOverweight: boolean
  }

  const perTruckCargoSpecs: TruckCargoSpecs[] = useMemo(() => {
    if (!loadPlan || loadPlan.loads.length === 0) return []

    return loadPlan.loads.map((load, index) => {
      const truck = load.recommendedTruck
      const items = load.items

      // Calculate max dimensions for this specific load
      const maxLength = items.length > 0 ? Math.max(...items.map(i => i.length)) : 0
      const maxWidth = items.length > 0 ? Math.max(...items.map(i => i.width)) : 0
      const maxHeight = items.length > 0 ? Math.max(...items.map(i => i.height)) : 0
      const cargoWeight = items.reduce((sum, i) => sum + i.weight * (i.quantity || 1), 0)

      // Add deck height for total height
      const totalHeight = maxHeight + truck.deckHeight

      // Gross weight = cargo + truck tare weight
      const tareWeight = truck.tareWeight || 20000
      const grossWeight = cargoWeight + tareWeight

      // Legal limits for oversize/overweight determination
      const isOversize = maxWidth > 8.5 || totalHeight > 13.5 || maxLength > 53
      const isOverweight = grossWeight > 80000

      return {
        truckIndex: index,
        truckName: truck.name,
        truckId: truck.id,
        length: maxLength,
        width: maxWidth,
        height: totalHeight,
        grossWeight: grossWeight,
        isOversize,
        isOverweight,
      }
    })
  }, [loadPlan])

  // Calculate overall cargo specs (max across all trucks) for backward compatibility
  const cargoSpecs: CargoSpecs | null = useMemo(() => {
    if (perTruckCargoSpecs.length === 0) return null

    // Use the maximum dimensions across all trucks
    const maxLength = Math.max(...perTruckCargoSpecs.map(t => t.length))
    const maxWidth = Math.max(...perTruckCargoSpecs.map(t => t.width))
    const maxHeight = Math.max(...perTruckCargoSpecs.map(t => t.height))
    const maxGrossWeight = Math.max(...perTruckCargoSpecs.map(t => t.grossWeight))

    return {
      length: maxLength,
      width: maxWidth,
      height: maxHeight,
      grossWeight: maxGrossWeight,
    }
  }, [perTruckCargoSpecs])

  // Handle file/text analysis
  const handleAnalyzed = (result: {
    items: LoadItem[]
    loadPlan: {
      loads: Array<{
        id: string
        items: LoadItem[]
        truck: TruckType
        placements: Array<{ itemId: string; x: number; z: number; rotated: boolean }>
        utilization: { weight: number; space: number }
        warnings: string[]
      }>
      totalTrucks: number
      totalWeight: number
      totalItems: number
      warnings: string[]
    }
    parseMethod: 'AI' | 'pattern'
  }) => {
    setCargoItems(result.items)
    // Convert the LoadPlanResult format to LoadPlan format
    if (result.loadPlan) {
      const convertedPlan: LoadPlan = {
        loads: result.loadPlan.loads.map(load => ({
          id: load.id,
          items: load.items,
          length: Math.max(...load.items.map(i => i.length), 0),
          width: Math.max(...load.items.map(i => i.width), 0),
          height: Math.max(...load.items.map(i => i.height), 0),
          weight: load.items.reduce((sum, i) => sum + i.weight * i.quantity, 0),
          recommendedTruck: load.truck,
          truckScore: 85,
          placements: load.placements,
          permitsRequired: [],
          warnings: load.warnings,
          isLegal: true,
        })),
        totalTrucks: result.loadPlan.totalTrucks,
        totalWeight: result.loadPlan.totalWeight,
        totalItems: result.loadPlan.totalItems,
        unassignedItems: [],
        warnings: result.loadPlan.warnings,
      }
      setLoadPlan(convertedPlan)
    }
  }

  // Handle truck change for a specific load
  const handleTruckChange = (loadIndex: number, newTruck: TruckType) => {
    if (!loadPlan) return

    const updatedLoads = [...loadPlan.loads]
    updatedLoads[loadIndex] = {
      ...updatedLoads[loadIndex],
      recommendedTruck: newTruck,
    }

    setLoadPlan({
      ...loadPlan,
      loads: updatedLoads,
    })
  }

  // Handle permit data calculated from RouteIntelligence
  const handlePermitDataCalculated = useCallback((permitData: DetailedRoutePermitSummary | null) => {
    if (!permitData) {
      setEditablePermitCosts([])
      return
    }

    // Initialize editable permit costs from calculated data
    const initialCosts: EditablePermitCost[] = permitData.statePermits.map((permit, index) => ({
      id: `permit-${permit.stateCode}-${index}`,
      stateCode: permit.stateCode,
      stateName: permit.state,
      permitFee: permit.estimatedFee, // Already in cents
      escortCost: 0, // Escort costs are per-state from breakdown
      calculatedPermitFee: permit.estimatedFee,
      calculatedEscortCost: 0,
      distanceMiles: permit.distanceInState,
    }))

    // If there's an escort breakdown, add per-state escort costs
    if (permitData.escortBreakdown?.perState) {
      permitData.escortBreakdown.perState.forEach(stateEscort => {
        const existing = initialCosts.find(c => c.stateCode === stateEscort.stateCode)
        if (existing) {
          existing.escortCost = stateEscort.stateCost
          existing.calculatedEscortCost = stateEscort.stateCost
        }
      })
    }

    setEditablePermitCosts(initialCosts)
  }, [])

  // Update a single permit cost field
  const updatePermitCost = (id: string, field: 'permitFee' | 'escortCost' | 'notes', value: number | string) => {
    setEditablePermitCosts(prev => prev.map(permit =>
      permit.id === id
        ? { ...permit, [field]: value }
        : permit
    ))
  }

  // Calculate permit totals from editable values
  const permitTotals = useMemo(() => {
    const totalPermitFees = editablePermitCosts.reduce((sum, p) => sum + p.permitFee, 0)
    const totalEscortCosts = editablePermitCosts.reduce((sum, p) => sum + p.escortCost, 0)
    return {
      permits: totalPermitFees,
      escorts: totalEscortCosts,
      total: totalPermitFees + totalEscortCosts,
    }
  }, [editablePermitCosts])

  // Reset form function
  const resetForm = useCallback(() => {
    setQuoteNumber(generateInlandQuoteNumber())
    setPickupAddress('')
    setPickupCity('')
    setPickupState('')
    setPickupZip('')
    setPickupLat(undefined)
    setPickupLng(undefined)
    setDropoffAddress('')
    setDropoffCity('')
    setDropoffState('')
    setDropoffZip('')
    setDropoffLat(undefined)
    setDropoffLng(undefined)
    setDistanceMiles(null)
    setDurationMinutes(null)
    setRoutePolyline('')
    setRouteResult(null)
    setCargoItems([])
    setLoadPlan(null)
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setCustomerCompany('')
    setCustomerAddress({ address: '', city: '', state: '', zip: '' })
    setSelectedCompanyId(null)
    setInternalNotes('')
    setQuoteNotes('')
    setServiceItems([])
    setAccessorialItems([])
    setEditablePermitCosts([])
    setPricingPerTruck(false)
    setActiveTab('customer')
    toast.success('Quote cleared')
  }, [])

  // TRPC utils
  const utils = trpc.useUtils()

  // Create quote mutation
  const createQuote = trpc.inland.create.useMutation({
    onSuccess: () => {
      toast.success('Quote created successfully')
      utils.inland.getHistory.invalidate()
      router.push('/inland/history')
    },
    onError: (error) => {
      toast.error(`Failed to create quote: ${error.message}`)
    },
  })

  const handleSaveQuote = () => {
    if (!customerName) {
      toast.error('Please enter a customer name')
      return
    }
    if (!pickupAddress && !dropoffAddress) {
      toast.error('Please enter at least one address')
      return
    }

    // Convert LoadItems (feet) back to legacy format (inches) for storage
    const legacyCargoItems = cargoItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      length_inches: item.length * 12,
      width_inches: item.width * 12,
      height_inches: item.height * 12,
      weight_lbs: item.weight,
      is_oversize: item.width > 8.5 || item.height > 10,
      is_overweight: item.weight > 48000,
    }))

    createQuote.mutate({
      quote_number: quoteNumber,
      status: 'draft',
      customer_name: customerName,
      customer_email: customerEmail || undefined,
      customer_phone: customerPhone || undefined,
      customer_company: customerCompany || undefined,
      company_id: selectedCompanyId || undefined,
      subtotal: grandTotal,
      total: grandTotal,
      quote_data: {
        version: 2, // Mark as v2 quote with load planner
        pickup: {
          address: pickupAddress,
          city: pickupCity,
          state: pickupState,
          zip: pickupZip,
          lat: pickupLat,
          lng: pickupLng,
        },
        dropoff: {
          address: dropoffAddress,
          city: dropoffCity,
          state: dropoffState,
          zip: dropoffZip,
          lat: dropoffLat,
          lng: dropoffLng,
        },
        distance_miles: distanceMiles,
        duration_minutes: durationMinutes,
        route_polyline: routePolyline,
        cargo_items: legacyCargoItems,
        load_plan: loadPlan
          ? {
              totalTrucks: loadPlan.totalTrucks,
              totalWeight: loadPlan.totalWeight,
              totalItems: loadPlan.totalItems,
              loads: loadPlan.loads.map((load) => ({
                id: load.id,
                truck: {
                  id: load.recommendedTruck.id,
                  name: load.recommendedTruck.name,
                  category: load.recommendedTruck.category,
                },
                items: load.items.map((i) => i.id),
                placements: load.placements,
                weight: load.weight,
                warnings: load.warnings,
              })),
              warnings: loadPlan.warnings,
            }
          : null,
        service_items: serviceItems,
        pricing_per_truck: pricingPerTruck,
        internalNotes,
        quoteNotes,
        customerAddress,
      },
    })
  }

  // Build PDF data for automatic preview
  const pdfData: UnifiedPDFData | null = useMemo(() => {
    if (!settings) return null

    return {
      quoteType: 'inland' as const,
      quoteNumber,
      issueDate: formatDate(new Date()),
      validUntil: (() => {
        const date = new Date()
        date.setDate(date.getDate() + (settings.quote_validity_days || 30))
        return formatDate(date)
      })(),
      company: {
        name: settings.company_name,
        address: [settings.company_address, settings.company_city, settings.company_state, settings.company_zip].filter(Boolean).join(', ') || undefined,
        phone: settings.company_phone,
        email: settings.company_email,
        website: settings.company_website,
        logoUrl: settings.company_logo_url,
        logoSizePercentage: settings.logo_size_percentage || 100,
        primaryColor: settings.primary_color || '#1e3a8a',
        secondaryColor: settings.secondary_color,
      },
      customer: {
        name: customerName || 'N/A',
        company: customerCompany || undefined,
        email: customerEmail || undefined,
        phone: customerPhone || undefined,
        address: customerAddress.address || undefined,
        city: customerAddress.city || undefined,
        state: customerAddress.state || undefined,
        zip: customerAddress.zip || undefined,
      },
      equipment: [],
      isMultiEquipment: false,
      inlandTransport: {
        enabled: true,
        pickup: {
          address: pickupAddress,
          city: pickupCity,
          state: pickupState,
          zip: pickupZip,
        },
        dropoff: {
          address: dropoffAddress,
          city: dropoffCity,
          state: dropoffState,
          zip: dropoffZip,
        },
        total: grandTotal,
        // Destination blocks - cargo only (no services per truck)
        destinationBlocks: [{
          id: 'main',
          label: 'A',
          pickup_address: pickupAddress,
          pickup_city: pickupCity,
          pickup_state: pickupState,
          pickup_zip: pickupZip,
          dropoff_address: dropoffAddress,
          dropoff_city: dropoffCity,
          dropoff_state: dropoffState,
          dropoff_zip: dropoffZip,
          distance_miles: distanceMiles || undefined,
          duration_minutes: durationMinutes || undefined,
          route_polyline: routePolyline || undefined,
          // Load blocks contain ONLY cargo items - no services
          load_blocks: loadPlan?.loads.map(load => ({
            id: load.id,
            truck_type_id: load.recommendedTruck.id,
            truck_type_name: load.recommendedTruck.name,
            cargo_items: load.items.map(item => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              length_inches: item.length * 12,
              width_inches: item.width * 12,
              height_inches: item.height * 12,
              weight_lbs: item.weight,
              is_oversize: item.width > 8.5 || item.height > 10,
              is_overweight: item.weight > 48000,
              // Cargo images
              image_url: item.imageUrl,
              image_url_2: item.imageUrl2,
              front_image_url: item.frontImageUrl,
              side_image_url: item.sideImageUrl,
              // Equipment database fields
              is_equipment: item.equipmentMatched,
              equipment_make_id: item.equipmentMakeId,
              equipment_model_id: item.equipmentModelId,
            })),
            // Empty service_items - services are at transport level instead
            service_items: [],
            accessorial_charges: [],
            subtotal: 0,
            accessorials_total: 0,
            // Load plan diagram data
            placements: load.placements,
            truck_specs: {
              deckLength: load.recommendedTruck.deckLength,
              deckWidth: load.recommendedTruck.deckWidth,
              deckHeight: load.recommendedTruck.deckHeight,
              maxWeight: load.recommendedTruck.maxCargoWeight,
            },
          })) || [],
          // Services at destination level (consolidated)
          service_items: serviceItems.map(s => ({
            id: s.id,
            name: s.name,
            rate: s.rate,
            quantity: s.quantity,
            total: s.total,
          })),
          // Accessorial charges at destination level
          accessorial_charges: accessorialItems.map(a => ({
            id: a.id,
            name: a.name,
            billing_unit: a.billing_unit,
            rate: a.rate,
            quantity: a.quantity,
            total: a.total,
          })),
          subtotal: servicesTotal,
          accessorials_total: accessorialsTotal,
        }],
        // Top-level load blocks for backward compatibility - cargo only
        load_blocks: loadPlan?.loads.map(load => ({
          id: load.id,
          truck_type_id: load.recommendedTruck.id,
          truck_type_name: load.recommendedTruck.name,
          cargo_items: load.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            length_inches: item.length * 12,
            width_inches: item.width * 12,
            height_inches: item.height * 12,
            weight_lbs: item.weight,
            is_oversize: item.width > 8.5 || item.height > 10,
            is_overweight: item.weight > 48000,
            // Cargo images
            image_url: item.imageUrl,
            image_url_2: item.imageUrl2,
            front_image_url: item.frontImageUrl,
            side_image_url: item.sideImageUrl,
            // Equipment database fields
            is_equipment: item.equipmentMatched,
            equipment_make_id: item.equipmentMakeId,
            equipment_model_id: item.equipmentModelId,
          })),
          // Empty - services consolidated at destination level
          service_items: [],
          accessorial_charges: [],
          subtotal: 0,
          accessorials_total: 0,
          // Load plan diagram data
          placements: load.placements,
          truck_specs: {
            deckLength: load.recommendedTruck.deckLength,
            deckWidth: load.recommendedTruck.deckWidth,
            deckHeight: load.recommendedTruck.deckHeight,
            maxWeight: load.recommendedTruck.maxCargoWeight,
          },
        })) || [],
        distance_miles: distanceMiles || undefined,
        duration_minutes: durationMinutes || undefined,
        static_map_url: pickupLat && pickupLng && dropoffLat && dropoffLng
          ? `https://maps.googleapis.com/maps/api/staticmap?size=800x400&maptype=roadmap&markers=color:green|label:A|${pickupLat},${pickupLng}&markers=color:red|label:B|${dropoffLat},${dropoffLng}${routePolyline ? `&path=color:0x4285F4|weight:4|enc:${encodeURIComponent(routePolyline)}` : ''}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          : undefined,
        // Permit costs breakdown
        permit_costs: editablePermitCosts.length > 0 ? {
          items: editablePermitCosts.map(p => ({
            id: p.id,
            stateCode: p.stateCode,
            stateName: p.stateName,
            permitFee: p.permitFee,
            escortCost: p.escortCost,
            distanceMiles: p.distanceMiles,
            notes: p.notes,
          })),
          totalPermitFees: permitTotals.permits,
          totalEscortCosts: permitTotals.escorts,
          grandTotal: permitTotals.total,
        } : undefined,
      },
      equipmentSubtotal: 0,
      miscFeesTotal: 0,
      inlandTotal: grandTotal,
      grandTotal: grandTotal,
      customerNotes: quoteNotes || undefined,
    }
  }, [settings, quoteNumber, customerName, customerCompany, customerEmail, customerPhone, customerAddress, pickupAddress, pickupCity, pickupState, pickupZip, pickupLat, pickupLng, dropoffAddress, dropoffCity, dropoffState, dropoffZip, dropoffLat, dropoffLng, distanceMiles, durationMinutes, routePolyline, loadPlan, serviceItems, accessorialItems, pricingPerTruck, grandTotal, servicesTotal, accessorialsTotal, quoteNotes, editablePermitCosts, permitTotals])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Inland Quote</h1>
              <Badge variant="secondary" className="text-xs">
                v2 with Load Planner
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">Quote #{quoteNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={handleSaveQuote} disabled={createQuote.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createQuote.isPending ? 'Saving...' : 'Save Quote'}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Quote
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="customer" className="flex items-center gap-1 flex-shrink-0">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Customer</span>
              </TabsTrigger>
              <TabsTrigger value="route" className="flex items-center gap-1 flex-shrink-0">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Route</span>
              </TabsTrigger>
              <TabsTrigger value="cargo" className="flex items-center gap-1 flex-shrink-0">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Cargo</span>
              </TabsTrigger>
              <TabsTrigger value="trucks" className="flex items-center gap-1 flex-shrink-0">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Trucks</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-1 flex-shrink-0">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="permits" className="flex items-center gap-1 flex-shrink-0">
                <FileWarning className="h-4 w-4" />
                <span className="hidden sm:inline">Permits</span>
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center gap-1 flex-shrink-0">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </TabsTrigger>
            </TabsList>

            {/* Route Tab */}
            <TabsContent value="route" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <CardTitle>Pickup Location</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AddressAutocomplete
                    id="pickup"
                    placeholder="Enter pickup address..."
                    value={pickupAddress}
                    onChange={setPickupAddress}
                    onSelect={(components) => {
                      setPickupAddress(components.address)
                      setPickupCity(components.city || '')
                      setPickupState(components.state || '')
                      setPickupZip(components.zip || '')
                      setPickupLat(components.lat)
                      setPickupLng(components.lng)
                    }}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">City</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={pickupCity}
                        onChange={(e) => setPickupCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={pickupState}
                        onChange={(e) => setPickupState(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ZIP</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={pickupZip}
                        onChange={(e) => setPickupZip(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-600" />
                    <CardTitle>Dropoff Location</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AddressAutocomplete
                    id="dropoff"
                    placeholder="Enter dropoff address..."
                    value={dropoffAddress}
                    onChange={setDropoffAddress}
                    onSelect={(components) => {
                      setDropoffAddress(components.address)
                      setDropoffCity(components.city || '')
                      setDropoffState(components.state || '')
                      setDropoffZip(components.zip || '')
                      setDropoffLat(components.lat)
                      setDropoffLng(components.lng)
                    }}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">City</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={dropoffCity}
                        onChange={(e) => setDropoffCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={dropoffState}
                        onChange={(e) => setDropoffState(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ZIP</Label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={dropoffZip}
                        onChange={(e) => setDropoffZip(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('customer')}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab('cargo')} className="flex-1">
                  Continue to Cargo
                </Button>
              </div>
            </TabsContent>

            {/* Cargo Tab */}
            <TabsContent value="cargo" className="space-y-4 mt-4">
              {/* Entry Mode Toggle */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Cargo Entry Mode</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose how to add cargo items
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                      <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          cargoEntryMode === 'ai'
                            ? 'bg-background shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => setCargoEntryMode('ai')}
                      >
                        <Upload className="h-4 w-4 inline mr-2" />
                        AI Upload
                      </button>
                      <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          cargoEntryMode === 'manual'
                            ? 'bg-background shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => setCargoEntryMode('manual')}
                      >
                        <Plus className="h-4 w-4 inline mr-2" />
                        Manual Entry
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Upload Section - shown in AI mode */}
              {cargoEntryMode === 'ai' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Upload Cargo Data
                    </CardTitle>
                    <CardDescription>
                      Drop an Excel file, image, or paste cargo info - AI will extract the details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UniversalDropzone
                      onAnalyzed={handleAnalyzed}
                      onLoading={setIsAnalyzing}
                      onError={setAnalysisError}
                      onStatusChange={setParsingStatus}
                    />
                    {/* Parsing Status Indicator */}
                    {isAnalyzing && parsingStatus && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-700">Processing</p>
                            <p className="text-sm text-blue-600">{parsingStatus}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {analysisError && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-700">Error</p>
                        <p className="text-sm text-red-600">{analysisError}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Manual Entry Section - shown in Manual mode */}
              {cargoEntryMode === 'manual' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add Cargo Item
                    </CardTitle>
                    <CardDescription>
                      Enter cargo details manually. Toggle Equipment Mode to select from the database.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Equipment Mode Toggle */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium">Equipment Mode</span>
                          <p className="text-xs text-muted-foreground">
                            Select equipment from database to auto-fill dimensions
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isEquipmentMode}
                        onCheckedChange={(checked) => {
                          setIsEquipmentMode(checked)
                          if (!checked) {
                            setSelectedMakeId(null)
                            setSelectedModelId(null)
                          }
                        }}
                      />
                    </div>

                    {/* Equipment Selection - shown when equipment mode is on */}
                    {isEquipmentMode && (
                      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-blue-50/50">
                        <div>
                          <Label className="text-xs font-medium">Make</Label>
                          <SearchableSelect
                            value={selectedMakeId || ''}
                            onChange={(value) => {
                              setSelectedMakeId(value || null)
                              setSelectedModelId(null) // Reset model when make changes
                            }}
                            options={
                              equipmentMakes?.map((make) => ({
                                value: make.id,
                                label: make.name,
                              })) || []
                            }
                            placeholder="Select make..."
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Model</Label>
                          <SearchableSelect
                            value={selectedModelId || ''}
                            onChange={(value) => {
                              setSelectedModelId(value || null)
                              // Description will be auto-filled from make + model
                              if (value && selectedMakeId) {
                                const make = equipmentMakes?.find(m => m.id === selectedMakeId)
                                const model = equipmentModels?.find(m => m.id === value)
                                if (make && model) {
                                  setManualDescription(`${make.name} ${model.name}`)
                                }
                              }
                            }}
                            options={
                              equipmentModels?.map((model) => ({
                                value: model.id,
                                label: model.name,
                              })) || []
                            }
                            placeholder={selectedMakeId ? "Select model..." : "Select make first"}
                            disabled={!selectedMakeId}
                          />
                        </div>
                        {equipmentDimensions && (
                          <div className="col-span-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                            Dimensions loaded from database - you can still modify them below
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manual Entry Form */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-medium">Description</Label>
                        <Input
                          value={manualDescription}
                          onChange={(e) => setManualDescription(e.target.value)}
                          placeholder="e.g., CAT 320 Excavator"
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs font-medium">Length (ft)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={manualLength}
                            onChange={(e) => setManualLength(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Width (ft)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={manualWidth}
                            onChange={(e) => setManualWidth(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Height (ft)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={manualHeight}
                            onChange={(e) => setManualHeight(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Weight (lbs)</Label>
                          <Input
                            type="number"
                            value={manualWeight}
                            onChange={(e) => setManualWeight(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="flex items-end gap-3">
                        <div className="w-24">
                          <Label className="text-xs font-medium">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={manualQuantity}
                            onChange={(e) => setManualQuantity(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleAddManualItem} className="flex-1">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cargo Items List - shown in both modes */}
              {cargoItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Cargo Items ({cargoItems.length})
                    </CardTitle>
                    <CardDescription>
                      Review and edit the cargo items. All dimensions are in feet.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ExtractedItemsList items={cargoItems} onChange={setCargoItems} />
                  </CardContent>
                </Card>
              )}

              {/* Load Plan Summary - Links to Trucks tab for details */}
              {loadPlan && loadPlan.loads.length > 0 && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium">
                            {loadPlan.totalTrucks} truck{loadPlan.totalTrucks > 1 ? 's' : ''} required
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {loadPlan.totalItems} items &bull; {(loadPlan.totalWeight / 1000).toFixed(1)}k lbs
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('trucks')}>
                        View Details
                      </Button>
                    </div>
                    {loadPlan.warnings.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-yellow-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{loadPlan.warnings.length} warning{loadPlan.warnings.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('route')}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab('trucks')} className="flex-1">
                  Continue to Trucks
                </Button>
              </div>
            </TabsContent>

            {/* Pricing Tab */}
            {/* Pricing Tab (with merged Services) */}
            <TabsContent value="pricing" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Services & Pricing
                      </CardTitle>
                      <CardDescription>Add services and set pricing for this quote</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="per-truck-pricing" className="text-sm">Price per truck</Label>
                      <Switch
                        id="per-truck-pricing"
                        checked={pricingPerTruck}
                        onCheckedChange={setPricingPerTruck}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!pricingPerTruck ? (
                    // Regular pricing - all services together
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Services</Label>
                        <Button variant="outline" size="sm" onClick={() => addServiceItem()}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Service
                        </Button>
                      </div>

                      {serviceItems.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/30">
                          No services added. Click &quot;Add Service&quot; to add line haul, fuel surcharge, and other charges.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {serviceItems.map((service, index) => {
                            const matchedService = serviceOptions.find(s => s.label === service.name)
                            const isCustomService = !matchedService || matchedService.value === 'custom'
                            const dropdownValue = matchedService?.value || 'custom'

                            return (
                              <div key={service.id} className="flex flex-wrap items-center gap-2 p-2 rounded bg-muted/30">
                                <SearchableSelect
                                  value={dropdownValue}
                                  onChange={(value) => {
                                    const selected = serviceOptions.find(s => s.value === value)
                                    if (selected) {
                                      updateServiceItem(index, 'name', selected.label)
                                      if (serviceTypes && value !== 'custom') {
                                        const dbService = serviceTypes.find(s => s.id === value)
                                        if (dbService && dbService.default_rate_cents > 0) {
                                          updateServiceItem(index, 'rate', dbService.default_rate_cents)
                                        }
                                      }
                                    }
                                  }}
                                  options={serviceOptions.map((s): SearchableSelectOption => ({
                                    value: s.value,
                                    label: s.label,
                                  }))}
                                  placeholder="Select service"
                                  searchPlaceholder="Search services..."
                                  className="w-full sm:w-[180px]"
                                />
                                {isCustomService && (
                                  <Input
                                    className="flex-1 min-w-[120px]"
                                    placeholder="Enter custom service name"
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
                                    onChange={(e) => updateServiceItem(index, 'rate', e.target.value)}
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
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Per-truck pricing
                    <div className="space-y-6">
                      {loadPlan && loadPlan.loads.length > 0 ? (
                        loadPlan.loads.map((load, truckIndex) => (
                          <div key={load.id} className="space-y-3 p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                  {truckIndex + 1}
                                </div>
                                <Label className="font-medium">{load.recommendedTruck.name}</Label>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => addServiceItem(truckIndex)}>
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </div>

                            <div className="space-y-2">
                              {serviceItems
                                .map((service, index) => ({ service, index }))
                                .filter(({ service }) => service.truckIndex === truckIndex)
                                .map(({ service, index }) => {
                                  const matchedService = serviceOptions.find(s => s.label === service.name)
                                  const isCustomService = !matchedService || matchedService.value === 'custom'
                                  const dropdownValue = matchedService?.value || 'custom'

                                  return (
                                    <div key={service.id} className="flex flex-wrap items-center gap-2 p-2 rounded bg-muted/30">
                                      <SearchableSelect
                                        value={dropdownValue}
                                        onChange={(value) => {
                                          const selected = serviceOptions.find(s => s.value === value)
                                          if (selected) {
                                            updateServiceItem(index, 'name', selected.label)
                                            if (serviceTypes && value !== 'custom') {
                                              const dbService = serviceTypes.find(s => s.id === value)
                                              if (dbService && dbService.default_rate_cents > 0) {
                                                updateServiceItem(index, 'rate', dbService.default_rate_cents)
                                              }
                                            }
                                          }
                                        }}
                                        options={serviceOptions.map((s): SearchableSelectOption => ({
                                          value: s.value,
                                          label: s.label,
                                        }))}
                                        placeholder="Select service"
                                        searchPlaceholder="Search services..."
                                        className="w-full sm:w-[180px]"
                                      />
                                      {isCustomService && (
                                        <Input
                                          className="flex-1 min-w-[120px]"
                                          placeholder="Custom service name"
                                          value={service.name === 'Custom Service' ? '' : service.name}
                                          onChange={(e) => updateServiceItem(index, 'name', e.target.value || 'Custom Service')}
                                        />
                                      )}
                                      <Input
                                        className="w-16"
                                        type="number"
                                        min={1}
                                        value={service.quantity}
                                        onChange={(e) => updateServiceItem(index, 'quantity', e.target.value)}
                                      />
                                      <div className="relative w-24">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                          className="pl-5 text-right font-mono"
                                          value={formatWholeDollars(service.rate)}
                                          onChange={(e) => updateServiceItem(index, 'rate', e.target.value)}
                                        />
                                      </div>
                                      <span className="w-20 text-right font-mono text-sm">
                                        ${formatWholeDollars(service.total)}
                                      </span>
                                      <Button variant="ghost" size="icon" onClick={() => removeServiceItem(index)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )
                                })}
                            </div>

                            <div className="flex justify-between text-sm pt-2 border-t">
                              <span>Truck {truckIndex + 1} Total</span>
                              <span className="font-mono font-medium">
                                {formatCurrency(
                                  serviceItems
                                    .filter(s => s.truckIndex === truckIndex)
                                    .reduce((sum, s) => sum + s.total, 0)
                                )}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/30">
                          Add cargo and trucks first to enable per-truck pricing.
                        </div>
                      )}
                    </div>
                  )}

                  <Separator className="my-6" />

                  {/* Accessorial Charges Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Accessorial Charges (If Applicable)</Label>
                      <Button variant="outline" size="sm" onClick={addAccessorialItem}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Accessorial
                      </Button>
                    </div>

                    {accessorialItems.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg bg-amber-50/50 border-amber-200">
                        No accessorial charges added. Add items like detention, layover, fuel surcharge, tolls, etc.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {accessorialItems.map((accessorial, index) => (
                          <div key={accessorial.id} className="flex flex-wrap items-center gap-2 p-2 rounded bg-amber-50/50 border border-amber-200">
                            <SearchableSelect
                              value={accessorial.name}
                              onChange={(value) => updateAccessorialItem(index, 'name', value)}
                              options={accessorialOptions.map((a): SearchableSelectOption => ({
                                value: a.value,
                                label: a.label,
                              }))}
                              placeholder="Select type"
                              searchPlaceholder="Search accessorials..."
                              className="w-full sm:w-[180px]"
                            />
                            <SearchableSelect
                              value={accessorial.billing_unit}
                              onChange={(value) => updateAccessorialItem(index, 'billing_unit', value)}
                              options={billingUnitOptions.map((b): SearchableSelectOption => ({
                                value: b.value,
                                label: b.label,
                              }))}
                              placeholder="Unit"
                              className="w-[100px]"
                            />
                            <Input
                              className="w-16 sm:w-20"
                              type="number"
                              min={1}
                              value={accessorial.quantity}
                              onChange={(e) => updateAccessorialItem(index, 'quantity', e.target.value)}
                              placeholder="Qty"
                            />
                            <div className="relative w-24 sm:w-28">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                className="pl-5 text-right font-mono"
                                placeholder="0"
                                value={formatWholeDollars(accessorial.rate)}
                                onChange={(e) => updateAccessorialItem(index, 'rate', e.target.value)}
                              />
                            </div>
                            <span className="w-20 sm:w-24 text-right font-mono text-sm">
                              ${formatWholeDollars(accessorial.total)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAccessorialItem(index)}
                              className="shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {accessorialItems.length > 0 && (
                      <div className="flex justify-between text-sm pt-2">
                        <span className="text-muted-foreground">Accessorials Subtotal</span>
                        <span className="font-mono font-medium text-amber-700">
                          {formatCurrency(accessorialsTotal)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator className="my-6" />

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <span className="text-lg font-medium">Grand Total</span>
                      {accessorialItems.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Services: {formatCurrency(servicesTotal)} + Accessorials: {formatCurrency(accessorialsTotal)}
                        </div>
                      )}
                    </div>
                    <span className="text-2xl font-bold font-mono text-primary">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Quote Notes (visible to customer)</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Terms, conditions, special instructions..."
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Internal Notes (not visible to customer)</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Internal notes..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('trucks')}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab('permits')} className="flex-1">
                  Continue to Permits
                </Button>
              </div>
            </TabsContent>

            {/* Customer Tab */}
            <TabsContent value="customer" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>Enter customer details or select from existing companies</CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerForm
                    customerName={customerName}
                    customerEmail={customerEmail}
                    customerPhone={customerPhone}
                    customerCompany={customerCompany}
                    customerAddress={customerAddress}
                    onCustomerNameChange={setCustomerName}
                    onCustomerEmailChange={setCustomerEmail}
                    onCustomerPhoneChange={setCustomerPhone}
                    onCustomerCompanyChange={setCustomerCompany}
                    onCustomerAddressChange={setCustomerAddress}
                    onCompanySelect={(id, name) => {
                      setSelectedCompanyId(id)
                      setCustomerCompany(name)
                    }}
                    notes=""
                    onNotesChange={() => {}}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button className="flex-1" onClick={() => setActiveTab('route')}>
                  Continue to Route
                </Button>
              </div>
            </TabsContent>

            {/* Trucks Tab - NEW */}
            <TabsContent value="trucks" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Load Plan & Truck Selection
                  </CardTitle>
                  <CardDescription>
                    Review recommended trucks and load placement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cargoItems.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-muted-foreground">
                      <Package className="h-12 w-12 mb-4 opacity-50" />
                      <p>Add cargo items first to see truck recommendations</p>
                      <Button variant="outline" className="mt-4" onClick={() => setActiveTab('cargo')}>
                        Go to Cargo
                      </Button>
                    </div>
                  ) : loadPlan && loadPlan.loads.length > 0 ? (
                    <div className="space-y-4">
                      {loadPlan.warnings.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">Warnings</span>
                          </div>
                          <ul className="text-sm text-yellow-700 list-disc list-inside">
                            {loadPlan.warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {loadPlan.loads.map((load, index) => {
                        if (!load.recommendedTruck) return null
                        return (
                          <Card key={load.id} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium">{load.recommendedTruck.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {load.items.length} items &bull; {(load.weight / 1000).toFixed(1)}k lbs
                                    </div>
                                  </div>
                                </div>
                                <TruckSelector
                                  currentTruck={load.recommendedTruck}
                                  onChange={(truck) => handleTruckChange(index, truck)}
                                  itemsWeight={load.weight}
                                  maxItemLength={Math.max(...load.items.map((i) => i.length), 0)}
                                  maxItemWidth={Math.max(...load.items.map((i) => i.width), 0)}
                                  maxItemHeight={Math.max(...load.items.map((i) => i.height), 0)}
                                />
                              </div>
                            </CardHeader>
                            <CardContent>
                              <TrailerDiagram
                                truck={load.recommendedTruck}
                                items={load.items}
                                placements={load.placements}
                              />
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-10 text-muted-foreground">
                      <Truck className="h-12 w-12 mb-4 opacity-50" />
                      <p>No load plan available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('cargo')}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab('pricing')} className="flex-1">
                  Continue to Pricing
                </Button>
              </div>
            </TabsContent>

            {/* Permits Tab - NEW */}
            <TabsContent value="permits" className="space-y-4 mt-4">
              {!pickupAddress || !dropoffAddress ? (
                <Card>
                  <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
                    <MapPin className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center">Enter pickup and dropoff addresses first</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab('route')}>
                      Go to Route
                    </Button>
                  </CardContent>
                </Card>
              ) : distanceMiles === null || distanceMiles === undefined ? (
                <Card>
                  <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
                    <MapPin className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center">Calculate the route first to see permit requirements</p>
                    <p className="text-xs mt-1 text-muted-foreground">Use the map on the right to calculate your route</p>
                  </CardContent>
                </Card>
              ) : !cargoSpecs ? (
                <Card>
                  <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
                    <Package className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center">Add cargo items to calculate permit requirements</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab('cargo')}>
                      Go to Cargo
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <RouteIntelligence
                  origin={pickupAddress}
                  destination={dropoffAddress}
                  cargoSpecs={cargoSpecs}
                  perTruckCargoSpecs={perTruckCargoSpecs}
                  routeData={routeResult || undefined}
                  onRouteCalculated={(result) => {
                    setRouteResult(result)
                    // Only update distance if not already set from SimpleRouteMap
                    if (!distanceMiles) {
                      setDistanceMiles(result.totalDistanceMiles)
                    }
                  }}
                  onPermitDataCalculated={handlePermitDataCalculated}
                />
              )}

              {/* Editable Permits & Escort Costs Table */}
              {editablePermitCosts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Permit & Escort Costs
                    </CardTitle>
                    <CardDescription>
                      Edit the calculated costs as needed. These values will appear in the quote.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-medium">State</th>
                            <th className="text-left py-2 px-2 font-medium">Distance</th>
                            <th className="text-right py-2 px-2 font-medium">Permit Fee</th>
                            <th className="text-right py-2 px-2 font-medium">Escort Cost</th>
                            <th className="text-right py-2 px-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editablePermitCosts.map((permit) => (
                            <tr key={permit.id} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-2">
                                <div className="font-medium">{permit.stateName}</div>
                                <div className="text-xs text-muted-foreground">{permit.stateCode}</div>
                              </td>
                              <td className="py-2 px-2 text-muted-foreground">
                                {permit.distanceMiles?.toFixed(0) || '—'} mi
                              </td>
                              <td className="py-2 px-2">
                                <div className="relative w-28 ml-auto">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                  <Input
                                    className="pl-5 text-right font-mono h-8 text-sm"
                                    value={formatWholeDollars(permit.permitFee)}
                                    onChange={(e) => updatePermitCost(permit.id, 'permitFee', parseWholeDollarsToCents(e.target.value))}
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <div className="relative w-28 ml-auto">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                  <Input
                                    className="pl-5 text-right font-mono h-8 text-sm"
                                    value={formatWholeDollars(permit.escortCost)}
                                    onChange={(e) => updatePermitCost(permit.id, 'escortCost', parseWholeDollarsToCents(e.target.value))}
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-medium">
                                {formatCurrency(permit.permitFee + permit.escortCost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 font-medium">
                            <td colSpan={2} className="py-3 px-2">Total</td>
                            <td className="py-3 px-2 text-right font-mono">
                              {formatCurrency(permitTotals.permits)}
                            </td>
                            <td className="py-3 px-2 text-right font-mono">
                              {formatCurrency(permitTotals.escorts)}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-primary">
                              {formatCurrency(permitTotals.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Values are calculated estimates. Edit as needed to reflect actual costs.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('pricing')}>
                  Back
                </Button>
                <Button onClick={() => setActiveTab('pdf')} className="flex-1">
                  Continue to PDF
                </Button>
              </div>
            </TabsContent>

            {/* PDF Preview Tab - Automatic */}
            <TabsContent value="pdf" className="space-y-4 mt-4">
              {pdfData ? (
                <QuotePDFPreview data={pdfData} />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center">Loading PDF preview...</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setActiveTab('permits')}>
                  Back to Permits
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route Summary */}
              {(pickupAddress || dropoffAddress) && (
                <div className="space-y-2">
                  {pickupAddress && (
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">From:</span>{' '}
                      {pickupCity || pickupAddress}
                      {pickupState && `, ${pickupState}`}
                    </div>
                  )}
                  {dropoffAddress && (
                    <div className="text-sm">
                      <span className="text-red-600 font-medium">To:</span>{' '}
                      {dropoffCity || dropoffAddress}
                      {dropoffState && `, ${dropoffState}`}
                    </div>
                  )}
                  {distanceMiles && (
                    <div className="text-sm text-muted-foreground">
                      Distance: {distanceMiles.toLocaleString()} miles
                    </div>
                  )}
                </div>
              )}

              {/* Cargo Summary */}
              {cargoItems.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Cargo</div>
                    <div className="text-sm text-muted-foreground">
                      {cargoItems.reduce((sum, i) => sum + i.quantity, 0)} items
                      {loadPlan && (
                        <>
                          {' '}
                          &bull; {(loadPlan.totalWeight / 1000).toFixed(1)}k lbs
                        </>
                      )}
                    </div>
                    {loadPlan && (
                      <Badge variant="outline">
                        {loadPlan.totalTrucks} truck{loadPlan.totalTrucks > 1 ? 's' : ''} needed
                      </Badge>
                    )}
                  </div>
                </>
              )}

              {/* Services Summary */}
              {serviceItems.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Services ({serviceItems.length})</div>
                    {serviceItems.slice(0, 4).map((s) => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className="font-mono">{formatCurrency(s.total)}</span>
                      </div>
                    ))}
                    {serviceItems.length > 4 && (
                      <div className="text-sm text-muted-foreground">
                        +{serviceItems.length - 4} more...
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold font-mono text-primary">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              <div className="text-sm text-muted-foreground text-center pt-2">
                {formatDate(new Date())}
              </div>
            </CardContent>
          </Card>

          {/* Route Map - Always visible in sidebar */}
          <SimpleRouteMap
            origin={pickupAddress}
            destination={dropoffAddress}
            existingDistanceMiles={distanceMiles}
            existingDurationMinutes={durationMinutes}
            existingPolyline={routePolyline}
            onRouteCalculated={(data) => {
              // Set basic route data from the map
              // RouteIntelligence will auto-calculate permits when it sees the addresses
              setDistanceMiles(data.distanceMiles)
              setDurationMinutes(data.durationMinutes)
              setRoutePolyline(data.polyline)
            }}
          />
        </div>
      </div>
    </div>
  )
}
