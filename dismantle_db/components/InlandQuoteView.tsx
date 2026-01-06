'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, InlandQuote, InlandAccessorialType, InlandEquipmentType, InlandRateSettings, ParsedAddress, RouteResult, InlandQuoteFormData, InlandSavedLane, InlandServiceItem, InlandCargoItem, InlandLoadBlock, InlandLoadType, InlandServiceType, InlandAccessorialCharge, AccessorialBillingUnit, Customer, CompanySettings, InlandDestinationBlock, RateLookup, EquipmentDimensions, Contact, Company } from '@/lib/supabase'

// Type for contact with company info for dropdown
interface ContactWithCompany extends Contact {
  company?: Company | null
}
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete'
import RouteMap from './RouteMap'
import PdfPreview from './PdfPreview'
import { generateInlandQuotePdf } from '@/lib/inlandQuoteGenerator'
import { parseEmailSignature } from '@/lib/emailSignatureParser'
import html2canvas from 'html2canvas'

// Generate quote number
function generateQuoteNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `IT-${year}${month}${day}-${random}`
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// Billing unit labels
const BILLING_UNIT_LABELS: Record<AccessorialBillingUnit, string> = {
  flat: 'Flat Fee',
  hour: '/Hour',
  day: '/Day',
  way: '/Way',
  week: '/Week',
  month: '/Month',
  stop: '/Stop',
}

// Billing unit options for dropdown
const BILLING_UNIT_OPTIONS: { value: AccessorialBillingUnit; label: string }[] = [
  { value: 'flat', label: 'Flat Fee' },
  { value: 'hour', label: 'Per Hour' },
  { value: 'day', label: 'Per Day' },
  { value: 'way', label: 'Per Way' },
  { value: 'week', label: 'Per Week' },
  { value: 'month', label: 'Per Month' },
  { value: 'stop', label: 'Per Stop' },
]

// Convert SVG to PNG using canvas (for better compatibility with PDF and display)
function convertSvgToPng(svgDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // Use reasonable dimensions for the converted image
      const scale = 2 // Higher quality
      canvas.width = img.width * scale || 800
      canvas.height = img.height * scale || 600
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }
    img.onerror = () => {
      reject(new Error('Failed to load SVG image'))
    }
    img.src = svgDataUrl
  })
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Default dimension conversion thresholds (can be overridden by settings)
const DEFAULT_DIMENSION_THRESHOLDS = {
  length: 70,   // Values > 70 treated as inches (typical lengths are 20-53 ft)
  width: 16,    // Values > 16 treated as inches (typical widths are 8-10 ft)
  height: 18,   // Values > 18 treated as inches (typical heights are 8-14 ft)
}

// Convert total inches to ft.in string format
function inchesToFtInString(totalInches: number): string {
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  if (inches === 0) return `${feet}`
  return `${feet}.${inches}`
}

// Parse input and smartly detect if it's inches or ft.in format
// Returns total inches
function parseSmartDimensionWithThresholds(
  value: string,
  dimensionType: 'length' | 'width' | 'height',
  thresholds: { length: number; width: number; height: number }
): number | null {
  if (!value || value.trim() === '') return null

  const trimmed = value.trim()

  // If contains a dot, treat as ft.in format
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.')
    const feet = parseInt(parts[0]) || 0
    const inches = parseInt(parts[1]) || 0
    return feet * 12 + inches
  }

  // Single number - check threshold to determine if inches or feet
  const numValue = parseFloat(trimmed)
  if (isNaN(numValue)) return null

  const threshold = thresholds[dimensionType]
  if (numValue > threshold) {
    // Treat as inches
    return Math.round(numValue)
  } else {
    // Treat as feet, convert to inches
    return Math.round(numValue * 12)
  }
}

// Dimension unit options
const DIMENSION_UNITS = [
  { value: 'ft.in', label: 'ft.in' },
  { value: 'in', label: 'in' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
]

// Weight unit options
const WEIGHT_UNITS = [
  { value: 'lbs', label: 'lbs' },
  { value: 'kg', label: 'kg' },
]

// Convert dimension value to inches based on selected unit
function convertToInches(value: number, unit: string): number {
  switch (unit) {
    case 'in': return Math.round(value)
    case 'cm': return Math.round(value / 2.54)
    case 'm': return Math.round(value * 39.3701)
    case 'ft.in':
    default:
      // ft.in format: integer part = feet, decimal part = inches
      const feet = Math.floor(value)
      const inches = Math.round((value - feet) * 10) // .3 means 3 inches
      return feet * 12 + inches
  }
}

// Convert weight to lbs based on selected unit
function convertToLbs(value: number, unit: string): number {
  switch (unit) {
    case 'kg': return Math.round(value * 2.20462)
    case 'lbs':
    default: return Math.round(value)
  }
}

// Cargo type options
const CARGO_TYPES = [
  'General Freight',
  'Machinery',
  'Construction Equipment',
  'Agricultural Equipment',
  'Vehicles',
  'Steel/Metal',
  'Lumber/Wood',
  'Containers',
  'Oversized Load',
  'Hazmat',
  'Refrigerated',
  'Other',
]

// Default truck type specifications (industry standards) - used when DB values are not set
// These are fallback values based on US DOT legal limits
const DEFAULT_TRUCK_SPECS: Record<string, { maxWeight: number; maxLength: number; maxWidth: number; maxHeight: number; priority: number }> = {
  // Enclosed trailers - good for weather protection, lower height
  'dry van': { maxWeight: 45000, maxLength: 636, maxWidth: 102, maxHeight: 108, priority: 1 },
  'reefer': { maxWeight: 42500, maxLength: 636, maxWidth: 96, maxHeight: 103, priority: 2 },
  // Open deck trailers - sorted by deck height (flatbed highest, RGN lowest)
  'flatbed': { maxWeight: 48000, maxLength: 636, maxWidth: 102, maxHeight: 102, priority: 3 },
  'step deck': { maxWeight: 44000, maxLength: 636, maxWidth: 102, maxHeight: 120, priority: 4 },
  'double drop': { maxWeight: 40000, maxLength: 348, maxWidth: 102, maxHeight: 138, priority: 5 },
  'lowboy': { maxWeight: 40000, maxLength: 348, maxWidth: 102, maxHeight: 144, priority: 6 },
  'rgn': { maxWeight: 42000, maxLength: 636, maxWidth: 102, maxHeight: 140, priority: 7 },
  // Specialized
  'hotshot': { maxWeight: 16500, maxLength: 480, maxWidth: 102, maxHeight: 102, priority: 0 },
  'sprinter van': { maxWeight: 3500, maxLength: 180, maxWidth: 70, maxHeight: 64, priority: -1 },
  'box truck': { maxWeight: 10000, maxLength: 312, maxWidth: 96, maxHeight: 96, priority: 0 },
}

// Truck recommendation result type
interface TruckRecommendation {
  recommendedId: string | null
  reason: string
  requirements: { totalWeight: number; maxLength: number; maxWidth: number; maxHeight: number }
  multiTruckSuggestion?: {
    needsMultipleTrucks: boolean
    trucksNeeded: number
    truckBreakdown: { truckType: string; truckTypeId: string; count: number; cargoIndices: number[] }[]
    suggestion: string
  }
}

// Helper to get truck specs (from DB or defaults) - used by recommendation logic
function getTruckSpecs(type: InlandEquipmentType) {
  const nameLower = type.name.toLowerCase()
  const defaultSpec = Object.entries(DEFAULT_TRUCK_SPECS).find(([key]) => nameLower.includes(key))?.[1]
  return {
    maxWeight: type.max_weight_lbs || defaultSpec?.maxWeight || 48000,
    maxLength: type.max_length_inches || defaultSpec?.maxLength || 636,
    maxWidth: type.max_width_inches || defaultSpec?.maxWidth || 102,
    maxHeight: type.max_height_inches || defaultSpec?.maxHeight || 108,
    priority: defaultSpec?.priority ?? 99,
    name: type.name,
    id: type.id,
  }
}

// Check if a single cargo item fits on a specific truck
function cargoFitsOnTruck(cargo: InlandCargoItem, truckSpecs: ReturnType<typeof getTruckSpecs>): boolean {
  const weight = cargo.weight_lbs || 0
  const length = cargo.length_inches || 0
  const width = cargo.width_inches || 0
  const height = cargo.height_inches || 0

  return (
    (weight === 0 || truckSpecs.maxWeight >= weight) &&
    (length === 0 || truckSpecs.maxLength >= length) &&
    (width === 0 || truckSpecs.maxWidth >= width) &&
    (height === 0 || truckSpecs.maxHeight >= height)
  )
}

// Recommend the best truck type based on cargo dimensions
// Returns the equipment type ID that best fits the cargo, or null if none fit
// Also provides multi-truck suggestions when a single truck can't handle everything
function recommendTruckType(
  cargoItems: InlandCargoItem[],
  equipmentTypes: InlandEquipmentType[]
): TruckRecommendation {
  if (!cargoItems || cargoItems.length === 0 || !equipmentTypes || equipmentTypes.length === 0) {
    return { recommendedId: null, reason: 'No cargo items', requirements: { totalWeight: 0, maxLength: 0, maxWidth: 0, maxHeight: 0 } }
  }

  // Calculate cargo requirements
  const totalWeight = cargoItems.reduce((sum, c) => sum + (c.weight_lbs || 0), 0)
  const maxLength = Math.max(...cargoItems.map(c => c.length_inches || 0))
  const maxWidth = Math.max(...cargoItems.map(c => c.width_inches || 0))
  const maxHeight = Math.max(...cargoItems.map(c => c.height_inches || 0))
  const requirements = { totalWeight, maxLength, maxWidth, maxHeight }

  if (totalWeight === 0 && maxLength === 0 && maxWidth === 0 && maxHeight === 0) {
    return { recommendedId: null, reason: 'No dimensions specified', requirements }
  }

  // Get active equipment types with their limits
  const activeTypes = equipmentTypes.filter(t => t.is_active)
  const typesWithSpecs = activeTypes.map(type => ({ type, specs: getTruckSpecs(type) }))
    .sort((a, b) => {
      // Sort by priority first (smaller = cheaper/more common)
      if (a.specs.priority !== b.specs.priority) return a.specs.priority - b.specs.priority
      return a.specs.maxWeight - b.specs.maxWeight
    })

  // Find trucks that can handle the ENTIRE load in one trip
  const singleTruckCandidates = typesWithSpecs.filter(({ specs }) =>
    (totalWeight === 0 || specs.maxWeight >= totalWeight) &&
    (maxLength === 0 || specs.maxLength >= maxLength) &&
    (maxWidth === 0 || specs.maxWidth >= maxWidth) &&
    (maxHeight === 0 || specs.maxHeight >= maxHeight)
  )

  // If one truck can handle everything, recommend it
  if (singleTruckCandidates.length > 0) {
    const best = singleTruckCandidates[0]
    let reason = best.type.name

    // Add helpful context
    if (maxHeight > 102) {
      reason = `${best.type.name} (${Math.round(maxHeight/12)}'H cargo)`
    } else if (totalWeight > 40000) {
      reason = `${best.type.name} (${totalWeight.toLocaleString()} lbs)`
    }

    return { recommendedId: best.type.id, reason, requirements }
  }

  // MULTI-TRUCK LOGIC: No single truck can handle it all
  // Analyze each cargo item individually to assign to optimal trucks
  const cargoAssignments: { cargoIndex: number; cargo: InlandCargoItem; bestTruck: typeof typesWithSpecs[0] | null }[] = []

  cargoItems.forEach((cargo, idx) => {
    // Find the best truck for this individual cargo item
    const fittingTrucks = typesWithSpecs.filter(({ specs }) => cargoFitsOnTruck(cargo, specs))
    cargoAssignments.push({
      cargoIndex: idx,
      cargo,
      bestTruck: fittingTrucks.length > 0 ? fittingTrucks[0] : null
    })
  })

  // Check if any cargo item doesn't fit on ANY truck (truly oversized)
  const oversizedCargo = cargoAssignments.filter(a => !a.bestTruck)
  if (oversizedCargo.length > 0) {
    const firstOversized = oversizedCargo[0].cargo
    return {
      recommendedId: null,
      reason: `Item ${oversizedCargo[0].cargoIndex + 1} exceeds all truck limits (${(firstOversized.weight_lbs || 0).toLocaleString()} lbs, ${Math.round((firstOversized.height_inches || 0)/12)}'H)`,
      requirements,
      multiTruckSuggestion: {
        needsMultipleTrucks: true,
        trucksNeeded: 0,
        truckBreakdown: [],
        suggestion: 'Some cargo items require specialized/oversized hauling'
      }
    }
  }

  // Group cargo by optimal truck type
  const truckGroups: Record<string, { truckType: typeof typesWithSpecs[0]; cargoIndices: number[]; totalWeight: number }> = {}

  cargoAssignments.forEach(({ cargoIndex, cargo, bestTruck }) => {
    if (!bestTruck) return
    const truckId = bestTruck.type.id
    if (!truckGroups[truckId]) {
      truckGroups[truckId] = { truckType: bestTruck, cargoIndices: [], totalWeight: 0 }
    }
    truckGroups[truckId].cargoIndices.push(cargoIndex)
    truckGroups[truckId].totalWeight += cargo.weight_lbs || 0
  })

  // Calculate how many of each truck type we need based on weight capacity
  const truckBreakdown: { truckType: string; truckTypeId: string; count: number; cargoIndices: number[] }[] = []
  let totalTrucksNeeded = 0

  Object.values(truckGroups).forEach(group => {
    const trucksForWeight = Math.ceil(group.totalWeight / group.truckType.specs.maxWeight)
    // At minimum, we need 1 truck per distinct item if they can't share
    const trucksForItems = group.cargoIndices.length
    const trucksNeeded = Math.max(trucksForWeight, Math.ceil(trucksForItems / 2)) // Assume max 2 items per truck for non-specialized loads

    truckBreakdown.push({
      truckType: group.truckType.type.name,
      truckTypeId: group.truckType.type.id,
      count: trucksNeeded,
      cargoIndices: group.cargoIndices
    })
    totalTrucksNeeded += trucksNeeded
  })

  // Build suggestion string
  const suggestionParts = truckBreakdown.map(b => `${b.count}x ${b.truckType}`)
  const suggestion = suggestionParts.join(' + ')

  // Recommend the most common truck type in our breakdown
  const primaryTruck = truckBreakdown.sort((a, b) => b.count - a.count)[0]

  return {
    recommendedId: primaryTruck?.truckTypeId || null,
    reason: `Need ${totalTrucksNeeded} trucks: ${suggestion}`,
    requirements,
    multiTruckSuggestion: {
      needsMultipleTrucks: true,
      trucksNeeded: totalTrucksNeeded,
      truckBreakdown,
      suggestion
    }
  }
}

// Create default destination block
const createDefaultDestinationBlock = (name: string = 'Destination A'): InlandDestinationBlock => ({
  id: generateId(),
  name,
  pickup: null,
  dropoff: null,
  stops: [],
  route: null,
  map_image_base64: null,
  load_blocks: [],
  internal_notes: '',
  customer_notes: '',
  special_instructions: '',
  rate_per_mile: 3.50,
  base_rate: 0,
  fuel_surcharge_percent: 15,
  margin_percentage: 15,
  manual_total: null,
  use_manual_pricing: false,
})

// Create default load block
const createDefaultLoadBlock = (): InlandLoadBlock => ({
  id: generateId(),
  truck_type_id: '',
  cargo_items: [],
  service_items: [],
  accessorial_charges: [],
  load_image_base64: null,
  notes: '',
})

// Default form data
const defaultFormData: InlandQuoteFormData = {
  // Client Information
  client_name: '',
  client_company: '',
  client_email: '',
  client_phone: '',
  client_address: '',
  billing_address: '',
  billing_city: '',
  billing_state: '',
  billing_zip: '',
  payment_terms: 'Net 30',
  work_order_number: '',
  // Destination blocks (new multi-destination system)
  destination_blocks: [createDefaultDestinationBlock('Destination A')],
  // Legacy fields for backward compatibility
  pickup: null,
  dropoff: null,
  route: null,
  rate_per_mile: 3.50,
  base_rate: 0,
  fuel_surcharge_percent: 15,
  margin_percentage: 15,
  manual_total: null,
  use_manual_pricing: false,
  equipment_type_id: '',
  equipment_description: '',
  weight_lbs: null,
  internal_notes: '',
  customer_notes: '',
  special_instructions: '',
  accessorial_charges: [],
  stops: [],
  service_items: [],
  cargo_items: [],
  load_image_base64: null,
  load_blocks: [],
}

// Props for editing an existing quote
interface InlandQuoteViewProps {
  editQuote?: {
    quoteNumber: string
    formData: InlandQuoteFormData
    quoteId: string
  } | null
  onClearEdit?: () => void
}

export default function InlandQuoteView({ editQuote, onClearEdit }: InlandQuoteViewProps = {}) {
  const [formData, setFormData] = useState<InlandQuoteFormData>(defaultFormData)
  const [accessorialTypes, setAccessorialTypes] = useState<InlandAccessorialType[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<InlandEquipmentType[]>([])
  const [rateSettings, setRateSettings] = useState<InlandRateSettings | null>(null)
  const [savedLanes, setSavedLanes] = useState<InlandSavedLane[]>([])
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAccessorialModal, setShowAccessorialModal] = useState(false)
  const [showSavedLanesModal, setShowSavedLanesModal] = useState(false)
  const [showSignatureParser, setShowSignatureParser] = useState(false)
  const [showAccessorialSettings, setShowAccessorialSettings] = useState(false)
  const [signatureText, setSignatureText] = useState('')
  const [quoteNumber, setQuoteNumber] = useState(generateQuoteNumber())
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [editingAccessorialType, setEditingAccessorialType] = useState<InlandAccessorialType | null>(null)
  const [newAccessorialType, setNewAccessorialType] = useState({ name: '', description: '', default_amount: 0, is_percentage: false })

  // PDF Preview state
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(true)
  const pdfGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  // Customer management - now uses contacts with companies
  const [customers, setCustomers] = useState<Customer[]>([])
  const [contacts, setContacts] = useState<ContactWithCompany[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({})
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Load types management
  const [loadTypes, setLoadTypes] = useState<InlandLoadType[]>([])
  const [showLoadTypesSettings, setShowLoadTypesSettings] = useState(false)
  const [newLoadType, setNewLoadType] = useState({ name: '', description: '' })

  // Service types for rates dropdown
  const [serviceTypes, setServiceTypes] = useState<InlandServiceType[]>([])

  // Active load block for accessorial modal
  const [activeLoadBlockId, setActiveLoadBlockId] = useState<string | null>(null)

  // Custom on-the-fly creation state
  const [customTruckInput, setCustomTruckInput] = useState<Record<string, string>>({}) // blockId -> custom truck name
  const [customCargoTypeInput, setCustomCargoTypeInput] = useState<Record<string, string>>({}) // cargoId -> custom cargo type
  const [customAccessorialName, setCustomAccessorialName] = useState('')
  const [customAccessorialAmount, setCustomAccessorialAmount] = useState(0)
  const [customAccessorialBillingUnit, setCustomAccessorialBillingUnit] = useState<AccessorialBillingUnit>('flat')

  // Dimension thresholds (loaded from company settings)
  const [dimensionThresholds, setDimensionThresholds] = useState(DEFAULT_DIMENSION_THRESHOLDS)

  // Equipment lookup state (for cargo items in equipment mode)
  const [equipmentRates, setEquipmentRates] = useState<RateLookup[]>([])
  const [equipmentMakes, setEquipmentMakes] = useState<string[]>([])
  const [equipmentModelsMap, setEquipmentModelsMap] = useState<Record<string, { model: string; modelId: string }[]>>({})

  // Truck recommendation state - tracks recommendations and whether user has manually overridden
  const [truckRecommendations, setTruckRecommendations] = useState<Record<string, {
    recommendedId: string | null
    reason: string
    isManualOverride: boolean
    multiTruckSuggestion?: TruckRecommendation['multiTruckSuggestion']
  }>>({})

  // Helper function to parse dimensions with current thresholds
  const parseSmartDimension = (value: string, dimensionType: 'length' | 'width' | 'height') => {
    return parseSmartDimensionWithThresholds(value, dimensionType, dimensionThresholds)
  }

  // Capture map as base64 image
  const captureMapImage = async (): Promise<string | undefined> => {
    // Check for destination blocks with addresses OR legacy addresses
    const hasDestinationBlocks = formData.destination_blocks && formData.destination_blocks.length > 0
    const hasValidDestination = hasDestinationBlocks && formData.destination_blocks.some(d => d.pickup && d.dropoff)
    const hasLegacyRoute = formData.pickup && formData.dropoff

    if (!mapContainerRef.current || (!hasValidDestination && !hasLegacyRoute)) {
      return undefined
    }

    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // Higher resolution
        logging: false,
        backgroundColor: '#ffffff',
      })
      return canvas.toDataURL('image/png')
    } catch (err) {
      console.error('Error capturing map:', err)
      return undefined
    }
  }

  // Generate PDF preview with debouncing
  const generatePdfPreview = useCallback(async () => {
    // Check if we have destination blocks with addresses OR legacy addresses
    const hasDestinationBlocks = formData.destination_blocks && formData.destination_blocks.length > 0
    const hasValidDestination = hasDestinationBlocks && formData.destination_blocks.some(d => d.pickup && d.dropoff)
    const hasLegacyRoute = formData.pickup && formData.dropoff

    if (!hasValidDestination && !hasLegacyRoute) {
      setPdfBlob(null)
      return
    }

    setIsGeneratingPdf(true)
    try {
      // Collect all accessorial charges from destination blocks, load blocks AND top-level
      const allAccessorialCharges = [
        ...formData.accessorial_charges,
        ...formData.load_blocks.flatMap(block => block.accessorial_charges),
        ...formData.destination_blocks.flatMap(d => d.load_blocks.flatMap(block => block.accessorial_charges))
      ]

      // Calculate service items total from all sources
      const serviceItemsTotal = formData.service_items.reduce((sum, item) => sum + (item.price * item.quantity), 0) +
        formData.load_blocks.reduce((sum, block) =>
          sum + block.service_items.reduce((s, item) => s + (item.price * item.quantity), 0), 0) +
        formData.destination_blocks.reduce((sum, dest) =>
          sum + dest.load_blocks.reduce((dSum, block) =>
            dSum + block.service_items.reduce((s, item) => s + (item.price * item.quantity), 0), 0), 0)

      const totals = {
        lineHaul: 0,
        fuelSurcharge: 0,
        accessorialTotal: allAccessorialCharges.reduce((sum, charge) => {
          const quantity = charge.quantity || 1
          if (charge.is_percentage) {
            return sum + serviceItemsTotal * (charge.amount / 100) * quantity
          }
          return sum + (charge.amount * quantity)
        }, 0),
        serviceItemsTotal,
        subtotal: serviceItemsTotal,
        marginAmount: 0,
        total: serviceItemsTotal,
      }

      // Capture map image for PDF
      const mapImage = await captureMapImage()

      const blob = await generateInlandQuotePdf({
        quoteNumber,
        formData,
        totals,
        route: hasDestinationBlocks ? formData.destination_blocks[0].route : formData.route,
        equipmentType: equipmentTypes.find((e) => e.id === formData.equipment_type_id),
        accessorialCharges: allAccessorialCharges,
        mapImage,
      })
      setPdfBlob(blob)
    } catch (err) {
      console.error('Error generating PDF preview:', err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }, [formData, quoteNumber, equipmentTypes])

  // Debounced PDF generation when form data changes
  useEffect(() => {
    if (showPdfPreview) {
      // Clear any pending generation
      if (pdfGenerationTimeoutRef.current) {
        clearTimeout(pdfGenerationTimeoutRef.current)
      }

      // Debounce PDF generation by 1000ms to prevent flashing
      pdfGenerationTimeoutRef.current = setTimeout(() => {
        generatePdfPreview()
      }, 1000)

      return () => {
        if (pdfGenerationTimeoutRef.current) {
          clearTimeout(pdfGenerationTimeoutRef.current)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, showPdfPreview])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Load edit quote data when editQuote prop changes
  useEffect(() => {
    if (editQuote) {
      setQuoteNumber(editQuote.quoteNumber)
      setEditingQuoteId(editQuote.quoteId)
      setFormData(editQuote.formData)
      setSuccessMessage(null)
      setError(null)
    }
  }, [editQuote])

  // Reset form function
  const resetForm = () => {
    setFormData(defaultFormData)
    setQuoteNumber(generateQuoteNumber())
    setEditingQuoteId(null)
    setSelectedCustomerId('')
    setPdfBlob(null)
    if (onClearEdit) {
      onClearEdit()
    }
  }

  const loadData = async () => {
    try {
      // Load accessorial types
      const { data: accessorials } = await supabase
        .from('inland_accessorial_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (accessorials) setAccessorialTypes(accessorials)

      // Load equipment types
      const { data: equipment } = await supabase
        .from('inland_equipment_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (equipment) setEquipmentTypes(equipment)

      // Load rate settings
      const { data: settings } = await supabase
        .from('inland_rate_settings')
        .select('*')
        .single()

      if (settings) {
        setRateSettings(settings)
        setFormData((prev) => ({
          ...prev,
          rate_per_mile: settings.default_rate_per_mile,
          fuel_surcharge_percent: settings.fuel_surcharge_percent,
          margin_percentage: settings.default_margin_percent,
        }))
      }

      // Load saved lanes
      const { data: lanes } = await supabase
        .from('inland_saved_lanes')
        .select('*')
        .order('use_count', { ascending: false })
        .limit(10)

      if (lanes) setSavedLanes(lanes)

      // Load customers (legacy)
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (customersData) setCustomers(customersData)

      // Fetch contacts with their companies
      const { data: contactsData } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(*)
        `)
        .order('first_name')

      if (contactsData) {
        setContacts(contactsData as ContactWithCompany[])
      }

      // Fetch all companies for dropdown
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (companiesData) {
        setCompanies(companiesData)
      }

      // Load load types (if table exists)
      const { data: loadTypesData } = await supabase
        .from('inland_load_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (loadTypesData) setLoadTypes(loadTypesData)

      // Load service types for rates dropdown
      const { data: serviceTypesData } = await supabase
        .from('inland_service_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (serviceTypesData && serviceTypesData.length > 0) {
        setServiceTypes(serviceTypesData)
      } else {
        // Use default service types if none in database
        const defaultServiceTypes: InlandServiceType[] = [
          { id: 'default-1', name: 'Line Haul', description: 'Primary transportation charge', default_price: null, is_active: true, sort_order: 0, created_at: '', updated_at: '' },
          { id: 'default-2', name: 'Drayage', description: 'Short-distance hauling (port/rail to warehouse)', default_price: null, is_active: true, sort_order: 1, created_at: '', updated_at: '' },
          { id: 'default-3', name: 'Inland Transportation', description: 'Overland freight movement', default_price: null, is_active: true, sort_order: 2, created_at: '', updated_at: '' },
          { id: 'default-4', name: 'Loading', description: 'Loading cargo onto transport', default_price: null, is_active: true, sort_order: 3, created_at: '', updated_at: '' },
          { id: 'default-5', name: 'Unloading', description: 'Unloading cargo from transport', default_price: null, is_active: true, sort_order: 4, created_at: '', updated_at: '' },
          { id: 'default-6', name: 'Fuel Surcharge', description: 'Fuel cost adjustment', default_price: null, is_active: true, sort_order: 5, created_at: '', updated_at: '' },
          { id: 'default-7', name: 'Flatbed Service', description: 'Flatbed trailer transportation', default_price: null, is_active: true, sort_order: 6, created_at: '', updated_at: '' },
          { id: 'default-8', name: 'Lowboy Service', description: 'Lowboy trailer for heavy equipment', default_price: null, is_active: true, sort_order: 7, created_at: '', updated_at: '' },
          { id: 'default-9', name: 'Step Deck Service', description: 'Step deck trailer transportation', default_price: null, is_active: true, sort_order: 8, created_at: '', updated_at: '' },
          { id: 'default-10', name: 'Oversized Load', description: 'Permit and escort for oversized cargo', default_price: null, is_active: true, sort_order: 9, created_at: '', updated_at: '' },
          { id: 'default-11', name: 'Pilot Car / Escort', description: 'Safety escort vehicle service', default_price: null, is_active: true, sort_order: 10, created_at: '', updated_at: '' },
          { id: 'default-12', name: 'Tarp Service', description: 'Tarping and covering cargo', default_price: null, is_active: true, sort_order: 11, created_at: '', updated_at: '' },
        ]
        setServiceTypes(defaultServiceTypes)
      }

      // Load equipment rates for cargo item equipment mode
      const { data: ratesData } = await supabase
        .from('rates')
        .select('id, make_id, model_id, price, notes, updated_at, make:makes(name), model:models(name)')
        .order('make_id')

      if (ratesData) {
        // Transform to RateLookup format
        const rates: RateLookup[] = ratesData.map(r => ({
          id: r.id,
          make_id: r.make_id,
          model_id: r.model_id,
          price: r.price,
          notes: r.notes,
          updated_at: r.updated_at,
          make: (r.make as unknown as { name: string })?.name || '',
          model: (r.model as unknown as { name: string })?.name || ''
        }))
        setEquipmentRates(rates)

        // Build makes list
        const uniqueMakes = [...new Set(rates.map(r => r.make))].filter(Boolean).sort()
        setEquipmentMakes(uniqueMakes)

        // Build models map by make
        const modelsMap: Record<string, { model: string; modelId: string }[]> = {}
        rates.forEach(r => {
          if (r.make && r.model) {
            if (!modelsMap[r.make]) modelsMap[r.make] = []
            if (!modelsMap[r.make].find(m => m.modelId === r.model_id)) {
              modelsMap[r.make].push({ model: r.model, modelId: r.model_id })
            }
          }
        })
        // Sort models within each make
        Object.keys(modelsMap).forEach(make => {
          modelsMap[make].sort((a, b) => a.model.localeCompare(b.model))
        })
        setEquipmentModelsMap(modelsMap)
      }

      // Load company settings for dimension thresholds
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('dimension_threshold_length, dimension_threshold_width, dimension_threshold_height')
        .single()

      if (companySettings) {
        setDimensionThresholds({
          length: companySettings.dimension_threshold_length ?? DEFAULT_DIMENSION_THRESHOLDS.length,
          width: companySettings.dimension_threshold_width ?? DEFAULT_DIMENSION_THRESHOLDS.width,
          height: companySettings.dimension_threshold_height ?? DEFAULT_DIMENSION_THRESHOLDS.height,
        })
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  // Fetch equipment dimensions for a specific model
  const fetchEquipmentDimensions = async (modelId: string): Promise<EquipmentDimensions | null> => {
    try {
      const { data, error } = await supabase
        .from('equipment_dimensions')
        .select('*')
        .eq('model_id', modelId)
        .single()

      if (error || !data) return null
      return data
    } catch (err) {
      console.error('Error fetching equipment dimensions:', err)
      return null
    }
  }

  // Handle equipment selection for a cargo item
  const handleEquipmentSelect = async (
    blockId: string,
    cargoId: string,
    make: string,
    model: string,
    modelId: string
  ) => {
    // Update basic info immediately
    updateCargoItemInBlock(blockId, cargoId, 'equipment_make', make)
    updateCargoItemInBlock(blockId, cargoId, 'equipment_model', model)
    updateCargoItemInBlock(blockId, cargoId, 'equipment_model_id', modelId)
    updateCargoItemInBlock(blockId, cargoId, 'description', `${make} ${model}`)
    updateCargoItemInBlock(blockId, cargoId, 'cargo_type', 'Equipment')

    // Fetch and populate dimensions
    const dimensions = await fetchEquipmentDimensions(modelId)
    if (dimensions) {
      updateCargoItemInBlock(blockId, cargoId, 'weight_lbs', dimensions.operating_weight)
      updateCargoItemInBlock(blockId, cargoId, 'length_inches', dimensions.transport_length)
      updateCargoItemInBlock(blockId, cargoId, 'width_inches', dimensions.transport_width)
      updateCargoItemInBlock(blockId, cargoId, 'height_inches', dimensions.transport_height)
      updateCargoItemInBlock(blockId, cargoId, 'front_image_base64', dimensions.front_image_base64)
      updateCargoItemInBlock(blockId, cargoId, 'side_image_base64', dimensions.side_image_base64)
    }
  }

  // Toggle equipment mode for a cargo item
  const toggleCargoEquipmentMode = (blockId: string, cargoId: string, isEquipment: boolean) => {
    updateCargoItemInBlock(blockId, cargoId, 'is_equipment', isEquipment)
    if (!isEquipment) {
      // Clear equipment-specific fields when turning off
      updateCargoItemInBlock(blockId, cargoId, 'equipment_make', null)
      updateCargoItemInBlock(blockId, cargoId, 'equipment_model', null)
      updateCargoItemInBlock(blockId, cargoId, 'equipment_model_id', null)
      updateCargoItemInBlock(blockId, cargoId, 'is_custom_equipment', false)
      updateCargoItemInBlock(blockId, cargoId, 'front_image_base64', null)
      updateCargoItemInBlock(blockId, cargoId, 'side_image_base64', null)
    }
  }

  // Calculate route when pickup and dropoff are set
  const calculateRoute = useCallback(async () => {
    if (!formData.pickup || !formData.dropoff) return

    setIsCalculatingRoute(true)
    setError(null)

    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: formData.pickup.lat, lng: formData.pickup.lng },
          destination: { lat: formData.dropoff.lat, lng: formData.dropoff.lng },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to calculate route')
      }

      const route: RouteResult = await response.json()
      setFormData((prev) => ({ ...prev, route }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate route')
    } finally {
      setIsCalculatingRoute(false)
    }
  }, [formData.pickup, formData.dropoff])

  // Calculate route for a specific destination block
  const calculateRouteForDestination = useCallback(async (destinationId: string) => {
    const destination = formData.destination_blocks.find(d => d.id === destinationId)
    if (!destination?.pickup || !destination?.dropoff) return

    setIsCalculatingRoute(true)
    setError(null)

    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: destination.pickup.lat, lng: destination.pickup.lng },
          destination: { lat: destination.dropoff.lat, lng: destination.dropoff.lng },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to calculate route')
      }

      const route: RouteResult = await response.json()
      updateDestinationBlock(destinationId, { route })

      // Capture map image after route is calculated (with delay to let map render)
      setTimeout(async () => {
        if (mapContainerRef.current) {
          try {
            const canvas = await html2canvas(mapContainerRef.current, {
              useCORS: true,
              allowTaint: true,
              scale: 2,
              logging: false,
              backgroundColor: '#ffffff',
            })
            const mapImage = canvas.toDataURL('image/png')
            updateDestinationBlock(destinationId, { map_image_base64: mapImage })
          } catch (err) {
            console.error('Error capturing map for destination:', err)
          }
        }
      }, 1500) // Wait 1.5s for map to fully render
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate route')
    } finally {
      setIsCalculatingRoute(false)
    }
  }, [formData.destination_blocks])

  // Auto-calculate route when addresses change (legacy)
  useEffect(() => {
    if (formData.pickup && formData.dropoff) {
      const timer = setTimeout(() => {
        calculateRoute()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [formData.pickup?.place_id, formData.dropoff?.place_id, calculateRoute])

  // Calculate totals - includes both top-level and load block items
  const calculateTotals = useCallback(() => {
    // Service items total from top-level
    const topLevelServiceTotal = formData.service_items.reduce((sum, item) => {
      return sum + (item.price * item.quantity)
    }, 0)

    // Service items total from load blocks
    const loadBlocksServiceTotal = formData.load_blocks.reduce((sum, block) => {
      return sum + block.service_items.reduce((s, item) => s + (item.price * item.quantity), 0)
    }, 0)

    const serviceItemsTotal = topLevelServiceTotal + loadBlocksServiceTotal

    // Accessorial total from top-level
    const topLevelAccessorialTotal = formData.accessorial_charges.reduce((sum, charge) => {
      const quantity = charge.quantity || 1
      if (charge.is_percentage) {
        return sum + serviceItemsTotal * (charge.amount / 100) * quantity
      }
      return sum + (charge.amount * quantity)
    }, 0)

    // Accessorial total from load blocks
    const loadBlocksAccessorialTotal = formData.load_blocks.reduce((sum, block) => {
      const blockServiceTotal = block.service_items.reduce((s, item) => s + (item.price * item.quantity), 0)
      return sum + block.accessorial_charges.reduce((s, charge) => {
        const quantity = charge.quantity || 1
        if (charge.is_percentage) {
          return s + blockServiceTotal * (charge.amount / 100) * quantity
        }
        return s + (charge.amount * quantity)
      }, 0)
    }, 0)

    const accessorialTotal = topLevelAccessorialTotal + loadBlocksAccessorialTotal

    // Total is the service items (accessorials are conditional "if" charges shown separately)
    const total = serviceItemsTotal

    return {
      lineHaul: 0,  // No longer used
      fuelSurcharge: 0,  // No longer used
      accessorialTotal,  // Kept for display in separate table
      serviceItemsTotal,
      subtotal: serviceItemsTotal,
      marginAmount: 0,  // No longer used
      total,
    }
  }, [formData])

  const totals = calculateTotals()

  // Update form field
  const updateField = <K extends keyof InlandQuoteFormData>(field: K, value: InlandQuoteFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Parse email signature and fill client info
  const handleParseSignature = () => {
    if (!signatureText.trim()) {
      setError('Please paste an email signature first')
      return
    }

    const parsed = parseEmailSignature(signatureText)

    // Merge parsed data with existing form
    setFormData(prev => ({
      ...prev,
      client_name: parsed.name || prev.client_name,
      client_company: parsed.company || prev.client_company,
      client_email: parsed.email || prev.client_email,
      client_phone: parsed.phone || prev.client_phone,
      client_address: parsed.address || prev.client_address,
      billing_address: parsed.billing_address || prev.billing_address,
      billing_city: parsed.billing_city || prev.billing_city,
      billing_state: parsed.billing_state || prev.billing_state,
      billing_zip: parsed.billing_zip || prev.billing_zip,
    }))

    // Show success message
    const fieldsFound = Object.entries(parsed).filter(([, v]) => v).map(([k]) => k)
    if (fieldsFound.length > 0) {
      setSuccessMessage(`Parsed: ${fieldsFound.join(', ')}`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError('Could not extract any information from the signature')
    }

    setShowSignatureParser(false)
    setSignatureText('')
    setSelectedCustomerId('')
  }

  // Customer selection handler (legacy customers)
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId)
    setSelectedContactId('') // Clear contact selection
    setSelectedCompanyId('') // Clear company selection
    if (customerId) {
      const customer = customers.find(c => c.id === customerId)
      if (customer) {
        setFormData(prev => ({
          ...prev,
          client_name: customer.name,
          client_company: customer.company || '',
          client_email: customer.email || '',
          client_phone: customer.phone || '',
          client_address: customer.address || '',
          billing_address: customer.billing_address || customer.address || '',
          billing_city: customer.billing_city || '',
          billing_state: customer.billing_state || '',
          billing_zip: customer.billing_zip || '',
          payment_terms: customer.payment_terms || 'Net 30',
        }))
        setCustomerSearchTerm(customer.company || customer.name || '')
      }
    }
  }

  // Handle contact selection (from companies/contacts tables)
  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId)
    setSelectedCustomerId('') // Clear legacy customer selection
    if (contactId) {
      const contact = contacts.find(c => c.id === contactId)
      if (contact) {
        const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
        // Use company address
        const companyAddr = contact.company ? [
          contact.company.address,
          contact.company.city,
          contact.company.state,
          contact.company.zip
        ].filter(Boolean).join(', ') : ''

        setFormData(prev => ({
          ...prev,
          client_name: fullName,
          client_company: contact.company?.name || '',
          client_email: contact.email || '',
          client_phone: contact.phone || contact.mobile || '',
          client_address: companyAddr,
          // Populate billing information from company
          billing_address: contact.company?.billing_address || contact.company?.address || '',
          billing_city: contact.company?.billing_city || contact.company?.city || '',
          billing_state: contact.company?.billing_state || contact.company?.state || '',
          billing_zip: contact.company?.billing_zip || contact.company?.zip || '',
          payment_terms: contact.company?.payment_terms || 'Net 30',
        }))
      }
    }
  }

  // Add new customer handler
  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      setError('Customer name is required')
      return
    }

    try {
      const now = new Date().toISOString()
      const insertData = {
        name: newCustomer.name,
        company: newCustomer.company || null,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        billing_address: newCustomer.billing_address || null,
        billing_city: newCustomer.billing_city || null,
        billing_state: newCustomer.billing_state || null,
        billing_zip: newCustomer.billing_zip || null,
        payment_terms: newCustomer.payment_terms || 'Net 30',
        notes: null,
        created_at: now,
        updated_at: now,
      }

      const { data, error: insertError } = await supabase
        .from('customers')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error('Supabase insert error:', insertError)
        throw insertError
      }

      if (data) {
        setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        setSelectedCustomerId(data.id)
        setFormData(prev => ({
          ...prev,
          client_name: data.name,
          client_company: data.company || '',
          client_email: data.email || '',
          client_phone: data.phone || '',
          client_address: data.address || '',
          billing_address: data.billing_address || data.address || '',
          billing_city: data.billing_city || '',
          billing_state: data.billing_state || '',
          billing_zip: data.billing_zip || '',
          payment_terms: data.payment_terms || 'Net 30',
        }))
        setShowAddCustomer(false)
        setNewCustomer({})
        setSuccessMessage('Customer added!')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (err: unknown) {
      console.error('Error adding customer:', err)
      let errorMessage = 'Unknown error'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        // Supabase errors have a message property
        const supabaseError = err as { message?: string; details?: string; hint?: string }
        errorMessage = supabaseError.message || supabaseError.details || supabaseError.hint || JSON.stringify(err)
      }
      setError(`Failed to add customer: ${errorMessage}`)
    }
  }

  // Update existing customer handler
  const handleUpdateCustomer = async () => {
    if (!selectedCustomerId) return

    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: formData.client_name,
          company: formData.client_company || null,
          email: formData.client_email || null,
          phone: formData.client_phone || null,
          address: formData.client_address || null,
          billing_address: formData.billing_address || null,
          billing_city: formData.billing_city || null,
          billing_state: formData.billing_state || null,
          billing_zip: formData.billing_zip || null,
          payment_terms: formData.payment_terms || 'Net 30',
        })
        .eq('id', selectedCustomerId)

      if (updateError) throw updateError

      // Update local customers list
      setCustomers(prev => prev.map(c =>
        c.id === selectedCustomerId
          ? {
              ...c,
              name: formData.client_name,
              company: formData.client_company || null,
              email: formData.client_email || null,
              phone: formData.client_phone || null,
              address: formData.client_address || null,
              billing_address: formData.billing_address || null,
              billing_city: formData.billing_city || null,
              billing_state: formData.billing_state || null,
              billing_zip: formData.billing_zip || null,
              payment_terms: formData.payment_terms || null,
            }
          : c
      ))

      setSuccessMessage('Customer updated!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error updating customer:', err)
      setError('Failed to update customer')
    }
  }

  // Add accessorial charge
  const addAccessorialCharge = (type: InlandAccessorialType) => {
    setFormData((prev) => ({
      ...prev,
      accessorial_charges: [
        ...prev.accessorial_charges,
        {
          id: generateId(),
          type_id: type.id,
          type_name: type.name,
          name: type.name,
          amount: type.default_amount || 0,
          is_percentage: type.is_percentage,
          billing_unit: type.billing_unit || 'flat',
          condition_text: null,
          quantity: 1,
        },
      ],
    }))
    setShowAccessorialModal(false)
  }

  // Remove accessorial charge
  const removeAccessorialCharge = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      accessorial_charges: prev.accessorial_charges.filter((_, i) => i !== index),
    }))
  }

  // Update accessorial charge amount
  const updateAccessorialAmount = (index: number, amount: number) => {
    setFormData((prev) => ({
      ...prev,
      accessorial_charges: prev.accessorial_charges.map((charge, i) =>
        i === index ? { ...charge, amount } : charge
      ),
    }))
  }

  // Update accessorial billing unit
  const updateAccessorialBillingUnit = (index: number, billing_unit: AccessorialBillingUnit) => {
    setFormData((prev) => ({
      ...prev,
      accessorial_charges: prev.accessorial_charges.map((charge, i) =>
        i === index ? { ...charge, billing_unit } : charge
      ),
    }))
  }

  // Update accessorial condition text
  const updateAccessorialCondition = (index: number, condition_text: string) => {
    setFormData((prev) => ({
      ...prev,
      accessorial_charges: prev.accessorial_charges.map((charge, i) =>
        i === index ? { ...charge, condition_text } : charge
      ),
    }))
  }

  // Update accessorial quantity
  const updateAccessorialQuantity = (index: number, quantity: number) => {
    setFormData((prev) => ({
      ...prev,
      accessorial_charges: prev.accessorial_charges.map((charge, i) =>
        i === index ? { ...charge, quantity: Math.max(1, quantity) } : charge
      ),
    }))
  }

  // =====================
  // SERVICE ITEM FUNCTIONS
  // =====================
  const addServiceItem = () => {
    setFormData((prev) => ({
      ...prev,
      service_items: [
        ...prev.service_items,
        { id: generateId(), name: '', description: '', price: 0, quantity: 1 },
      ],
    }))
  }

  const removeServiceItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      service_items: prev.service_items.filter((item) => item.id !== id),
    }))
  }

  const updateServiceItem = (id: string, field: keyof InlandServiceItem, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      service_items: prev.service_items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  // =====================
  // CARGO ITEM FUNCTIONS
  // =====================
  const addCargoItem = () => {
    setFormData((prev) => ({
      ...prev,
      cargo_items: [
        ...prev.cargo_items,
        {
          id: generateId(),
          description: '',
          cargo_type: 'General Freight',
          quantity: 1,
          weight_lbs: null,
          length_inches: null,
          width_inches: null,
          height_inches: null,
          image_base64: null,
        },
      ],
    }))
  }

  const removeCargoItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      cargo_items: prev.cargo_items.filter((item) => item.id !== id),
    }))
  }

  const updateCargoItem = (id: string, field: keyof InlandCargoItem, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      cargo_items: prev.cargo_items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  // Handle cargo item image upload
  const handleCargoImageUpload = (cargoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      updateCargoItem(cargoId, 'image_base64', base64)
    }
    reader.readAsDataURL(file)
  }

  // ===========================
  // DESTINATION BLOCK FUNCTIONS
  // ===========================

  // Get next destination name (A, B, C, ...)
  const getNextDestinationName = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const existingNames = formData.destination_blocks.map(d => d.name)
    for (let i = 0; i < letters.length; i++) {
      const name = `Destination ${letters[i]}`
      if (!existingNames.includes(name)) return name
    }
    return `Destination ${formData.destination_blocks.length + 1}`
  }

  // Add a new empty destination block
  const addDestinationBlock = () => {
    setFormData((prev) => ({
      ...prev,
      destination_blocks: [...prev.destination_blocks, createDefaultDestinationBlock(getNextDestinationName())],
    }))
  }

  // Duplicate an existing destination block
  const duplicateDestinationBlock = (blockId: string) => {
    const blockToDuplicate = formData.destination_blocks.find(d => d.id === blockId)
    if (!blockToDuplicate) return

    const newBlock: InlandDestinationBlock = {
      ...JSON.parse(JSON.stringify(blockToDuplicate)), // Deep copy
      id: generateId(),
      name: getNextDestinationName(),
      // Also generate new IDs for nested load blocks
      load_blocks: blockToDuplicate.load_blocks.map(lb => ({
        ...JSON.parse(JSON.stringify(lb)),
        id: generateId(),
        cargo_items: lb.cargo_items.map(c => ({ ...c, id: generateId() })),
        service_items: lb.service_items.map(s => ({ ...s, id: generateId() })),
        accessorial_charges: lb.accessorial_charges.map(a => ({ ...a, id: generateId() })),
      })),
    }

    setFormData((prev) => ({
      ...prev,
      destination_blocks: [...prev.destination_blocks, newBlock],
    }))
  }

  // Remove a destination block
  const removeDestinationBlock = (blockId: string) => {
    if (formData.destination_blocks.length <= 1) {
      setError('Cannot remove the last destination block')
      return
    }
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.filter(d => d.id !== blockId),
    }))
  }

  // Update a destination block
  const updateDestinationBlock = (blockId: string, updates: Partial<InlandDestinationBlock>) => {
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === blockId ? { ...d, ...updates } : d
      ),
    }))
  }

  // Get the currently active destination block (first one if none selected)
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null)

  const activeDestination = formData.destination_blocks.find(d => d.id === activeDestinationId)
    || formData.destination_blocks[0]

  // Auto-calculate route when destination addresses change
  useEffect(() => {
    if (activeDestination?.pickup && activeDestination?.dropoff && !activeDestination?.route) {
      const timer = setTimeout(() => {
        calculateRouteForDestination(activeDestination.id)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [activeDestination?.pickup?.place_id, activeDestination?.dropoff?.place_id])

  // =====================
  // LOAD BLOCK FUNCTIONS
  // =====================
  // Add load block to legacy load_blocks array (for backward compatibility)
  const addLoadBlock = () => {
    setFormData((prev) => ({
      ...prev,
      load_blocks: [...prev.load_blocks, createDefaultLoadBlock()],
    }))
  }

  // Add load block to a specific destination
  const addLoadBlockToDestination = (destinationId: string) => {
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === destinationId ? { ...d, load_blocks: [...d.load_blocks, createDefaultLoadBlock()] } : d
      ),
    }))
  }

  // Remove load block from active destination
  const removeLoadBlock = (blockId: string) => {
    if (!activeDestination) return
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? { ...d, load_blocks: d.load_blocks.filter((block) => block.id !== blockId) }
          : d
      ),
    }))
  }

  // Update load block in active destination
  const updateLoadBlock = (blockId: string, updates: Partial<InlandLoadBlock>) => {
    if (!activeDestination) return
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId ? { ...block, ...updates } : block
              ),
            }
          : d
      ),
    }))
  }

  // Add cargo item to a specific load block in active destination
  const addCargoItemToBlock = (blockId: string) => {
    if (!activeDestination) return
    const newCargo: InlandCargoItem = {
      id: generateId(),
      description: '',
      cargo_type: 'General Freight',
      quantity: 1,
      weight_lbs: null,
      length_inches: null,
      width_inches: null,
      height_inches: null,
      image_base64: null,
    }
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId
                  ? { ...block, cargo_items: [...block.cargo_items, newCargo] }
                  : block
              ),
            }
          : d
      ),
    }))
  }

  const removeCargoItemFromBlock = (blockId: string, cargoId: string) => {
    if (!activeDestination) return
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId
                  ? { ...block, cargo_items: block.cargo_items.filter((c) => c.id !== cargoId) }
                  : block
              ),
            }
          : d
      ),
    }))
  }

  const updateCargoItemInBlock = (blockId: string, cargoId: string, field: keyof InlandCargoItem, value: string | number | boolean | null) => {
    if (!activeDestination) return
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId
                  ? {
                      ...block,
                      cargo_items: block.cargo_items.map((cargo) =>
                        cargo.id === cargoId ? { ...cargo, [field]: value } : cargo
                      ),
                    }
                  : block
              ),
            }
          : d
      ),
    }))
  }

  // useEffect to watch cargo items and auto-recommend truck types
  // This runs AFTER React state is updated, ensuring we have the latest data
  useEffect(() => {
    if (!activeDestination) return

    const destBlock = formData.destination_blocks.find(d => d.id === activeDestination.id)
    if (!destBlock) return

    // Check each load block for recommendations
    destBlock.load_blocks.forEach(block => {
      if (block.cargo_items.length === 0) return

      // Check if any cargo item has dimensions
      const hasDimensions = block.cargo_items.some(c =>
        c.weight_lbs || c.length_inches || c.width_inches || c.height_inches
      )
      if (!hasDimensions) return

      // Skip if user has manually overridden
      const currentRec = truckRecommendations[block.id]
      if (currentRec?.isManualOverride) {
        // Still update the recommendation display
        const rec = recommendTruckType(block.cargo_items, equipmentTypes)
        if (rec.recommendedId !== currentRec.recommendedId || rec.reason !== currentRec.reason) {
          setTruckRecommendations(prev => ({
            ...prev,
            [block.id]: {
              ...prev[block.id],
              recommendedId: rec.recommendedId,
              reason: rec.reason,
              multiTruckSuggestion: rec.multiTruckSuggestion
            }
          }))
        }
        return
      }

      // Calculate recommendation
      const rec = recommendTruckType(block.cargo_items, equipmentTypes)

      // Only update if recommendation changed
      if (rec.recommendedId !== currentRec?.recommendedId || rec.reason !== currentRec?.reason) {
        setTruckRecommendations(prev => ({
          ...prev,
          [block.id]: {
            recommendedId: rec.recommendedId,
            reason: rec.reason,
            isManualOverride: false,
            multiTruckSuggestion: rec.multiTruckSuggestion
          }
        }))

        // Auto-apply if truck isn't set yet
        if (rec.recommendedId && (!block.truck_type_id || block.truck_type_id === '')) {
          updateLoadBlock(block.id, { truck_type_id: rec.recommendedId })
        }
      }
    })
  }, [formData.destination_blocks, activeDestination, equipmentTypes])

  // Check cargo dimensions and recommend appropriate truck type
  const checkAndApplyTruckRecommendation = (blockId: string) => {
    if (!activeDestination) return

    // Find the load block
    const destBlock = formData.destination_blocks.find(d => d.id === activeDestination.id)
    if (!destBlock) return

    const loadBlock = destBlock.load_blocks.find(b => b.id === blockId)
    if (!loadBlock) return

    // Get current recommendation state
    const currentRec = truckRecommendations[blockId]

    // If user has manually overridden, don't auto-change
    if (currentRec?.isManualOverride) {
      // Still update the recommendation display, but don't change the selection
      const rec = recommendTruckType(loadBlock.cargo_items, equipmentTypes)
      setTruckRecommendations(prev => ({
        ...prev,
        [blockId]: {
          ...prev[blockId],
          recommendedId: rec.recommendedId,
          reason: rec.reason,
          multiTruckSuggestion: rec.multiTruckSuggestion
        }
      }))
      return
    }

    // Calculate recommendation
    const rec = recommendTruckType(loadBlock.cargo_items, equipmentTypes)

    // Update recommendation state
    setTruckRecommendations(prev => ({
      ...prev,
      [blockId]: {
        recommendedId: rec.recommendedId,
        reason: rec.reason,
        isManualOverride: false,
        multiTruckSuggestion: rec.multiTruckSuggestion
      }
    }))

    // Auto-apply if we have a recommendation and truck isn't already set or matches current
    if (rec.recommendedId && (!loadBlock.truck_type_id || loadBlock.truck_type_id === '')) {
      updateLoadBlock(blockId, { truck_type_id: rec.recommendedId })
    }
  }

  // Mark truck selection as manual override (user chose different from recommended)
  const handleManualTruckSelect = (blockId: string, truckTypeId: string) => {
    const rec = truckRecommendations[blockId]
    const isOverride = !!(rec?.recommendedId && truckTypeId !== rec.recommendedId)

    setTruckRecommendations(prev => ({
      ...prev,
      [blockId]: {
        recommendedId: prev[blockId]?.recommendedId ?? null,
        reason: prev[blockId]?.reason ?? '',
        isManualOverride: isOverride,
        multiTruckSuggestion: prev[blockId]?.multiTruckSuggestion
      }
    }))

    updateLoadBlock(blockId, { truck_type_id: truckTypeId })
  }

  // Split a load block into multiple blocks based on multi-truck recommendation
  const splitLoadIntoMultipleTrucks = (blockId: string) => {
    if (!activeDestination) return

    const rec = truckRecommendations[blockId]
    if (!rec?.multiTruckSuggestion?.needsMultipleTrucks) return

    const destBlock = formData.destination_blocks.find(d => d.id === activeDestination.id)
    if (!destBlock) return

    const originalBlock = destBlock.load_blocks.find(b => b.id === blockId)
    if (!originalBlock || originalBlock.cargo_items.length === 0) return

    const { truckBreakdown } = rec.multiTruckSuggestion

    // Create new load blocks based on the breakdown
    const newLoadBlocks: InlandLoadBlock[] = []
    let cargoIndex = 0

    truckBreakdown.forEach((breakdown, breakdownIdx) => {
      // Create one block per truck needed for this truck type
      for (let i = 0; i < breakdown.count; i++) {
        // Get cargo items for this truck (distribute evenly)
        const cargoForThisTruck: InlandCargoItem[] = []

        // For the first breakdown group, take items from cargoIndices
        if (breakdownIdx === 0 && breakdown.cargoIndices.length > 0) {
          // Split cargo indices across the trucks of this type
          const indicesPerTruck = Math.ceil(breakdown.cargoIndices.length / breakdown.count)
          const startIdx = i * indicesPerTruck
          const endIdx = Math.min(startIdx + indicesPerTruck, breakdown.cargoIndices.length)

          for (let j = startIdx; j < endIdx; j++) {
            const cargo = originalBlock.cargo_items[breakdown.cargoIndices[j]]
            if (cargo) {
              cargoForThisTruck.push({ ...cargo, id: generateId() })
            }
          }
        } else if (cargoIndex < originalBlock.cargo_items.length) {
          // For other breakdowns or if no specific indices, just take next available cargo
          cargoForThisTruck.push({ ...originalBlock.cargo_items[cargoIndex], id: generateId() })
          cargoIndex++
        }

        // Only create block if it has cargo
        if (cargoForThisTruck.length > 0 || i === 0) {
          const newBlock: InlandLoadBlock = {
            id: generateId(),
            truck_type_id: breakdown.truckTypeId,
            cargo_items: cargoForThisTruck.length > 0 ? cargoForThisTruck : [],
            service_items: i === 0 ? originalBlock.service_items.map(s => ({ ...s, id: generateId() })) : [],
            accessorial_charges: i === 0 ? originalBlock.accessorial_charges.map(a => ({ ...a, id: generateId() })) : [],
            load_image_base64: null,
            notes: i === 0 ? originalBlock.notes : '',
          }
          newLoadBlocks.push(newBlock)
        }
      }
    })

    // If we didn't distribute all cargo, put remaining in last block
    const distributedCount = newLoadBlocks.reduce((sum, b) => sum + b.cargo_items.length, 0)
    if (distributedCount < originalBlock.cargo_items.length) {
      const remaining = originalBlock.cargo_items.slice(distributedCount).map(c => ({ ...c, id: generateId() }))
      if (newLoadBlocks.length > 0) {
        newLoadBlocks[newLoadBlocks.length - 1].cargo_items.push(...remaining)
      }
    }

    // Replace the original block with the new blocks
    setFormData(prev => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: [
                ...d.load_blocks.filter(b => b.id !== blockId),
                ...newLoadBlocks
              ]
            }
          : d
      )
    }))

    // Clear the recommendation for the old block
    setTruckRecommendations(prev => {
      const updated = { ...prev }
      delete updated[blockId]
      return updated
    })
  }

  // Add service item (rate) to a specific load block
  const addServiceItemToBlock = (blockId: string) => {
    if (!activeDestination) return
    const newItem: InlandServiceItem = {
      id: generateId(),
      name: '',
      description: '',
      price: 0,
      quantity: 1,
    }
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId
                  ? { ...block, service_items: [...block.service_items, newItem] }
                  : block
              ),
            }
          : d
      ),
    }))
  }

  const removeServiceItemFromBlock = (blockId: string, itemId: string) => {
    if (!activeDestination) return
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId
                  ? { ...block, service_items: block.service_items.filter((i) => i.id !== itemId) }
                  : block
              ),
            }
          : d
      ),
    }))
  }

  const updateServiceItemInBlock = (blockId: string, itemId: string, field: keyof InlandServiceItem, value: string | number) => {
    if (!activeDestination) return
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId
                  ? {
                      ...block,
                      service_items: block.service_items.map((item) =>
                        item.id === itemId ? { ...item, [field]: value } : item
                      ),
                    }
                  : block
              ),
            }
          : d
      ),
    }))
  }

  // Add accessorial charge to a specific load block
  const addAccessorialToBlock = (blockId: string, type: InlandAccessorialType) => {
    if (!activeDestination) return
    const newCharge: InlandAccessorialCharge = {
      id: generateId(),
      type_id: type.id,
      type_name: type.name,
      name: type.name,
      amount: type.default_amount || 0,
      is_percentage: type.is_percentage,
      billing_unit: type.billing_unit || 'flat',
      quantity: 1,
      condition_text: null,
    }
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId
                  ? { ...block, accessorial_charges: [...block.accessorial_charges, newCharge] }
                  : block
              ),
            }
          : d
      ),
    }))
    setShowAccessorialModal(false)
    setActiveLoadBlockId(null)
  }

  const removeAccessorialFromBlock = (blockId: string, chargeId: string) => {
    if (!activeDestination) return
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId
                  ? { ...block, accessorial_charges: block.accessorial_charges.filter((c) => c.id !== chargeId) }
                  : block
              ),
            }
          : d
      ),
    }))
  }

  const updateAccessorialInBlock = (blockId: string, chargeId: string, updates: Partial<InlandAccessorialCharge>) => {
    if (!activeDestination) return
    setFormData((prev) => ({
      ...prev,
      destination_blocks: prev.destination_blocks.map(d =>
        d.id === activeDestination.id
          ? {
              ...d,
              load_blocks: d.load_blocks.map((block) =>
                block.id === blockId
                  ? {
                      ...block,
                      accessorial_charges: block.accessorial_charges.map((charge) =>
                        charge.id === chargeId ? { ...charge, ...updates } : charge
                      ),
                    }
                  : block
              ),
            }
          : d
      ),
    }))
  }

  // Handle load block image upload
  const handleLoadBlockImageUpload = async (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      let base64 = event.target?.result as string

      // Convert SVG to PNG for better compatibility
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        try {
          base64 = await convertSvgToPng(base64)
        } catch (err) {
          console.error('Failed to convert SVG:', err)
          setError('Failed to process SVG image. Please try a different format.')
          return
        }
      }

      updateLoadBlock(blockId, { load_image_base64: base64 })
    }
    reader.readAsDataURL(file)
  }

  // =====================
  // LOAD TYPE MANAGEMENT FUNCTIONS
  // =====================
  const addNewLoadType = async () => {
    if (!newLoadType.name.trim()) {
      setError('Please enter a name for the load type')
      return
    }

    try {
      const { data, error } = await supabase
        .from('inland_load_types')
        .insert({
          name: newLoadType.name,
          description: newLoadType.description || null,
          is_active: true,
          sort_order: loadTypes.length,
        })
        .select()
        .single()

      if (error) throw error

      setLoadTypes((prev) => [...prev, data])
      setNewLoadType({ name: '', description: '' })
      setSuccessMessage('Load type added!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error adding load type:', err)
      setError('Failed to add load type')
    }
  }

  const deleteLoadType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this load type?')) return

    try {
      const { error } = await supabase
        .from('inland_load_types')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      setLoadTypes((prev) => prev.filter((t) => t.id !== id))
      setSuccessMessage('Load type removed!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error deleting load type:', err)
      setError('Failed to delete load type')
    }
  }

  // Get available cargo types (from DB or fallback to hardcoded, deduplicated)
  const getCargoTypes = () => {
    if (loadTypes.length > 0) {
      // Use Set to remove duplicates and preserve order
      return [...new Set(loadTypes.map((t) => t.name))]
    }
    return CARGO_TYPES
  }

  // Calculate block total
  const calculateBlockTotal = (block: InlandLoadBlock) => {
    const serviceTotal = block.service_items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const accessorialTotal = block.accessorial_charges.reduce((sum, charge) => {
      const quantity = charge.quantity || 1
      if (charge.is_percentage) {
        return sum + serviceTotal * (charge.amount / 100) * quantity
      }
      return sum + (charge.amount * quantity)
    }, 0)
    return { serviceTotal, accessorialTotal, total: serviceTotal }
  }

  // Calculate all blocks total
  const calculateAllBlocksTotal = () => {
    return formData.load_blocks.reduce((sum, block) => {
      const blockTotal = calculateBlockTotal(block)
      return sum + blockTotal.total
    }, 0)
  }

  // =====================
  // IMAGE UPLOAD FUNCTION
  // =====================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      let base64 = event.target?.result as string

      // Convert SVG to PNG for better compatibility
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        try {
          base64 = await convertSvgToPng(base64)
        } catch (err) {
          console.error('Failed to convert SVG:', err)
          setError('Failed to process SVG image. Please try a different format.')
          return
        }
      }

      setFormData((prev) => ({ ...prev, load_image_base64: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, load_image_base64: null }))
  }

  // =====================
  // ACCESSORIAL TYPE SETTINGS FUNCTIONS
  // =====================
  const saveAccessorialType = async (type: InlandAccessorialType) => {
    try {
      const { error } = await supabase
        .from('inland_accessorial_types')
        .update({
          name: type.name,
          description: type.description,
          default_amount: type.default_amount,
          is_percentage: type.is_percentage,
        })
        .eq('id', type.id)

      if (error) throw error

      setAccessorialTypes((prev) =>
        prev.map((t) => (t.id === type.id ? type : t))
      )
      setEditingAccessorialType(null)
      setSuccessMessage('Accessorial fee updated!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to update accessorial fee')
      console.error(err)
    }
  }

  const addNewAccessorialType = async () => {
    if (!newAccessorialType.name.trim()) {
      setError('Please enter a name for the accessorial fee')
      return
    }

    try {
      const { data, error } = await supabase
        .from('inland_accessorial_types')
        .insert({
          name: newAccessorialType.name,
          description: newAccessorialType.description || null,
          default_amount: newAccessorialType.default_amount,
          is_percentage: newAccessorialType.is_percentage,
          is_active: true,
          sort_order: accessorialTypes.length,
        })
        .select()
        .single()

      if (error) throw error

      setAccessorialTypes((prev) => [...prev, data])
      setNewAccessorialType({ name: '', description: '', default_amount: 0, is_percentage: false })
      setSuccessMessage('New accessorial fee added!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to add accessorial fee')
      console.error(err)
    }
  }

  const deleteAccessorialType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this accessorial fee?')) return

    try {
      const { error } = await supabase
        .from('inland_accessorial_types')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      setAccessorialTypes((prev) => prev.filter((t) => t.id !== id))
      setSuccessMessage('Accessorial fee removed!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to delete accessorial fee')
      console.error(err)
    }
  }

  // Add custom truck type on-the-fly
  const addCustomTruckType = async (blockId: string, name: string) => {
    if (!name.trim()) return

    try {
      const { data, error } = await supabase
        .from('inland_equipment_types')
        .insert({
          name: name.trim(),
          description: 'Custom truck type',
          is_active: true,
          sort_order: equipmentTypes.length,
        })
        .select()
        .single()

      if (error) throw error

      setEquipmentTypes((prev) => [...prev, data])
      updateLoadBlock(blockId, { truck_type_id: data.id })
      setCustomTruckInput((prev) => ({ ...prev, [blockId]: '' }))
      setSuccessMessage('Custom truck type added!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error adding custom truck type:', err)
      setError('Failed to add custom truck type')
    }
  }

  // Add custom load/cargo type on-the-fly
  const addCustomLoadType = async (blockId: string, cargoId: string, name: string) => {
    if (!name.trim()) return

    try {
      const { data, error } = await supabase
        .from('inland_load_types')
        .insert({
          name: name.trim(),
          description: 'Custom load type',
          is_active: true,
          sort_order: loadTypes.length,
        })
        .select()
        .single()

      if (error) throw error

      setLoadTypes((prev) => [...prev, data])
      updateCargoItemInBlock(blockId, cargoId, 'cargo_type', data.name)
      setCustomCargoTypeInput((prev) => ({ ...prev, [cargoId]: '' }))
      setSuccessMessage('Custom load type added!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error adding custom load type:', err)
      setError('Failed to add custom load type')
    }
  }

  // Add custom accessorial type on-the-fly
  const addCustomAccessorialType = async () => {
    if (!customAccessorialName.trim()) {
      setError('Please enter a name for the accessorial')
      return
    }

    try {
      const { data, error } = await supabase
        .from('inland_accessorial_types')
        .insert({
          name: customAccessorialName.trim(),
          description: 'Custom accessorial charge',
          default_amount: customAccessorialAmount || 0,
          is_percentage: false,
          billing_unit: customAccessorialBillingUnit,
          is_active: true,
          sort_order: accessorialTypes.length,
        })
        .select()
        .single()

      if (error) throw error

      setAccessorialTypes((prev) => [...prev, data])

      // Auto-add to active load block or top-level
      if (activeLoadBlockId) {
        addAccessorialToBlock(activeLoadBlockId, data)
      } else {
        addAccessorialCharge(data)
      }

      setCustomAccessorialName('')
      setCustomAccessorialAmount(0)
      setCustomAccessorialBillingUnit('flat')
      setSuccessMessage('Custom accessorial added!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error adding custom accessorial:', err)
      setError('Failed to add custom accessorial')
    }
  }

  // Use saved lane
  const useSavedLane = (lane: InlandSavedLane) => {
    setFormData((prev) => ({
      ...prev,
      pickup: {
        address: lane.origin_address,
        city: lane.origin_city || '',
        state: lane.origin_state || '',
        zip: lane.origin_zip || '',
        country: 'USA',
        formatted_address: lane.origin_address,
        place_id: lane.origin_place_id || '',
        lat: lane.origin_lat || 0,
        lng: lane.origin_lng || 0,
      },
      dropoff: {
        address: lane.destination_address,
        city: lane.destination_city || '',
        state: lane.destination_state || '',
        zip: lane.destination_zip || '',
        country: 'USA',
        formatted_address: lane.destination_address,
        place_id: lane.destination_place_id || '',
        lat: lane.destination_lat || 0,
        lng: lane.destination_lng || 0,
      },
      rate_per_mile: lane.typical_rate_per_mile || formData.rate_per_mile,
    }))
    setShowSavedLanesModal(false)

    // Update lane usage
    supabase
      .from('inland_saved_lanes')
      .update({
        use_count: (lane.use_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', lane.id)
      .then(() => {
        // Reload saved lanes
        loadData()
      })
  }

  // Save current lane
  const saveCurrentLane = async () => {
    if (!formData.pickup || !formData.dropoff) {
      setError('Both pickup and dropoff addresses are required to save a lane')
      return
    }

    const laneName = prompt('Enter a name for this lane:', `${formData.pickup.city || formData.pickup.state} to ${formData.dropoff.city || formData.dropoff.state}`)

    if (!laneName) return

    try {
      const { error } = await supabase.from('inland_saved_lanes').insert({
        name: laneName,
        origin_address: formData.pickup.formatted_address,
        origin_city: formData.pickup.city,
        origin_state: formData.pickup.state,
        origin_zip: formData.pickup.zip,
        origin_place_id: formData.pickup.place_id,
        origin_lat: formData.pickup.lat,
        origin_lng: formData.pickup.lng,
        destination_address: formData.dropoff.formatted_address,
        destination_city: formData.dropoff.city,
        destination_state: formData.dropoff.state,
        destination_zip: formData.dropoff.zip,
        destination_place_id: formData.dropoff.place_id,
        destination_lat: formData.dropoff.lat,
        destination_lng: formData.dropoff.lng,
        distance_miles: formData.route?.distance_miles,
        typical_rate_per_mile: formData.rate_per_mile,
      })

      if (error) throw error

      setSuccessMessage('Lane saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      loadData()
    } catch (err) {
      setError('Failed to save lane')
      console.error(err)
    }
  }

  // Save quote to database
  const saveQuote = async (status: 'draft' | 'sent' = 'draft') => {
    if (!formData.client_name) {
      setError('Client name is required')
      return
    }

    if (!formData.pickup || !formData.dropoff) {
      setError('Both pickup and dropoff addresses are required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const calculatedTotals = calculateTotals()

      const quoteData: Partial<InlandQuote> = {
        quote_number: quoteNumber,
        client_name: formData.client_name,
        client_company: formData.client_company || null,
        client_email: formData.client_email || null,
        client_phone: formData.client_phone || null,
        billing_address: formData.billing_address || null,
        billing_city: formData.billing_city || null,
        billing_state: formData.billing_state || null,
        billing_zip: formData.billing_zip || null,
        payment_terms: formData.payment_terms || 'Net 30',
        pickup_address: formData.pickup.address,
        pickup_city: formData.pickup.city,
        pickup_state: formData.pickup.state,
        pickup_zip: formData.pickup.zip,
        pickup_country: formData.pickup.country,
        pickup_place_id: formData.pickup.place_id,
        pickup_lat: formData.pickup.lat,
        pickup_lng: formData.pickup.lng,
        pickup_formatted_address: formData.pickup.formatted_address,
        dropoff_address: formData.dropoff.address,
        dropoff_city: formData.dropoff.city,
        dropoff_state: formData.dropoff.state,
        dropoff_zip: formData.dropoff.zip,
        dropoff_country: formData.dropoff.country,
        dropoff_place_id: formData.dropoff.place_id,
        dropoff_lat: formData.dropoff.lat,
        dropoff_lng: formData.dropoff.lng,
        dropoff_formatted_address: formData.dropoff.formatted_address,
        distance_miles: formData.route?.distance_miles || null,
        distance_meters: formData.route?.distance_meters || null,
        duration_minutes: formData.route?.duration_minutes || null,
        duration_text: formData.route?.duration_text || null,
        route_polyline: formData.route?.polyline || null,
        rate_per_mile: formData.rate_per_mile,
        base_rate: formData.base_rate,
        fuel_surcharge_percent: formData.fuel_surcharge_percent,
        fuel_surcharge_amount: calculatedTotals.fuelSurcharge,
        line_haul_total: calculatedTotals.lineHaul,
        accessorial_total: calculatedTotals.accessorialTotal,
        subtotal: calculatedTotals.subtotal,
        margin_percentage: formData.margin_percentage,
        margin_amount: calculatedTotals.marginAmount,
        total_amount: calculatedTotals.total,
        equipment_type: equipmentTypes.find((e) => e.id === formData.equipment_type_id)?.name || null,
        equipment_description: formData.equipment_description || null,
        weight_lbs: formData.weight_lbs,
        status,
        valid_until: new Date(Date.now() + (rateSettings?.default_validity_days || 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        internal_notes: formData.internal_notes || null,
        customer_notes: formData.customer_notes || null,
        special_instructions: formData.special_instructions || null,
        // Store JSON data for load blocks, services, cargo, accessorials
        load_blocks: formData.load_blocks.length > 0 ? formData.load_blocks : null,
        service_items: formData.service_items.length > 0 ? formData.service_items : null,
        cargo_items: formData.cargo_items.length > 0 ? formData.cargo_items : null,
        accessorial_charges: formData.accessorial_charges.length > 0 ? formData.accessorial_charges : null,
        load_image_base64: formData.load_image_base64 || null,
      }

      let savedQuote
      if (editingQuoteId) {
        // Update existing quote
        const { data, error: updateError } = await supabase
          .from('inland_quotes')
          .update({ ...quoteData, updated_at: new Date().toISOString() })
          .eq('id', editingQuoteId)
          .select()
          .single()

        if (updateError) throw updateError
        savedQuote = data
      } else {
        // Insert new quote
        const { data, error: insertError } = await supabase
          .from('inland_quotes')
          .insert(quoteData)
          .select()
          .single()

        if (insertError) throw insertError
        savedQuote = data
      }

      // Save accessorial charges to separate table (for backward compatibility)
      if (formData.accessorial_charges.length > 0 && savedQuote) {
        // Delete existing charges first if editing
        if (editingQuoteId) {
          await supabase.from('inland_accessorial_charges').delete().eq('quote_id', savedQuote.id)
        }

        const accessorialData = formData.accessorial_charges.map((charge) => ({
          quote_id: savedQuote.id,
          charge_type: charge.type_name,
          description: null,
          amount: charge.amount,
          is_percentage: charge.is_percentage,
        }))

        await supabase.from('inland_accessorial_charges').insert(accessorialData)
      }

      const action = editingQuoteId ? 'updated' : 'saved'
      setSuccessMessage(`Quote ${quoteNumber} ${action} successfully!`)
      setTimeout(() => setSuccessMessage(null), 3000)

      // Reset form for new quote
      resetForm()
      // Reset to default rates
      setFormData((prev) => ({
        ...prev,
        rate_per_mile: rateSettings?.default_rate_per_mile || 3.5,
        fuel_surcharge_percent: rateSettings?.fuel_surcharge_percent || 15,
        margin_percentage: rateSettings?.default_margin_percent || 15,
      }))
    } catch (err) {
      setError('Failed to save quote')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  // Download PDF
  const downloadPdf = async () => {
    // Check if we have destination blocks with addresses
    const hasDestinationBlocks = formData.destination_blocks && formData.destination_blocks.length > 0
    const hasValidDestination = hasDestinationBlocks && formData.destination_blocks.some(d => d.pickup && d.dropoff)
    const hasLegacyRoute = formData.pickup && formData.dropoff

    if (!hasValidDestination && !hasLegacyRoute) {
      setError('At least one destination with pickup and dropoff addresses is required')
      return
    }

    try {
      // Collect all accessorial charges from destination blocks AND legacy load blocks
      const allAccessorialCharges = [
        ...formData.accessorial_charges,
        ...formData.load_blocks.flatMap(block => block.accessorial_charges),
        ...formData.destination_blocks.flatMap(d => d.load_blocks.flatMap(block => block.accessorial_charges))
      ]

      // Capture map image for PDF (use first destination's route if available)
      const mapImage = await captureMapImage()

      const pdfBlob = await generateInlandQuotePdf({
        quoteNumber,
        formData,
        totals: calculateTotals(),
        route: hasDestinationBlocks ? formData.destination_blocks[0].route : formData.route,
        equipmentType: equipmentTypes.find((e) => e.id === formData.equipment_type_id),
        accessorialCharges: allAccessorialCharges,
        mapImage,
      })

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Inland_Quote_${quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to generate PDF')
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Inland Transportation Quote</h1>
              {editingQuoteId && (
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  Editing
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1">Quote #: {quoteNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* New Quote button when editing */}
            {editingQuoteId && (
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Quote
              </button>
            )}
            {/* PDF Preview Toggle */}
            <button
              onClick={() => setShowPdfPreview(!showPdfPreview)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                showPdfPreview
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {showPdfPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            {savedLanes.length > 0 && (
              <button
                onClick={() => setShowSavedLanesModal(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Saved Lanes
              </button>
            )}
            {formData.pickup && formData.dropoff && (
              <button
                onClick={saveCurrentLane}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Save Lane
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-[1800px] mx-auto px-6">
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}
      </div>

      {/* Main Content - Split View */}
      <div className={`max-w-[1800px] mx-auto p-6 ${showPdfPreview ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : ''}`}>
        {/* Left Side - Form */}
        <div className={showPdfPreview ? '' : 'max-w-4xl mx-auto'}>
          <div className="space-y-6">
        {/* Form Content */}
        <div className="space-y-6">
          {/* Client Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Client Information</h2>
              <button
                onClick={() => setShowSignatureParser(true)}
                className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Paste Signature
              </button>
            </div>

            {/* Work Order Number */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Order # <span className="text-xs text-gray-500">(Client Reference)</span>
              </label>
              <input
                type="text"
                value={formData.work_order_number}
                onChange={(e) => updateField('work_order_number', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-amber-50"
                placeholder="Enter client's work order or reference number"
              />
            </div>

            {/* Customer/Contact Selection - Company First */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Company Dropdown with Search */}
                <div className="relative">
                  <label className="block text-xs text-gray-500 mb-1">Company</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value)
                        setShowCustomerDropdown(true)
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search or select company..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {showCustomerDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {/* Company options */}
                      {companies
                        .filter(c => !customerSearchTerm || c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                        .slice(0, 15)
                        .map(company => (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => {
                              setSelectedCompanyId(company.id)
                              setFormData(prev => ({ ...prev, client_company: company.name }))
                              setCustomerSearchTerm(company.name)
                              setShowCustomerDropdown(false)
                              // Clear contact selection when company changes
                              setSelectedContactId('')
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0 ${selectedCompanyId === company.id ? 'bg-blue-50' : ''}`}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-600 text-xs font-medium">
                              {company.name?.charAt(0) || '?'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{company.name}</div>
                              {company.city && company.state && (
                                <div className="text-xs text-gray-500">{company.city}, {company.state}</div>
                              )}
                            </div>
                            {contacts.filter(c => c.company_id === company.id).length > 0 && (
                              <span className="text-xs text-gray-400">{contacts.filter(c => c.company_id === company.id).length} contacts</span>
                            )}
                          </button>
                        ))}

                      {/* Legacy Customers Section - show customers from old system */}
                      {customers.filter(c => !customerSearchTerm ||
                        c.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        c.company?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                      ).length > 0 && (
                        <>
                          <div className="px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-500 border-t border-gray-200 sticky top-0">
                            Previous Customers
                          </div>
                          {customers
                            .filter(c => !customerSearchTerm ||
                              c.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                              c.company?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                            )
                            .slice(0, 15)
                            .map(customer => (
                              <button
                                key={`legacy-${customer.id}`}
                                type="button"
                                onClick={() => {
                                  handleCustomerSelect(customer.id)
                                  setShowCustomerDropdown(false)
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-amber-50 flex items-center gap-2 border-b border-gray-100 last:border-b-0 ${selectedCustomerId === customer.id ? 'bg-amber-50' : ''}`}
                              >
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-amber-100 text-amber-600 text-xs font-medium">
                                  {(customer.name || customer.company || '?').charAt(0)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">{customer.name}</div>
                                  {customer.company && (
                                    <div className="text-xs text-gray-500">{customer.company}</div>
                                  )}
                                </div>
                                <span className="text-xs text-amber-500">Legacy</span>
                              </button>
                            ))}
                        </>
                      )}

                      {companies.filter(c => !customerSearchTerm || c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())).length === 0 &&
                       customers.filter(c => !customerSearchTerm ||
                         c.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                         c.company?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                       ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">No companies or customers found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Contact Dropdown - shows contacts from selected company */}
                <div className="relative">
                  <label className="block text-xs text-gray-500 mb-1">Contact Person</label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => {
                      const contactId = e.target.value
                      if (contactId) {
                        handleContactSelect(contactId)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{selectedCompanyId ? '-- Select contact --' : '-- Select company first --'}</option>
                    {selectedCompanyId ? (
                      contacts.filter(c => c.company_id === selectedCompanyId).map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                          {contact.role && ` (${contact.role})`}
                          {contact.email && ` - ${contact.email}`}
                        </option>
                      ))
                    ) : (
                      // Show all contacts if no company selected
                      contacts.slice(0, 20).map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                          {contact.company?.name && ` @ ${contact.company.name}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(true)}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                  title="Add new customer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Customer
                </button>
                {(selectedContactId || selectedCompanyId || selectedCustomerId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedContactId('')
                      setSelectedCompanyId('')
                      setSelectedCustomerId('')
                      setCustomerSearchTerm('')
                      setFormData(prev => ({
                        ...prev,
                        client_name: '',
                        client_email: '',
                        client_company: '',
                        client_phone: '',
                        client_address: '',
                      }))
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                    title="Clear customer selection"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => {
                    updateField('client_name', e.target.value)
                    // Clear selections when manually editing
                    if (selectedCustomerId) setSelectedCustomerId('')
                    if (selectedContactId) setSelectedContactId('')
                    if (selectedCompanyId) setSelectedCompanyId('')
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.client_company}
                  onChange={(e) => updateField('client_company', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => updateField('client_email', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.client_phone}
                  onChange={(e) => updateField('client_phone', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Address</label>
                <input
                  type="text"
                  value={formData.client_address}
                  onChange={(e) => updateField('client_address', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="Client's office address"
                />
              </div>
            </div>
          </div>

          {/* Destination Blocks Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm p-4 mb-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Destinations</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addDestinationBlock}
                  className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Destination
                </button>
                {formData.destination_blocks.length > 0 && activeDestination && (
                  <button
                    type="button"
                    onClick={() => duplicateDestinationBlock(activeDestination.id)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Duplicate
                  </button>
                )}
              </div>
            </div>
            {/* Destination Tabs */}
            <div className="flex flex-wrap gap-2">
              {formData.destination_blocks.map((dest, index) => (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => setActiveDestinationId(dest.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                    activeDestination?.id === dest.id
                      ? 'bg-white text-blue-700 shadow-md'
                      : 'bg-blue-500/50 text-white hover:bg-blue-500'
                  }`}
                >
                  <span>{dest.name}</span>
                  {dest.pickup && dest.dropoff && (
                    <span className="text-xs opacity-75">
                      ({dest.pickup.city || dest.pickup.state} → {dest.dropoff.city || dest.dropoff.state})
                    </span>
                  )}
                  {formData.destination_blocks.length > 1 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); removeDestinationBlock(dest.id) }}
                      className="ml-1 p-0.5 rounded hover:bg-red-100 hover:text-red-600 cursor-pointer"
                      title="Remove destination"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active Destination Content */}
          {activeDestination && (
            <>
          {/* Locations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 rounded-t-none border-t-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Route Information</h2>
              <input
                type="text"
                value={activeDestination.name}
                onChange={(e) => updateDestinationBlock(activeDestination.id, { name: e.target.value })}
                className="text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1 w-40"
                placeholder="Destination name"
              />
            </div>
            <div className="space-y-4">
              <GooglePlacesAutocomplete
                label="Pickup Location"
                value={activeDestination.pickup}
                onChange={(address) => updateDestinationBlock(activeDestination.id, { pickup: address })}
                placeholder="Enter pickup address"
                required
              />

              <GooglePlacesAutocomplete
                label="Dropoff Location"
                value={activeDestination.dropoff}
                onChange={(address) => updateDestinationBlock(activeDestination.id, { dropoff: address })}
                placeholder="Enter dropoff address"
                required
              />

              {/* Route Info Display */}
              {isCalculatingRoute && (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculating route...
                </div>
              )}

              {activeDestination.route && !isCalculatingRoute && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-blue-700">
                        {activeDestination.route.distance_miles.toFixed(1)} miles
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({activeDestination.route.duration_text})
                      </span>
                    </div>
                    <button
                      onClick={() => calculateRouteForDestination(activeDestination.id)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Recalculate
                    </button>
                  </div>
                </div>
              )}

              {/* Route Map Visualization */}
              <div ref={mapContainerRef}>
                <RouteMap
                  pickup={activeDestination.pickup}
                  dropoff={activeDestination.dropoff}
                  distanceMiles={activeDestination.route?.distance_miles}
                  durationMinutes={activeDestination.route?.duration_minutes}
                  className="h-64 mt-4"
                />
              </div>
            </div>
          </div>

          {/* Load Blocks Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Loads / Trucks</h2>
                <p className="text-sm text-gray-500">Each load block groups equipment type, cargo, rates, and accessorials together</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLoadTypesSettings(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Manage load types"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => addLoadBlockToDestination(activeDestination.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Load Block
                </button>
              </div>
            </div>

            {activeDestination.load_blocks.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-500 mb-2">No load blocks yet</p>
                <p className="text-sm text-gray-400">Click &quot;Add Load Block&quot; to create a bundled truck+cargo+rates group</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeDestination.load_blocks.map((block, blockIndex) => {
                  const blockTotals = calculateBlockTotal(block)
                  const truckType = equipmentTypes.find((t) => t.id === block.truck_type_id)
                  return (
                    <div key={block.id} className="border-2 border-blue-200 rounded-xl overflow-hidden">
                      {/* Block Header */}
                      <div className="bg-blue-50 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                            {blockIndex + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-gray-900">Load Block #{blockIndex + 1}</span>
                            {truckType && <span className="ml-2 text-sm text-blue-600">• {truckType.name}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-blue-600">{formatCurrency(blockTotals.total)}</span>
                          <button
                            onClick={() => removeLoadBlock(block.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Equipment Type Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                          {customTruckInput[block.id] !== undefined ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={customTruckInput[block.id] || ''}
                                onChange={(e) => setCustomTruckInput((prev) => ({ ...prev, [block.id]: e.target.value }))}
                                placeholder="Enter custom equipment type..."
                                className="flex-1 px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-blue-50"
                                autoFocus
                              />
                              <button
                                onClick={() => addCustomTruckType(block.id, customTruckInput[block.id])}
                                className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setCustomTruckInput((prev) => {
                                  const updated = { ...prev }
                                  delete updated[block.id]
                                  return updated
                                })}
                                className="p-2.5 text-gray-400 hover:text-gray-600"
                                title="Back to dropdown"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <select
                                value={block.truck_type_id}
                                onChange={(e) => {
                                  if (e.target.value === '__custom__') {
                                    setCustomTruckInput((prev) => ({ ...prev, [block.id]: '' }))
                                  } else {
                                    handleManualTruckSelect(block.id, e.target.value)
                                  }
                                }}
                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 ${
                                  truckRecommendations[block.id]?.recommendedId && block.truck_type_id === truckRecommendations[block.id]?.recommendedId
                                    ? 'border-green-400 bg-green-50'
                                    : truckRecommendations[block.id]?.isManualOverride
                                    ? 'border-yellow-400 bg-yellow-50'
                                    : 'border-gray-300'
                                }`}
                              >
                                <option value="">Select equipment type</option>
                                {equipmentTypes.map((type) => (
                                  <option key={type.id} value={type.id}>
                                    {type.name}
                                    {truckRecommendations[block.id]?.recommendedId === type.id ? ' ✓ Recommended' : ''}
                                  </option>
                                ))}
                                <option value="__custom__" className="text-blue-600 font-medium">+ Custom equipment type...</option>
                              </select>
                              {/* Recommendation indicator */}
                              {truckRecommendations[block.id]?.recommendedId && (
                                <div className="space-y-1">
                                  {/* Multi-truck alert */}
                                  {truckRecommendations[block.id]?.multiTruckSuggestion?.needsMultipleTrucks && (
                                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <div className="flex-1 text-xs text-blue-800">
                                          <strong>Multiple trucks needed:</strong> {truckRecommendations[block.id]?.multiTruckSuggestion?.suggestion}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => splitLoadIntoMultipleTrucks(block.id)}
                                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                      >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                        Split into {truckRecommendations[block.id]?.multiTruckSuggestion?.trucksNeeded} Load Blocks
                                      </button>
                                    </div>
                                  )}
                                  {/* Standard recommendation */}
                                  <div className={`text-xs flex items-center gap-1 ${
                                    block.truck_type_id === truckRecommendations[block.id]?.recommendedId
                                      ? 'text-green-600'
                                      : 'text-yellow-600'
                                  }`}>
                                    {block.truck_type_id === truckRecommendations[block.id]?.recommendedId ? (
                                      <>
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Auto-selected based on cargo dimensions</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span>Recommended: {truckRecommendations[block.id]?.reason}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Cargo Items in Block */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Cargo Items</span>
                            <button
                              onClick={() => addCargoItemToBlock(block.id)}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              + Add Cargo
                            </button>
                          </div>
                          {block.cargo_items.length === 0 ? (
                            <p className="text-sm text-gray-400">No cargo items. Click "+ Add Cargo"</p>
                          ) : (
                            <div className="space-y-3">
                              {block.cargo_items.map((cargo, cargoIndex) => (
                                <div key={cargo.id} className={`p-3 rounded-lg border ${cargo.is_equipment ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'}`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-medium text-gray-500">Item {cargoIndex + 1}</span>
                                      {/* Equipment Toggle */}
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <span className="text-xs text-gray-500">Equipment</span>
                                        <button
                                          type="button"
                                          onClick={() => toggleCargoEquipmentMode(block.id, cargo.id, !cargo.is_equipment)}
                                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                            cargo.is_equipment ? 'bg-purple-600' : 'bg-gray-300'
                                          }`}
                                        >
                                          <span
                                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                              cargo.is_equipment ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                          />
                                        </button>
                                      </label>
                                    </div>
                                    <button
                                      onClick={() => removeCargoItemFromBlock(block.id, cargo.id)}
                                      className="p-1 text-red-400 hover:text-red-600"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>

                                  {/* Equipment Mode - Make/Model Selection */}
                                  {cargo.is_equipment && (
                                    <div className="mb-3 p-2 bg-purple-100 rounded-lg">
                                      <div className="flex items-center gap-2 mb-2">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={cargo.is_custom_equipment || false}
                                            onChange={(e) => {
                                              updateCargoItemInBlock(block.id, cargo.id, 'is_custom_equipment', e.target.checked)
                                              if (e.target.checked) {
                                                updateCargoItemInBlock(block.id, cargo.id, 'equipment_make', null)
                                                updateCargoItemInBlock(block.id, cargo.id, 'equipment_model', null)
                                                updateCargoItemInBlock(block.id, cargo.id, 'equipment_model_id', null)
                                              }
                                            }}
                                            className="rounded text-purple-600 focus:ring-purple-500"
                                          />
                                          <span className="text-xs text-purple-700">Custom Equipment</span>
                                        </label>
                                      </div>
                                      {cargo.is_custom_equipment ? (
                                        <div className="grid grid-cols-2 gap-2">
                                          <input
                                            type="text"
                                            value={cargo.equipment_make || ''}
                                            onChange={(e) => {
                                              updateCargoItemInBlock(block.id, cargo.id, 'equipment_make', e.target.value)
                                              updateCargoItemInBlock(block.id, cargo.id, 'description', `${e.target.value} ${cargo.equipment_model || ''}`.trim())
                                            }}
                                            placeholder="Make (e.g., Caterpillar)"
                                            className="px-2 py-1.5 border border-purple-300 rounded text-sm bg-white"
                                          />
                                          <input
                                            type="text"
                                            value={cargo.equipment_model || ''}
                                            onChange={(e) => {
                                              updateCargoItemInBlock(block.id, cargo.id, 'equipment_model', e.target.value)
                                              updateCargoItemInBlock(block.id, cargo.id, 'description', `${cargo.equipment_make || ''} ${e.target.value}`.trim())
                                            }}
                                            placeholder="Model (e.g., D6T)"
                                            className="px-2 py-1.5 border border-purple-300 rounded text-sm bg-white"
                                          />
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                          <select
                                            value={cargo.equipment_make || ''}
                                            onChange={(e) => {
                                              updateCargoItemInBlock(block.id, cargo.id, 'equipment_make', e.target.value)
                                              updateCargoItemInBlock(block.id, cargo.id, 'equipment_model', null)
                                              updateCargoItemInBlock(block.id, cargo.id, 'equipment_model_id', null)
                                            }}
                                            className="px-2 py-1.5 border border-purple-300 rounded text-sm bg-white"
                                          >
                                            <option value="">Select Make</option>
                                            {equipmentMakes.map((make) => (
                                              <option key={make} value={make}>{make}</option>
                                            ))}
                                          </select>
                                          <select
                                            value={cargo.equipment_model_id || ''}
                                            onChange={(e) => {
                                              const modelId = e.target.value
                                              const modelInfo = equipmentModelsMap[cargo.equipment_make || '']?.find(m => m.modelId === modelId)
                                              if (modelInfo) {
                                                handleEquipmentSelect(block.id, cargo.id, cargo.equipment_make || '', modelInfo.model, modelId)
                                              }
                                            }}
                                            className="px-2 py-1.5 border border-purple-300 rounded text-sm bg-white"
                                            disabled={!cargo.equipment_make}
                                          >
                                            <option value="">Select Model</option>
                                            {(equipmentModelsMap[cargo.equipment_make || ''] || []).map((m) => (
                                              <option key={m.modelId} value={m.modelId}>{m.model}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                      {/* Equipment Images */}
                                      {(cargo.front_image_base64 || cargo.side_image_base64) && (
                                        <div className="flex gap-2 mt-2">
                                          {cargo.front_image_base64 && (
                                            <div className="relative">
                                              <img src={cargo.front_image_base64} alt="Front" className="h-16 rounded border border-purple-200" />
                                              <span className="absolute bottom-0 left-0 right-0 text-center text-xs bg-black bg-opacity-50 text-white rounded-b">Front</span>
                                            </div>
                                          )}
                                          {cargo.side_image_base64 && (
                                            <div className="relative">
                                              <img src={cargo.side_image_base64} alt="Side" className="h-16 rounded border border-purple-200" />
                                              <span className="absolute bottom-0 left-0 right-0 text-center text-xs bg-black bg-opacity-50 text-white rounded-b">Side</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                                    <div className="sm:col-span-2 lg:col-span-1">
                                      <label className="block text-xs text-gray-400 mb-0.5">Description</label>
                                      <input
                                        type="text"
                                        value={cargo.description}
                                        onChange={(e) => updateCargoItemInBlock(block.id, cargo.id, 'description', e.target.value)}
                                        placeholder="Description"
                                        className={`w-full px-2 py-1.5 border rounded text-sm ${cargo.is_equipment ? 'border-purple-300 bg-purple-50' : 'border-gray-300'}`}
                                        readOnly={cargo.is_equipment && !cargo.is_custom_equipment && !!cargo.equipment_model_id}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-0.5">Type</label>
                                      {customCargoTypeInput[cargo.id] !== undefined ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={customCargoTypeInput[cargo.id] || ''}
                                            onChange={(e) => setCustomCargoTypeInput((prev) => ({ ...prev, [cargo.id]: e.target.value }))}
                                            placeholder="Custom type..."
                                            className="flex-1 px-2 py-1.5 border border-blue-300 rounded text-sm bg-blue-50"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => addCustomLoadType(block.id, cargo.id, customCargoTypeInput[cargo.id])}
                                            className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                          >
                                            +
                                          </button>
                                          <button
                                            onClick={() => setCustomCargoTypeInput((prev) => {
                                              const updated = { ...prev }
                                              delete updated[cargo.id]
                                              return updated
                                            })}
                                            className="p-1.5 text-gray-400 hover:text-gray-600"
                                          >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                          </button>
                                        </div>
                                      ) : (
                                        <select
                                          value={cargo.cargo_type}
                                          onChange={(e) => {
                                            if (e.target.value === '__custom__') {
                                              setCustomCargoTypeInput((prev) => ({ ...prev, [cargo.id]: '' }))
                                            } else {
                                              updateCargoItemInBlock(block.id, cargo.id, 'cargo_type', e.target.value)
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                        >
                                          {getCargoTypes().map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                          ))}
                                          <option value="__custom__" className="text-blue-600">+ Custom...</option>
                                        </select>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-0.5">Weight</label>
                                      <div className="flex">
                                        <input
                                          type="number"
                                          min="0"
                                          defaultValue={cargo.weight_lbs || ''}
                                          key={`weight-${cargo.id}-${cargo.weight_lbs}`}
                                          onBlur={(e) => {
                                            const val = parseFloat(e.target.value)
                                            if (isNaN(val)) {
                                              updateCargoItemInBlock(block.id, cargo.id, 'weight_lbs', null)
                                            } else {
                                              const unit = (e.target.nextElementSibling as HTMLSelectElement)?.value || 'lbs'
                                              const lbs = convertToLbs(val, unit)
                                              updateCargoItemInBlock(block.id, cargo.id, 'weight_lbs', lbs)
                                              e.target.value = lbs.toString()
                                            }
                                          }}
                                          placeholder="0"
                                          className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-l text-sm"
                                        />
                                        <select
                                          defaultValue="lbs"
                                          className="w-14 px-1 py-1.5 border border-l-0 border-gray-300 rounded-r text-xs bg-gray-50"
                                        >
                                          {WEIGHT_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-0.5">Qty</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={cargo.quantity}
                                        onChange={(e) => updateCargoItemInBlock(block.id, cargo.id, 'quantity', parseInt(e.target.value) || 1)}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 mb-2">
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-0.5">Length</label>
                                      <div className="flex">
                                        <input
                                          type="text"
                                          defaultValue={cargo.length_inches ? inchesToFtInString(cargo.length_inches) : ''}
                                          key={`length-${cargo.id}-${cargo.length_inches}`}
                                          onBlur={(e) => {
                                            const val = e.target.value.trim()
                                            if (!val) {
                                              updateCargoItemInBlock(block.id, cargo.id, 'length_inches', null)
                                              return
                                            }
                                            const unit = (e.target.nextElementSibling as HTMLSelectElement)?.value || 'ft.in'
                                            let totalInches: number | null = null
                                            if (unit === 'ft.in') {
                                              totalInches = parseSmartDimension(val, 'length')
                                            } else {
                                              const num = parseFloat(val)
                                              if (!isNaN(num)) totalInches = convertToInches(num, unit)
                                            }
                                            updateCargoItemInBlock(block.id, cargo.id, 'length_inches', totalInches)
                                            if (totalInches !== null) e.target.value = inchesToFtInString(totalInches)
                                          }}
                                          placeholder="13.3"
                                          className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-l text-sm"
                                        />
                                        <select
                                          defaultValue="ft.in"
                                          className="px-1 py-1.5 border border-l-0 border-gray-300 rounded-r text-xs bg-gray-50"
                                        >
                                          {DIMENSION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-0.5">Width</label>
                                      <div className="flex">
                                        <input
                                          type="text"
                                          defaultValue={cargo.width_inches ? inchesToFtInString(cargo.width_inches) : ''}
                                          key={`width-${cargo.id}-${cargo.width_inches}`}
                                          onBlur={(e) => {
                                            const val = e.target.value.trim()
                                            if (!val) {
                                              updateCargoItemInBlock(block.id, cargo.id, 'width_inches', null)
                                              return
                                            }
                                            const unit = (e.target.nextElementSibling as HTMLSelectElement)?.value || 'ft.in'
                                            let totalInches: number | null = null
                                            if (unit === 'ft.in') {
                                              totalInches = parseSmartDimension(val, 'width')
                                            } else {
                                              const num = parseFloat(val)
                                              if (!isNaN(num)) totalInches = convertToInches(num, unit)
                                            }
                                            updateCargoItemInBlock(block.id, cargo.id, 'width_inches', totalInches)
                                            if (totalInches !== null) e.target.value = inchesToFtInString(totalInches)
                                          }}
                                          placeholder="8.6"
                                          className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-l text-sm"
                                        />
                                        <select
                                          defaultValue="ft.in"
                                          className="px-1 py-1.5 border border-l-0 border-gray-300 rounded-r text-xs bg-gray-50"
                                        >
                                          {DIMENSION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-0.5">Height</label>
                                      <div className="flex">
                                        <input
                                          type="text"
                                          defaultValue={cargo.height_inches ? inchesToFtInString(cargo.height_inches) : ''}
                                          key={`height-${cargo.id}-${cargo.height_inches}`}
                                          onBlur={(e) => {
                                            const val = e.target.value.trim()
                                            if (!val) {
                                              updateCargoItemInBlock(block.id, cargo.id, 'height_inches', null)
                                              return
                                            }
                                            const unit = (e.target.nextElementSibling as HTMLSelectElement)?.value || 'ft.in'
                                            let totalInches: number | null = null
                                            if (unit === 'ft.in') {
                                              totalInches = parseSmartDimension(val, 'height')
                                            } else {
                                              const num = parseFloat(val)
                                              if (!isNaN(num)) totalInches = convertToInches(num, unit)
                                            }
                                            updateCargoItemInBlock(block.id, cargo.id, 'height_inches', totalInches)
                                            if (totalInches !== null) e.target.value = inchesToFtInString(totalInches)
                                          }}
                                          placeholder="10"
                                          className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-l text-sm"
                                        />
                                        <select
                                          defaultValue="ft.in"
                                          className="px-1 py-1.5 border border-l-0 border-gray-300 rounded-r text-xs bg-gray-50"
                                        >
                                          {DIMENSION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Per-cargo image */}
                                  <div className="mt-2">
                                    {cargo.image_base64 ? (
                                      <div className="relative inline-block">
                                        <img src={cargo.image_base64} alt="Cargo" className="h-20 rounded border" />
                                        <button
                                          onClick={() => updateCargoItemInBlock(block.id, cargo.id, 'image_base64', null)}
                                          className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                        >
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                    ) : (
                                      <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Add Image
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            if (file.size > 5 * 1024 * 1024) {
                                              setError('Image must be less than 5MB')
                                              return
                                            }
                                            const reader = new FileReader()
                                            reader.onload = (ev) => {
                                              updateCargoItemInBlock(block.id, cargo.id, 'image_base64', ev.target?.result as string)
                                            }
                                            reader.readAsDataURL(file)
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Rates in Block */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Rates</span>
                            <button
                              onClick={() => addServiceItemToBlock(block.id)}
                              className="text-sm text-green-600 hover:text-green-700"
                            >
                              + Add Rate
                            </button>
                          </div>
                          {block.service_items.length === 0 ? (
                            <p className="text-sm text-gray-400">No rates. Click "+ Add Rate"</p>
                          ) : (
                            <div className="space-y-2">
                              {block.service_items.map((item) => (
                                <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Service type - dropdown for predefined or text input for custom */}
                                    {item.name === '__custom__' || (item.name && !serviceTypes.find(s => s.name === item.name) && item.name !== '__custom__') ? (
                                      <div className="flex-1 min-w-[140px] flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={item.name === '__custom__' ? '' : item.name}
                                          onChange={(e) => updateServiceItemInBlock(block.id, item.id, 'name', e.target.value)}
                                          placeholder="Enter custom service name..."
                                          className="flex-1 px-2 py-1.5 border border-blue-300 rounded text-sm bg-blue-50"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => updateServiceItemInBlock(block.id, item.id, 'name', '')}
                                          className="p-1 text-gray-400 hover:text-gray-600"
                                          title="Back to dropdown"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                          </svg>
                                        </button>
                                      </div>
                                    ) : (
                                      <select
                                        value={item.name}
                                        onChange={(e) => {
                                          if (e.target.value === '__custom__') {
                                            updateServiceItemInBlock(block.id, item.id, 'name', '__custom__')
                                          } else {
                                            const selectedService = serviceTypes.find(s => s.name === e.target.value)
                                            updateServiceItemInBlock(block.id, item.id, 'name', e.target.value)
                                            // Auto-fill price if service has default price and current price is 0
                                            if (selectedService?.default_price && item.price === 0) {
                                              updateServiceItemInBlock(block.id, item.id, 'price', selectedService.default_price)
                                            }
                                          }
                                        }}
                                        className="flex-1 min-w-[140px] px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
                                      >
                                        <option value="">Select service type...</option>
                                        {serviceTypes.map((st) => (
                                          <option key={st.id} value={st.name}>{st.name}</option>
                                        ))}
                                        <option value="__custom__" className="text-blue-600 font-medium">+ Custom service...</option>
                                      </select>
                                    )}
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) => updateServiceItemInBlock(block.id, item.id, 'description', e.target.value)}
                                      placeholder="Description (optional)"
                                      className="flex-1 min-w-[120px] px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    />
                                    <div className="flex items-center gap-2">
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 mb-0.5">Qty</span>
                                        <input
                                          type="number"
                                          min="1"
                                          value={item.quantity}
                                          onChange={(e) => updateServiceItemInBlock(block.id, item.id, 'quantity', parseInt(e.target.value) || 1)}
                                          className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-center"
                                        />
                                      </div>
                                      <span className="text-gray-400 text-lg">×</span>
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 mb-0.5">Price</span>
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={item.price || ''}
                                            onFocus={(e) => { if (item.price === 0) e.target.value = '' }}
                                            onChange={(e) => updateServiceItemInBlock(block.id, item.id, 'price', parseFloat(e.target.value) || 0)}
                                            onBlur={(e) => { if (e.target.value === '') updateServiceItemInBlock(block.id, item.id, 'price', 0) }}
                                            placeholder="0"
                                            className="w-28 pl-5 pr-2 py-1.5 border border-gray-300 rounded text-sm"
                                          />
                                        </div>
                                      </div>
                                      <span className="text-gray-400 text-lg">=</span>
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 mb-0.5">Total</span>
                                        <span className="text-sm font-semibold text-green-700 py-1.5">
                                          {formatCurrency(item.price * item.quantity)}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => removeServiceItemFromBlock(block.id, item.id)}
                                      className="p-1 text-red-400 hover:text-red-600 ml-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div className="text-right text-sm font-medium text-green-700">
                                Block Total: {formatCurrency(blockTotals.serviceTotal)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Accessorials in Block */}
                        <div className="bg-amber-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Accessorial Charges (Conditional)</span>
                            <button
                              onClick={() => {
                                setActiveLoadBlockId(block.id)
                                setShowAccessorialModal(true)
                              }}
                              className="text-sm text-amber-600 hover:text-amber-700"
                            >
                              + Add Accessorial
                            </button>
                          </div>
                          {block.accessorial_charges.length === 0 ? (
                            <p className="text-sm text-gray-400">No accessorials. Click "+ Add Accessorial"</p>
                          ) : (
                            <div className="space-y-2">
                              {block.accessorial_charges.map((charge) => {
                                const chargeTotal = charge.is_percentage
                                  ? blockTotals.serviceTotal * (charge.amount / 100) * (charge.quantity || 1)
                                  : charge.amount * (charge.quantity || 1)
                                return (
                                  <div key={charge.id} className="bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-gray-900 text-sm">{charge.type_name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-amber-600">{formatCurrency(chargeTotal)}</span>
                                        <button
                                          onClick={() => removeAccessorialFromBlock(block.id, charge.id!)}
                                          className="p-1 text-red-400 hover:text-red-600"
                                        >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        {!charge.is_percentage && <span className="text-gray-400 text-xs">$</span>}
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={charge.amount}
                                          onChange={(e) => updateAccessorialInBlock(block.id, charge.id!, { amount: parseFloat(e.target.value) || 0 })}
                                          className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                                        />
                                        {charge.is_percentage && <span className="text-gray-400 text-xs">%</span>}
                                      </div>
                                      <select
                                        value={charge.billing_unit}
                                        onChange={(e) => updateAccessorialInBlock(block.id, charge.id!, { billing_unit: e.target.value as AccessorialBillingUnit })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                                      >
                                        {BILLING_UNIT_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                      {charge.billing_unit !== 'flat' && (
                                        <input
                                          type="number"
                                          min="1"
                                          value={charge.quantity || 1}
                                          onChange={(e) => updateAccessorialInBlock(block.id, charge.id!, { quantity: parseInt(e.target.value) || 1 })}
                                          className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                                          placeholder="Qty"
                                        />
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Block Load Image */}
                        <div className="border border-gray-200 rounded-lg p-4">
                          <span className="text-sm font-medium text-gray-700 block mb-2">Block Image</span>
                          {block.load_image_base64 ? (
                            <div className="relative inline-block">
                              <img src={block.load_image_base64} alt="Load" className="max-h-32 rounded border" />
                              <button
                                onClick={() => updateLoadBlock(block.id, { load_image_base64: null })}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                              <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-gray-500">Upload block image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleLoadBlockImageUpload(block.id, e)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* All Blocks Total */}
                {formData.load_blocks.length > 0 && (
                  <div className="bg-blue-100 rounded-lg p-4 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">All Load Blocks Total</span>
                    <span className="text-xl font-bold text-blue-700">{formatCurrency(calculateAllBlocksTotal())}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (for carrier)</label>
                <textarea
                  value={activeDestination?.special_instructions || ''}
                  onChange={(e) => activeDestination && updateDestinationBlock(activeDestination.id, { special_instructions: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="Enter special instructions..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Notes (appears on quote)</label>
                <textarea
                  value={activeDestination?.customer_notes || ''}
                  onChange={(e) => activeDestination && updateDestinationBlock(activeDestination.id, { customer_notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="Notes for the customer..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes (not shown to customer)</label>
                <textarea
                  value={activeDestination?.internal_notes || ''}
                  onChange={(e) => activeDestination && updateDestinationBlock(activeDestination.id, { internal_notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="Internal notes..."
                />
              </div>
            </div>
          </div>
            </>
          )}
          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadPdf}
                disabled={!(formData.destination_blocks?.some(d => d.pickup && d.dropoff) || (formData.pickup && formData.dropoff))}
                className="flex-1 min-w-[200px] px-4 py-3 text-white bg-blue-600 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Download PDF
              </button>

              <button
                onClick={() => saveQuote('draft')}
                disabled={isSaving}
                className="flex-1 min-w-[200px] px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : editingQuoteId ? 'Update Draft' : 'Save as Draft'}
              </button>

              <button
                onClick={() => saveQuote('sent')}
                disabled={isSaving}
                className="flex-1 min-w-[200px] px-4 py-2.5 text-green-700 bg-green-50 border border-green-300 rounded-lg font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                {editingQuoteId ? 'Update & Mark as Sent' : 'Save & Mark as Sent'}
              </button>
            </div>
          </div>
        </div>
        </div>
        </div>

        {/* Right Side - PDF Preview */}
        {showPdfPreview && (
          <div className="xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)]">
            <PdfPreview
              pdfBlob={pdfBlob}
              isGenerating={isGeneratingPdf}
              className="h-full min-h-[600px]"
            />
          </div>
        )}
      </div>

      {/* Accessorial Modal */}
      {showAccessorialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Add Accessorial Charge</h3>
                <p className="text-sm text-gray-500">
                  {activeLoadBlockId ? 'Adding to Load Block' : 'Select a charge type to add to the quote'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAccessorialModal(false)
                  setActiveLoadBlockId(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {accessorialTypes.map((type) => {
                  const billingUnitLabel = type.billing_unit ? BILLING_UNIT_LABELS[type.billing_unit] : 'Flat Fee'
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        if (activeLoadBlockId) {
                          addAccessorialToBlock(activeLoadBlockId, type)
                        } else {
                          addAccessorialCharge(type)
                        }
                      }}
                      className="w-full p-4 text-left hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-gray-900">{type.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {billingUnitLabel}
                          </span>
                          <span className="text-sm font-medium text-blue-600">
                            {type.is_percentage ? `${type.default_amount}%` : formatCurrency(type.default_amount || 0)}
                          </span>
                        </div>
                      </div>
                      {type.description && (
                        <div className="text-sm text-gray-500 mt-1">{type.description}</div>
                      )}
                      {type.condition_text && (
                        <div className="text-xs text-gray-400 mt-2 italic border-l-2 border-gray-200 pl-2">
                          {type.condition_text}
                        </div>
                      )}
                      {(type.free_time_hours && type.free_time_hours > 0) && (
                        <div className="text-xs text-green-600 mt-1">
                          {type.free_time_hours} hours free time included
                        </div>
                      )}
                    </button>
                  )
                })}

                {/* Custom Accessorial Input */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Or add a custom accessorial:</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={customAccessorialName}
                      onChange={(e) => setCustomAccessorialName(e.target.value)}
                      placeholder="Accessorial name..."
                      className="flex-1 min-w-[150px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={customAccessorialAmount || ''}
                        onChange={(e) => setCustomAccessorialAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Amount"
                        className="w-24 pl-5 pr-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <select
                      value={customAccessorialBillingUnit}
                      onChange={(e) => setCustomAccessorialBillingUnit(e.target.value as AccessorialBillingUnit)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      {BILLING_UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={addCustomAccessorialType}
                      disabled={!customAccessorialName.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Lanes Modal */}
      {showSavedLanesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Saved Lanes</h3>
              <button
                onClick={() => setShowSavedLanesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {savedLanes.map((lane) => (
                  <button
                    key={lane.id}
                    onClick={() => useSavedLane(lane)}
                    className="w-full p-4 text-left hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
                  >
                    <div className="font-semibold text-gray-900">{lane.name}</div>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 font-medium">From:</span>
                        <span>{lane.origin_city}, {lane.origin_state}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-600 font-medium">To:</span>
                        <span>{lane.destination_city}, {lane.destination_state}</span>
                      </div>
                    </div>
                    {lane.distance_miles && (
                      <div className="text-sm text-gray-500 mt-2">
                        {lane.distance_miles.toFixed(0)} miles | Used {lane.use_count || 0} times
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accessorial Settings Modal */}
      {showAccessorialSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Accessorial Fee Settings</h3>
                  <p className="text-sm text-gray-500">Manage default accessorial charges</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAccessorialSettings(false)
                  setEditingAccessorialType(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {/* Existing Accessorial Types */}
              <div className="space-y-3 mb-6">
                {accessorialTypes.map((type) => (
                  <div key={type.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {editingAccessorialType?.id === type.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                            <input
                              type="text"
                              value={editingAccessorialType.name}
                              onChange={(e) => setEditingAccessorialType({ ...editingAccessorialType, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Default Amount</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={editingAccessorialType.default_amount || 0}
                                onChange={(e) => setEditingAccessorialType({ ...editingAccessorialType, default_amount: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <label className="flex items-center gap-1 text-sm">
                                <input
                                  type="checkbox"
                                  checked={editingAccessorialType.is_percentage}
                                  onChange={(e) => setEditingAccessorialType({ ...editingAccessorialType, is_percentage: e.target.checked })}
                                  className="rounded"
                                />
                                %
                              </label>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                          <input
                            type="text"
                            value={editingAccessorialType.description || ''}
                            onChange={(e) => setEditingAccessorialType({ ...editingAccessorialType, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Optional description..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingAccessorialType(null)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveAccessorialType(editingAccessorialType)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{type.name}</span>
                          <span className="ml-2 text-sm text-gray-500">
                            {type.is_percentage ? `${type.default_amount || 0}%` : `$${(type.default_amount || 0).toFixed(2)}`}
                          </span>
                          {type.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{type.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingAccessorialType(type)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteAccessorialType(type.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Accessorial Type */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Accessorial Fee</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={newAccessorialType.name}
                      onChange={(e) => setNewAccessorialType({ ...newAccessorialType, name: e.target.value })}
                      placeholder="e.g., Tarp Fee"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Default Amount</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={newAccessorialType.default_amount}
                        onChange={(e) => setNewAccessorialType({ ...newAccessorialType, default_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={newAccessorialType.is_percentage}
                          onChange={(e) => setNewAccessorialType({ ...newAccessorialType, is_percentage: e.target.checked })}
                          className="rounded"
                        />
                        %
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={newAccessorialType.description}
                    onChange={(e) => setNewAccessorialType({ ...newAccessorialType, description: e.target.value })}
                    placeholder="Optional description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={addNewAccessorialType}
                  disabled={!newAccessorialType.name.trim()}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add Accessorial Fee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Signature Parser Modal */}
      {showSignatureParser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Parse Email Signature</h3>
                  <p className="text-sm text-gray-500">Paste a signature to auto-fill client info</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSignatureParser(false)
                  setSignatureText('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste email signature here
                </label>
                <textarea
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-mono text-sm"
                  placeholder={`Example:
John Smith
Sales Manager at ABC Company Inc.
john.smith@abccompany.com
(555) 123-4567
123 Main Street
New York, NY 10001`}
                />
              </div>
              <div className="bg-purple-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-700">
                  <strong>Tip:</strong> Select and copy the signature block from an email, then paste it above.
                  The parser will extract name, company, email, phone, and address.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleParseSignature}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Parse & Fill Fields
                </button>
                <button
                  onClick={() => {
                    setShowSignatureParser(false)
                    setSignatureText('')
                  }}
                  className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add New Customer</h3>
              <button
                onClick={() => {
                  setShowAddCustomer(false)
                  setNewCustomer({})
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustomer.name || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={newCustomer.company || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newCustomer.email || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newCustomer.phone || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newCustomer.address || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Street address"
                />
              </div>
            </div>
            <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddCustomer(false)
                  setNewCustomer({})
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Types Settings Modal */}
      {showLoadTypesSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Load Types Settings</h3>
                  <p className="text-sm text-gray-500">Manage cargo/load type options</p>
                </div>
              </div>
              <button
                onClick={() => setShowLoadTypesSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {/* Existing Load Types */}
              <div className="space-y-2 mb-6">
                {loadTypes.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="mb-2">No custom load types yet</p>
                    <p className="text-xs">Using default cargo types. Add your own below.</p>
                  </div>
                ) : (
                  loadTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <span className="font-medium text-gray-900">{type.name}</span>
                        {type.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteLoadType(type.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Default Types Reference */}
              {loadTypes.length === 0 && (
                <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-2">Default Load Types (currently in use):</p>
                  <div className="flex flex-wrap gap-1">
                    {CARGO_TYPES.map((type) => (
                      <span key={type} className="px-2 py-0.5 bg-white text-xs text-gray-600 rounded border">{type}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Load Type */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Load Type</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                    <input
                      type="text"
                      value={newLoadType.name}
                      onChange={(e) => setNewLoadType({ ...newLoadType, name: e.target.value })}
                      placeholder="e.g., Heavy Machinery"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={newLoadType.description}
                      onChange={(e) => setNewLoadType({ ...newLoadType, description: e.target.value })}
                      placeholder="Brief description..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                    />
                  </div>
                  <button
                    onClick={addNewLoadType}
                    disabled={!newLoadType.name.trim()}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Load Type
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
