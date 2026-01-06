'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, RateLookup, LocationCost, LOCATIONS, COST_FIELDS, Location, QuoteData, CompanySettings, QuoteTemplate, MiscellaneousFee, EquipmentDimensions, QuoteDimensions, Customer, RecentEquipment, QuoteDraft, InlandAccessorialType, InlandEquipmentType, ParsedAddress, RouteResult, InlandServiceItem, InlandCargoItem, InlandTransportationData, InlandLoadBlock, InlandServiceType, InlandAccessorialCharge, InlandLoadType, InlandDestinationBlock, Contact, Company, EquipmentBlock } from '../lib/supabase'

// Type for contact with company info for dropdown
interface ContactWithCompany extends Contact {
  company?: Company | null
}
import { generateQuoteNumber, calculateTotalCost } from '../lib/quoteGenerator'
import { generateProfessionalQuotePDF, generateProfessionalQuotePDFPreview, generateProfessionalQuotePDFBlobAsync, generateProfessionalQuotePDFAsync, generateProfessionalQuotePDFPreviewAsync } from '../lib/professionalQuoteGenerator'
import SearchableSelect from './SearchableSelect'
import { POPULAR_MAKES } from '../lib/sorting'
import { validateEmail, validatePhone, sanitizeText } from '../lib/security'
import { parseEmailSignature } from '../lib/emailSignatureParser'
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete'
import RouteMap from './RouteMap'
import PdfPreview from './PdfPreview'
import { generateInlandQuotePdf } from '@/lib/inlandQuoteGenerator'
import html2canvas from 'html2canvas'

// ============================================
// SMART DIMENSION CONVERSION HELPERS
// ============================================

// Default thresholds for auto-detecting if input is feet vs inches
// Values ABOVE these are assumed to be in inches (because they'd be unreasonably large in feet)
const DEFAULT_DIMENSION_THRESHOLDS = {
  length: 70,   // Equipment rarely exceeds 70 feet long, so 70+ is likely inches
  width: 16,    // Equipment rarely exceeds 16 feet wide, so 16+ is likely inches
  height: 18,   // Equipment rarely exceeds 18 feet tall, so 18+ is likely inches
}

// Convert inches to ft.in format (e.g., 136 inches -> "11.4" meaning 11 ft 4 in)
function inchesToFtInDecimal(totalInches: number): number {
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  // Return as decimal: feet.inches (e.g., 11 ft 4 in = 11.4)
  return parseFloat(`${feet}.${inches}`)
}

// Convert inches to display string (e.g., 136 -> "11 ft 4 in")
function inchesToFtInString(totalInches: number): string {
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  if (inches === 0) {
    return `${feet} ft`
  }
  return `${feet} ft ${inches} in`
}

// Smart dimension parser: detects if input is feet.inches or plain inches and returns value in inches
// - If input contains a decimal (e.g., 10.5), treat as ft.in format (10 feet 5 inches = 125 inches)
// - If input is a whole number above threshold, treat as inches
// - If input is a whole number below threshold, treat as feet and convert to inches
function parseSmartDimensionWithThresholds(
  value: string,
  dimensionType: 'length' | 'width' | 'height',
  thresholds: { length: number; width: number; height: number }
): number | null {
  if (!value || value.trim() === '') return null

  const trimmed = value.trim()

  // If contains a dot, treat as ft.in format (e.g., 10.5 = 10 feet 5 inches)
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

// Check if a value was likely entered as feet (below threshold)
function wasEnteredAsFeetWithThresholds(
  value: number,
  dimensionType: 'length' | 'width' | 'height',
  thresholds: { length: number; width: number; height: number }
): boolean {
  const threshold = thresholds[dimensionType]
  // If the stored value (in inches) divided by 12 is below threshold, it was likely entered as feet
  const valueInFeet = value / 12
  return valueInFeet <= threshold && value % 12 === 0
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

// ============================================
// TRUCK RECOMMENDATION LOGIC
// ============================================

// Default truck type specifications (industry standards) - used when DB values are not set
const DEFAULT_TRUCK_SPECS: Record<string, { maxWeight: number; maxLength: number; maxWidth: number; maxHeight: number; priority: number }> = {
  'dry van': { maxWeight: 45000, maxLength: 636, maxWidth: 102, maxHeight: 108, priority: 1 },
  'reefer': { maxWeight: 42500, maxLength: 636, maxWidth: 96, maxHeight: 103, priority: 2 },
  'flatbed': { maxWeight: 48000, maxLength: 636, maxWidth: 102, maxHeight: 102, priority: 3 },
  'step deck': { maxWeight: 44000, maxLength: 636, maxWidth: 102, maxHeight: 120, priority: 4 },
  'double drop': { maxWeight: 40000, maxLength: 348, maxWidth: 102, maxHeight: 138, priority: 5 },
  'lowboy': { maxWeight: 40000, maxLength: 348, maxWidth: 102, maxHeight: 144, priority: 6 },
  'rgn': { maxWeight: 42000, maxLength: 636, maxWidth: 102, maxHeight: 140, priority: 7 },
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

// Helper to get truck specs (from DB or defaults)
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
function recommendTruckType(
  cargoItems: InlandCargoItem[],
  equipmentTypes: InlandEquipmentType[]
): TruckRecommendation {
  if (!cargoItems || cargoItems.length === 0 || !equipmentTypes || equipmentTypes.length === 0) {
    return { recommendedId: null, reason: 'No cargo items', requirements: { totalWeight: 0, maxLength: 0, maxWidth: 0, maxHeight: 0 } }
  }

  const totalWeight = cargoItems.reduce((sum, c) => sum + (c.weight_lbs || 0), 0)
  const maxLength = Math.max(...cargoItems.map(c => c.length_inches || 0))
  const maxWidth = Math.max(...cargoItems.map(c => c.width_inches || 0))
  const maxHeight = Math.max(...cargoItems.map(c => c.height_inches || 0))
  const requirements = { totalWeight, maxLength, maxWidth, maxHeight }

  if (totalWeight === 0 && maxLength === 0 && maxWidth === 0 && maxHeight === 0) {
    return { recommendedId: null, reason: 'No dimensions specified', requirements }
  }

  const activeTypes = equipmentTypes.filter(t => t.is_active)
  const typesWithSpecs = activeTypes.map(type => ({ type, specs: getTruckSpecs(type) }))
    .sort((a, b) => {
      if (a.specs.priority !== b.specs.priority) return a.specs.priority - b.specs.priority
      return a.specs.maxWeight - b.specs.maxWeight
    })

  // Find trucks that can handle the ENTIRE load
  const singleTruckCandidates = typesWithSpecs.filter(({ specs }) =>
    (totalWeight === 0 || specs.maxWeight >= totalWeight) &&
    (maxLength === 0 || specs.maxLength >= maxLength) &&
    (maxWidth === 0 || specs.maxWidth >= maxWidth) &&
    (maxHeight === 0 || specs.maxHeight >= maxHeight)
  )

  if (singleTruckCandidates.length > 0) {
    const best = singleTruckCandidates[0]
    let reason = best.type.name
    if (maxHeight > 102) reason = `${best.type.name} (${Math.round(maxHeight/12)}'H cargo)`
    else if (totalWeight > 40000) reason = `${best.type.name} (${totalWeight.toLocaleString()} lbs)`
    return { recommendedId: best.type.id, reason, requirements }
  }

  // Multi-truck logic
  const cargoAssignments: { cargoIndex: number; cargo: InlandCargoItem; bestTruck: typeof typesWithSpecs[0] | null }[] = []
  cargoItems.forEach((cargo, idx) => {
    const fittingTrucks = typesWithSpecs.filter(({ specs }) => cargoFitsOnTruck(cargo, specs))
    cargoAssignments.push({ cargoIndex: idx, cargo, bestTruck: fittingTrucks.length > 0 ? fittingTrucks[0] : null })
  })

  const oversizedCargo = cargoAssignments.filter(a => !a.bestTruck)
  if (oversizedCargo.length > 0) {
    const firstOversized = oversizedCargo[0].cargo
    return {
      recommendedId: null,
      reason: `Item ${oversizedCargo[0].cargoIndex + 1} exceeds all truck limits`,
      requirements,
      multiTruckSuggestion: { needsMultipleTrucks: true, trucksNeeded: 0, truckBreakdown: [], suggestion: 'Some cargo items require specialized/oversized hauling' }
    }
  }

  const truckGroups: Record<string, { truckType: typeof typesWithSpecs[0]; cargoIndices: number[]; totalWeight: number }> = {}
  cargoAssignments.forEach(({ cargoIndex, cargo, bestTruck }) => {
    if (!bestTruck) return
    const truckId = bestTruck.type.id
    if (!truckGroups[truckId]) truckGroups[truckId] = { truckType: bestTruck, cargoIndices: [], totalWeight: 0 }
    truckGroups[truckId].cargoIndices.push(cargoIndex)
    truckGroups[truckId].totalWeight += cargo.weight_lbs || 0
  })

  const truckBreakdown: { truckType: string; truckTypeId: string; count: number; cargoIndices: number[] }[] = []
  let totalTrucksNeeded = 0
  Object.values(truckGroups).forEach(group => {
    const trucksForWeight = Math.ceil(group.totalWeight / group.truckType.specs.maxWeight)
    const trucksNeeded = Math.max(trucksForWeight, Math.ceil(group.cargoIndices.length / 2))
    truckBreakdown.push({ truckType: group.truckType.type.name, truckTypeId: group.truckType.type.id, count: trucksNeeded, cargoIndices: group.cargoIndices })
    totalTrucksNeeded += trucksNeeded
  })

  const suggestion = truckBreakdown.map(b => `${b.count}x ${b.truckType}`).join(' + ')
  const primaryTruck = truckBreakdown.sort((a, b) => b.count - a.count)[0]

  return {
    recommendedId: primaryTruck?.truckTypeId || null,
    reason: `Need ${totalTrucksNeeded} trucks: ${suggestion}`,
    requirements,
    multiTruckSuggestion: { needsMultipleTrucks: true, trucksNeeded: totalTrucksNeeded, truckBreakdown, suggestion }
  }
}

// Parse ft.in string to total inches
function parseFtInString(value: string): number | null {
  if (!value || value.trim() === '') return null
  const trimmed = value.trim()
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.')
    const feet = parseInt(parts[0]) || 0
    const inches = parseInt(parts[1]) || 0
    return feet * 12 + inches
  }
  const numValue = parseFloat(trimmed)
  if (isNaN(numValue)) return null
  return Math.round(numValue)
}

// Convert inches to short display format (e.g., 159 -> "13.3")
function inchesToShortFtIn(totalInches: number): string {
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  if (inches === 0) return `${feet}`
  return `${feet}.${inches}`
}

interface QuoteViewProps {
  showToast: (message: string, type: 'success' | 'error') => void
}

export default function QuoteView({ showToast }: QuoteViewProps) {
  const [allRates, setAllRates] = useState<RateLookup[]>([])
  const [rates, setRates] = useState<RateLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [makes, setMakes] = useState<{ value: string; label: string }[]>([])
  const [models, setModels] = useState<{ value: string; label: string }[]>([])

  // Selection state
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<Location | ''>('')
  const [selectedRate, setSelectedRate] = useState<RateLookup | null>(null)
  const [locationCosts, setLocationCosts] = useState<LocationCost | null>(null)
  const [ratesWithCosts, setRatesWithCosts] = useState<Set<string>>(new Set())
  const [ratesWithDimensions, setRatesWithDimensions] = useState<Set<string>>(new Set())

  // Filter state
  const [filterHasPrice, setFilterHasPrice] = useState(false)
  const [filterHasDimensions, setFilterHasDimensions] = useState(false)

  // Custom quote mode (for equipment not in database)
  const [isCustomQuote, setIsCustomQuote] = useState(false)
  const [customMake, setCustomMake] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [customDimensions, setCustomDimensions] = useState<{
    operatingWeight: number | null
    transportLength: number | null
    transportWidth: number | null
    transportHeight: number | null
  }>({
    operatingWeight: null,
    transportLength: null,
    transportWidth: null,
    transportHeight: null
  })
  // Custom quote images (stored in state, not database)
  const [customImages, setCustomImages] = useState<{
    frontImageBase64: string | null
    sideImageBase64: string | null
  }>({
    frontImageBase64: null,
    sideImageBase64: null
  })

  // Multi-equipment mode
  const [multiEquipmentMode, setMultiEquipmentMode] = useState(false)
  const [equipmentBlocks, setEquipmentBlocks] = useState<EquipmentBlock[]>([])
  const [activeEquipmentBlockId, setActiveEquipmentBlockId] = useState<string | null>(null)

  // Helper function to create a new empty equipment block
  const createEmptyEquipmentBlock = (): EquipmentBlock => ({
    id: crypto.randomUUID(),
    make: '',
    model: '',
    rate: null,
    isCustom: false,
    location: null,
    costs: null,
    costDescriptions: {},
    enabledCosts: {},
    costOverrides: {},
    miscellaneousFees: [],
    dimensions: null,
    frontImageBase64: null,
    sideImageBase64: null,
    quantity: 1,
    notes: ''
  })

  // Add equipment block
  const addEquipmentBlock = () => {
    const newBlock = createEmptyEquipmentBlock()
    setEquipmentBlocks(prev => [...prev, newBlock])
    setActiveEquipmentBlockId(newBlock.id)
  }

  // Remove equipment block
  const removeEquipmentBlock = (blockId: string) => {
    setEquipmentBlocks(prev => prev.filter(b => b.id !== blockId))
    if (activeEquipmentBlockId === blockId) {
      setActiveEquipmentBlockId(equipmentBlocks[0]?.id || null)
    }
  }

  // Update equipment block
  const updateEquipmentBlock = (blockId: string, updates: Partial<EquipmentBlock>) => {
    setEquipmentBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, ...updates } : b
    ))
  }

  // Fetch costs for an equipment block
  const fetchEquipmentBlockCosts = async (blockId: string, rateId: string, location: Location) => {
    const { data } = await supabase
      .from('location_costs')
      .select('*')
      .eq('rate_id', rateId)
      .eq('location', location)
      .single()

    updateEquipmentBlock(blockId, {
      costs: data || null,
      costOverrides: {} // Reset overrides
    })
  }

  // Fetch dimensions and images for an equipment block
  const fetchEquipmentBlockDimensions = async (blockId: string, modelId: string) => {
    const { data } = await supabase
      .from('equipment_dimensions')
      .select('*')
      .eq('model_id', modelId)
      .single()

    if (data) {
      updateEquipmentBlock(blockId, {
        dimensions: {
          operatingWeight: data.operating_weight,
          transportLength: data.transport_length,
          transportWidth: data.transport_width,
          transportHeight: data.transport_height,
          frontImageBase64: data.front_image_base64,
          sideImageBase64: data.side_image_base64
        },
        frontImageBase64: data.front_image_base64,
        sideImageBase64: data.side_image_base64
      })
    }
  }

  // Calculate total for a single equipment block
  const calculateEquipmentBlockTotal = (block: EquipmentBlock): { subtotal: number; margin: number; total: number } => {
    if (!block.costs && Object.keys(block.costOverrides).length === 0) {
      return { subtotal: 0, margin: 0, total: 0 }
    }

    let subtotal = 0
    COST_FIELDS.forEach(({ key }) => {
      if (block.enabledCosts[key] === false) return
      const value = block.costOverrides[key] !== undefined
        ? block.costOverrides[key]
        : (block.costs?.[key as keyof LocationCost] as number | null)
      if (value) subtotal += value
    })

    // Add miscellaneous fees
    block.miscellaneousFees.forEach(fee => {
      subtotal += fee.cost
    })

    // Multiply by quantity
    subtotal *= block.quantity

    const margin = subtotal * (marginPercentage / 100)
    return {
      subtotal,
      margin,
      total: subtotal + margin
    }
  }

  // Calculate total for all equipment blocks
  const calculateAllEquipmentBlocksTotal = (): { subtotal: number; margin: number; total: number } => {
    return equipmentBlocks.reduce(
      (acc, block) => {
        const blockTotal = calculateEquipmentBlockTotal(block)
        return {
          subtotal: acc.subtotal + blockTotal.subtotal,
          margin: acc.margin + blockTotal.margin,
          total: acc.total + blockTotal.total
        }
      },
      { subtotal: 0, margin: 0, total: 0 }
    )
  }

  // Cost descriptions for the quote
  const [costDescriptions, setCostDescriptions] = useState<Record<string, string>>({})

  // Cost field visibility toggles (all enabled by default)
  const [enabledCosts, setEnabledCosts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    COST_FIELDS.forEach(field => {
      initial[field.key] = true
    })
    return initial
  })

  // Cost overrides for this specific quote
  const [costOverrides, setCostOverrides] = useState<Record<string, number | null>>({})

  // Dynamic miscellaneous fees
  const [miscellaneousFees, setMiscellaneousFees] = useState<MiscellaneousFee[]>([])

  // Helper to generate unique ID for misc fees
  const generateMiscFeeId = () => `misc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add new miscellaneous fee
  const addMiscellaneousFee = () => {
    setMiscellaneousFees(prev => [...prev, {
      id: generateMiscFeeId(),
      title: '',
      description: '',
      cost: 0
    }])
  }

  // Remove miscellaneous fee
  const removeMiscellaneousFee = (id: string) => {
    setMiscellaneousFees(prev => prev.filter(fee => fee.id !== id))
  }

  // Update miscellaneous fee
  const updateMiscellaneousFee = (id: string, field: keyof MiscellaneousFee, value: string | number) => {
    setMiscellaneousFees(prev => prev.map(fee =>
      fee.id === id ? { ...fee, [field]: value } : fee
    ))
  }

  // Quote options
  const [marginPercentage, setMarginPercentage] = useState(0)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Email signature parser
  const [showSignatureParser, setShowSignatureParser] = useState(false)
  const [signatureText, setSignatureText] = useState('')

  // Billing information
  const [billingAddress, setBillingAddress] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingZip, setBillingZip] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')

  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])

  // Customer management - now uses contacts with companies
  const [customers, setCustomers] = useState<Customer[]>([])
  const [contacts, setContacts] = useState<ContactWithCompany[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | ''>('')
  const [selectedContactId, setSelectedContactId] = useState<string | ''>('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | ''>('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({})
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Recent equipment quick-select
  const [recentEquipment, setRecentEquipment] = useState<RecentEquipment[]>([])

  // Auto-save draft
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Internal notes
  const [internalNotes, setInternalNotes] = useState('')

  // =====================
  // INLAND TRANSPORTATION STATE
  // =====================
  const [showInlandSection, setShowInlandSection] = useState(false)
  const [inlandAccessorialTypes, setInlandAccessorialTypes] = useState<InlandAccessorialType[]>([])
  const [inlandEquipmentTypes, setInlandEquipmentTypes] = useState<InlandEquipmentType[]>([])

  // Inland form data
  const [inlandPickup, setInlandPickup] = useState<ParsedAddress | null>(null)
  const [inlandDropoff, setInlandDropoff] = useState<ParsedAddress | null>(null)
  const [inlandRoute, setInlandRoute] = useState<RouteResult | null>(null)
  const [inlandRatePerMile, setInlandRatePerMile] = useState(3.50)
  const [inlandBaseRate, setInlandBaseRate] = useState(0)
  const [inlandFuelSurchargePercent, setInlandFuelSurchargePercent] = useState(15)
  const [inlandEquipmentTypeId, setInlandEquipmentTypeId] = useState('')
  const [inlandAccessorialCharges, setInlandAccessorialCharges] = useState<{
    type_id: string
    type_name: string
    amount: number
    is_percentage: boolean
    billing_unit: 'flat' | 'hour' | 'day' | 'way' | 'week' | 'month' | 'stop'
    condition_text: string | null
    quantity: number
  }[]>([])
  const [inlandServiceItems, setInlandServiceItems] = useState<InlandServiceItem[]>([])
  const [inlandCargoItems, setInlandCargoItems] = useState<InlandCargoItem[]>([])
  const [inlandLoadImage, setInlandLoadImage] = useState<string | null>(null)
  const [inlandNotes, setInlandNotes] = useState('')
  const [showInlandAccessorialModal, setShowInlandAccessorialModal] = useState(false)
  const [isCalculatingInlandRoute, setIsCalculatingInlandRoute] = useState(false)

  // Load blocks system (matches InlandQuoteView)
  const [inlandLoadBlocks, setInlandLoadBlocks] = useState<InlandLoadBlock[]>([])
  const [inlandServiceTypes, setInlandServiceTypes] = useState<InlandServiceType[]>([])
  const [activeInlandLoadBlockId, setActiveInlandLoadBlockId] = useState<string | null>(null)

  // Dimension thresholds (loaded from company settings)
  const [dimensionThresholds, setDimensionThresholds] = useState(DEFAULT_DIMENSION_THRESHOLDS)

  // Custom on-the-fly creation state for inland section
  const [customInlandTruckInput, setCustomInlandTruckInput] = useState<Record<string, string>>({})
  const [customInlandCargoTypeInput, setCustomInlandCargoTypeInput] = useState<Record<string, string>>({})
  const [customInlandAccessorialName, setCustomInlandAccessorialName] = useState('')
  const [customInlandAccessorialAmount, setCustomInlandAccessorialAmount] = useState(0)
  const [customInlandAccessorialBillingUnit, setCustomInlandAccessorialBillingUnit] = useState<'flat' | 'hour' | 'day' | 'way' | 'week' | 'month' | 'stop'>('flat')
  const [inlandLoadTypes, setInlandLoadTypes] = useState<InlandLoadType[]>([])

  // Equipment lookup state for inland cargo items (derived from allRates)
  const [inlandEquipmentMakes, setInlandEquipmentMakes] = useState<string[]>([])
  const [inlandEquipmentModelsMap, setInlandEquipmentModelsMap] = useState<Record<string, { model: string; modelId: string }[]>>({})

  // Truck recommendation state - tracks recommendations and whether user has manually overridden
  const [inlandTruckRecommendations, setInlandTruckRecommendations] = useState<Record<string, {
    recommendedId: string | null
    reason: string
    isManualOverride: boolean
    multiTruckSuggestion?: TruckRecommendation['multiTruckSuggestion']
  }>>({})

  // Destination blocks system (matches InlandQuoteView)
  const [inlandDestinationBlocks, setInlandDestinationBlocks] = useState<InlandDestinationBlock[]>([])
  const [activeInlandDestinationId, setActiveInlandDestinationId] = useState<string | null>(null)

  // Helper functions for smart dimension conversion using dynamic thresholds
  const parseSmartDimension = (value: string, dimensionType: 'length' | 'width' | 'height') => {
    return parseSmartDimensionWithThresholds(value, dimensionType, dimensionThresholds)
  }
  const wasEnteredAsFeet = (value: number, dimensionType: 'length' | 'width' | 'height') => {
    return wasEnteredAsFeetWithThresholds(value, dimensionType, dimensionThresholds)
  }

  // Equipment dimensions state
  const [equipmentDimensions, setEquipmentDimensions] = useState<EquipmentDimensions | null>(null)
  const [editingDimensions, setEditingDimensions] = useState(false)
  const [dimensionEdits, setDimensionEdits] = useState<{
    operating_weight: number | null
    transport_length: number | null
    transport_width: number | null
    transport_height: number | null
  }>({
    operating_weight: null,
    transport_length: null,
    transport_width: null,
    transport_height: null
  })

  // String inputs for dimensions (to preserve decimals while typing)
  const [dimensionInputStrings, setDimensionInputStrings] = useState<{
    length: string
    width: string
    height: string
  }>({ length: '', width: '', height: '' })

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewQuoteData, setPreviewQuoteData] = useState<QuoteData | null>(null)

  // Live PDF Preview state
  const [livePdfBlob, setLivePdfBlob] = useState<Blob | null>(null)
  const [isGeneratingLivePdf, setIsGeneratingLivePdf] = useState(false)
  const [showLivePdfPreview, setShowLivePdfPreview] = useState(true)
  const livePdfGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastPdfDataHashRef = useRef<string>('')

  // Map capture for inland quotes
  const inlandMapContainerRef = useRef<HTMLDivElement>(null)
  const [inlandMapImage, setInlandMapImage] = useState<string | null>(null)

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch all rates
        const { data: ratesData } = await supabase
          .from('rate_lookup')
          .select('*')
          .order('make')
          .order('model')

        // Fetch all location costs to know which rates have entries
        const { data: locationCostsData } = await supabase
          .from('location_costs')
          .select('rate_id')

        // Fetch all equipment dimensions to know which have dimensions
        const { data: dimensionsData } = await supabase
          .from('equipment_dimensions')
          .select('model_id')

        // Create a set of rate IDs that have at least one location cost
        const rateIdsWithCosts = new Set<string>()
        locationCostsData?.forEach(lc => {
          rateIdsWithCosts.add(lc.rate_id)
        })
        setRatesWithCosts(rateIdsWithCosts)

        // Create a set of model IDs that have dimensions
        const modelIdsWithDimensions = new Set<string>()
        dimensionsData?.forEach(dim => {
          modelIdsWithDimensions.add(dim.model_id)
        })
        setRatesWithDimensions(modelIdsWithDimensions)

        if (ratesData) {
          // Store all rates
          setAllRates(ratesData)

          // Build equipment makes/models for inland cargo equipment mode
          const uniqueInlandMakes = [...new Set(ratesData.map(r => r.make))].sort()
          setInlandEquipmentMakes(uniqueInlandMakes)

          const modelsMap: Record<string, { model: string; modelId: string }[]> = {}
          ratesData.forEach(r => {
            if (r.make && r.model) {
              if (!modelsMap[r.make]) modelsMap[r.make] = []
              if (!modelsMap[r.make].find(m => m.modelId === r.model_id)) {
                modelsMap[r.make].push({ model: r.model, modelId: r.model_id })
              }
            }
          })
          Object.keys(modelsMap).forEach(make => {
            modelsMap[make].sort((a, b) => a.model.localeCompare(b.model))
          })
          setInlandEquipmentModelsMap(modelsMap)

          // Initially show all rates that have either costs OR dimensions
          const filteredRates = ratesData.filter(r =>
            rateIdsWithCosts.has(r.id) || modelIdsWithDimensions.has(r.model_id)
          )
          setRates(filteredRates)

          // Extract unique makes from filtered rates
          const uniqueMakes = [...new Set(filteredRates.map(r => r.make))]
          const sortedMakes = uniqueMakes.sort((a, b) => {
            const aPopular = POPULAR_MAKES.indexOf(a)
            const bPopular = POPULAR_MAKES.indexOf(b)
            if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular
            if (aPopular !== -1) return -1
            if (bPopular !== -1) return 1
            return a.localeCompare(b)
          })
          setMakes(sortedMakes.map(m => ({ value: m, label: m })))
        }

        // Fetch company settings
        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('*')
          .limit(1)
          .single()

        if (settingsData) {
          setCompanySettings(settingsData)
        }

        // Fetch templates
        const { data: templatesData } = await supabase
          .from('quote_templates')
          .select('*')
          .order('location')

        if (templatesData) {
          setTemplates(templatesData)
        }

        // Fetch customers (legacy)
        const { data: customersData } = await supabase
          .from('customers')
          .select('*')
          .order('name')

        if (customersData) {
          setCustomers(customersData)
        }

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

        // Fetch recent equipment
        const { data: recentData } = await supabase
          .from('recent_equipment')
          .select('*')
          .order('last_used_at', { ascending: false })
          .limit(10)

        if (recentData) {
          setRecentEquipment(recentData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Update filtered rates when filters change
  useEffect(() => {
    if (allRates.length === 0) return

    let filteredRates = allRates

    // Apply filters - if both are unchecked, show all with either price OR dimensions
    // If one or both are checked, show only those matching the checked filters
    if (filterHasPrice || filterHasDimensions) {
      filteredRates = allRates.filter(r => {
        const hasPrice = ratesWithCosts.has(r.id)
        const hasDimensions = ratesWithDimensions.has(r.model_id)

        if (filterHasPrice && filterHasDimensions) {
          // Both checked: must have BOTH
          return hasPrice && hasDimensions
        } else if (filterHasPrice) {
          // Only price checked: must have price
          return hasPrice
        } else {
          // Only dimensions checked: must have dimensions
          return hasDimensions
        }
      })
    } else {
      // No filters: show all with either price OR dimensions
      filteredRates = allRates.filter(r =>
        ratesWithCosts.has(r.id) || ratesWithDimensions.has(r.model_id)
      )
    }

    setRates(filteredRates)

    // Update makes based on filtered rates
    const uniqueMakes = [...new Set(filteredRates.map(r => r.make))]
    const sortedMakes = uniqueMakes.sort((a, b) => {
      const aPopular = POPULAR_MAKES.indexOf(a)
      const bPopular = POPULAR_MAKES.indexOf(b)
      if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular
      if (aPopular !== -1) return -1
      if (bPopular !== -1) return 1
      return a.localeCompare(b)
    })
    setMakes(sortedMakes.map(m => ({ value: m, label: m })))

    // Clear selection if current make is no longer in the list
    if (selectedMake && !uniqueMakes.includes(selectedMake)) {
      setSelectedMake('')
      setSelectedModel('')
      setSelectedRate(null)
      setLocationCosts(null)
    }
  }, [filterHasPrice, filterHasDimensions, allRates, ratesWithCosts, ratesWithDimensions])

  // Update models when make changes
  useEffect(() => {
    if (selectedMake) {
      const filteredRates = rates.filter(r => r.make === selectedMake)
      const uniqueModels = [...new Set(filteredRates.map(r => r.model))]
      setModels(uniqueModels.sort().map(m => ({ value: m, label: m })))
    } else {
      setModels([])
    }
    setSelectedModel('')
    setSelectedRate(null)
    setLocationCosts(null)
  }, [selectedMake, rates])

  // Fetch equipment dimensions (returns data for inline use)
  const getEquipmentDimensionsById = async (modelId: string): Promise<EquipmentDimensions | null> => {
    const { data, error } = await supabase
      .from('equipment_dimensions')
      .select('*')
      .eq('model_id', modelId)
      .single()
    if (error || !data) return null
    return data
  }

  // Fetch equipment dimensions (sets state for main equipment selector)
  const fetchEquipmentDimensions = async (modelId: string) => {
    const { data } = await supabase
      .from('equipment_dimensions')
      .select('*')
      .eq('model_id', modelId)
      .single()

    setEquipmentDimensions(data || null)
    if (data) {
      setDimensionEdits({
        operating_weight: data.operating_weight,
        transport_length: data.transport_length,
        transport_width: data.transport_width,
        transport_height: data.transport_height
      })
    } else {
      setDimensionEdits({
        operating_weight: null,
        transport_length: null,
        transport_width: null,
        transport_height: null
      })
    }
  }

  // Convert SVG to PNG using canvas
  const convertSvgToPng = (svgBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // Create canvas with good resolution
        const canvas = document.createElement('canvas')
        const scale = 2 // Higher resolution
        canvas.width = img.width * scale || 800
        canvas.height = img.height * scale || 600

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        // White background for transparency
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw the SVG
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Convert to PNG
        const pngBase64 = canvas.toDataURL('image/png')
        resolve(pngBase64)
      }
      img.onerror = () => reject(new Error('Failed to load SVG image'))
      img.src = svgBase64
    })
  }

  // Handle image upload for equipment (supports both database and custom quotes)
  // Accepts any common image format: PNG, JPEG, GIF, WebP, BMP, SVG (converted to PNG)
  const handleImageUpload = async (imageType: 'front' | 'side', file: File) => {
    // For custom quotes, we don't need a selectedRate
    if (!isCustomQuote && !selectedRate) return

    // Validate file type - accept common image formats
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|gif|webp|svg|bmp)$/i)) {
      showToast('Please upload a valid image file (PNG, JPEG, GIF, WebP, SVG, or BMP)', 'error')
      return
    }

    // Check file size (max 5MB for equipment images)
    if (file.size > 5000000) {
      showToast('Image must be less than 5MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      let base64 = e.target?.result as string

      // Check if it's an SVG and convert to PNG
      if (file.type === 'image/svg+xml' || base64.includes('data:image/svg+xml')) {
        try {
          showToast('Converting SVG to PNG...', 'success')
          base64 = await convertSvgToPng(base64)
        } catch (error) {
          console.error('Error converting SVG:', error)
          showToast('Failed to convert SVG. Try uploading a PNG or JPEG instead.', 'error')
          return
        }
      }

      // For custom quotes, store in state (not database)
      if (isCustomQuote) {
        setCustomImages(prev => ({
          ...prev,
          [imageType === 'front' ? 'frontImageBase64' : 'sideImageBase64']: base64
        }))
        showToast(`${imageType === 'front' ? 'Front' : 'Side'} image added`, 'success')
        return
      }

      // For database equipment, store in equipment_dimensions table
      if (equipmentDimensions) {
        // Update existing record
        const updateField = imageType === 'front' ? 'front_image_base64' : 'side_image_base64'
        const { error } = await supabase
          .from('equipment_dimensions')
          .update({ [updateField]: base64, updated_at: new Date().toISOString() })
          .eq('model_id', selectedRate!.model_id)

        if (error) {
          showToast(`Failed to upload ${imageType} image`, 'error')
        } else {
          showToast(`${imageType === 'front' ? 'Front' : 'Side'} image uploaded`, 'success')
          fetchEquipmentDimensions(selectedRate!.model_id)
        }
      } else {
        // Create new record with the image
        const newRecord = {
          model_id: selectedRate!.model_id,
          front_image_base64: imageType === 'front' ? base64 : null,
          side_image_base64: imageType === 'side' ? base64 : null
        }
        const { error } = await supabase
          .from('equipment_dimensions')
          .insert(newRecord)

        if (error) {
          showToast(`Failed to upload ${imageType} image`, 'error')
        } else {
          showToast(`${imageType === 'front' ? 'Front' : 'Side'} image uploaded`, 'success')
          fetchEquipmentDimensions(selectedRate!.model_id)
        }
      }
    }
    reader.onerror = () => {
      showToast('Failed to read the image file', 'error')
    }
    reader.readAsDataURL(file)
  }

  // Remove image from equipment
  const handleRemoveImage = async (imageType: 'front' | 'side') => {
    // For custom quotes, remove from state
    if (isCustomQuote) {
      setCustomImages(prev => ({
        ...prev,
        [imageType === 'front' ? 'frontImageBase64' : 'sideImageBase64']: null
      }))
      showToast(`${imageType === 'front' ? 'Front' : 'Side'} image removed`, 'success')
      return
    }

    if (!selectedRate || !equipmentDimensions) return

    const updateField = imageType === 'front' ? 'front_image_base64' : 'side_image_base64'
    const { error } = await supabase
      .from('equipment_dimensions')
      .update({ [updateField]: null, updated_at: new Date().toISOString() })
      .eq('model_id', selectedRate.model_id)

    if (error) {
      showToast(`Failed to remove ${imageType} image`, 'error')
    } else {
      showToast(`${imageType === 'front' ? 'Front' : 'Side'} image removed`, 'success')
      fetchEquipmentDimensions(selectedRate.model_id)
    }
  }

  // Save dimension edits
  const saveDimensionEdits = async () => {
    if (!selectedRate) return

    const dimensionData = {
      operating_weight: dimensionEdits.operating_weight,
      transport_length: dimensionEdits.transport_length,
      transport_width: dimensionEdits.transport_width,
      transport_height: dimensionEdits.transport_height,
      updated_at: new Date().toISOString()
    }

    if (equipmentDimensions) {
      // Update existing
      const { error } = await supabase
        .from('equipment_dimensions')
        .update(dimensionData)
        .eq('model_id', selectedRate.model_id)

      if (error) {
        showToast('Failed to save dimensions', 'error')
      } else {
        showToast('Dimensions saved', 'success')
        setEditingDimensions(false)
        fetchEquipmentDimensions(selectedRate.model_id)
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('equipment_dimensions')
        .insert({
          model_id: selectedRate.model_id,
          ...dimensionData
        })

      if (error) {
        showToast('Failed to save dimensions', 'error')
      } else {
        showToast('Dimensions saved', 'success')
        setEditingDimensions(false)
        fetchEquipmentDimensions(selectedRate.model_id)
      }
    }
  }

  // Update selected rate when model changes
  useEffect(() => {
    if (selectedMake && selectedModel) {
      const rate = rates.find(r => r.make === selectedMake && r.model === selectedModel)
      setSelectedRate(rate || null)

      // Fetch location costs for this rate
      if (rate && selectedLocation) {
        fetchLocationCosts(rate.id, selectedLocation)
      }

      // Fetch equipment dimensions
      if (rate) {
        fetchEquipmentDimensions(rate.model_id)
      }
    } else {
      setSelectedRate(null)
      setLocationCosts(null)
      setEquipmentDimensions(null)
    }
  }, [selectedMake, selectedModel, selectedLocation, rates])

  // Fetch location costs
  const fetchLocationCosts = async (rateId: string, location: string) => {
    const { data } = await supabase
      .from('location_costs')
      .select('*')
      .eq('rate_id', rateId)
      .eq('location', location)
      .single()

    setLocationCosts(data || null)
    setCostOverrides({}) // Reset overrides when loading new costs

    // If no location costs, check for default template
    if (!data && location) {
      const defaultTemplate = templates.find(t => t.location === location && t.is_default)
      if (defaultTemplate) {
        setMarginPercentage(defaultTemplate.default_margin_percentage || 0)
      }
    }
  }

  // Get effective cost value (override or original)
  const getEffectiveCost = (fieldKey: string): number | null => {
    if (costOverrides[fieldKey] !== undefined) {
      return costOverrides[fieldKey]
    }
    if (locationCosts) {
      return locationCosts[fieldKey as keyof LocationCost] as number | null
    }
    return null
  }

  // Handle location change
  const handleLocationChange = (location: Location | '') => {
    setSelectedLocation(location)
    if (selectedRate && location) {
      fetchLocationCosts(selectedRate.id, location)
    } else {
      setLocationCosts(null)
    }
  }

  // Calculate miscellaneous fees total
  const miscFeesTotal = miscellaneousFees.reduce((sum, fee) => sum + (fee.cost || 0), 0)

  // Calculate dismantling subtotal (inland totals added later after calculateInlandTotals is defined)
  const dismantlingSubtotal = (locationCosts
    ? COST_FIELDS.reduce((sum, field) => {
        if (!enabledCosts[field.key]) return sum
        const value = getEffectiveCost(field.key)
        return sum + (value || 0)
      }, 0)
    : 0) + miscFeesTotal

  // Format currency
  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  // Helper to check if base64 is SVG
  const isSvgImage = (base64: string | null | undefined): boolean => {
    if (!base64) return false
    return base64.includes('data:image/svg+xml')
  }

  // Convert image to PNG if it's SVG (for PDF compatibility)
  const ensurePngFormat = async (base64: string | null | undefined): Promise<string | null> => {
    if (!base64) return null
    if (isSvgImage(base64)) {
      try {
        return await convertSvgToPng(base64)
      } catch (e) {
        console.error('Failed to convert SVG to PNG:', e)
        return null
      }
    }
    return base64
  }

  // Generate and download PDF
  const handleDownloadQuote = async () => {
    // Validate based on mode
    if (multiEquipmentMode) {
      // Multi-equipment mode validation
      const blocksWithCosts = equipmentBlocks.filter(b => (b.costs || b.isCustom) && b.location)
      if (blocksWithCosts.length === 0) {
        showToast('Please add at least one equipment with costs', 'error')
        return
      }
    } else if (isCustomQuote) {
      if (!customMake || !customModel || !selectedLocation) {
        showToast('Please enter make, model, and loading location', 'error')
        return
      }
    } else {
      if (!selectedRate || !selectedLocation) {
        showToast('Please select equipment and loading location', 'error')
        return
      }
    }

    // Validate client input fields
    if (customerEmail) {
      const emailValidation = validateEmail(customerEmail)
      if (!emailValidation.valid) {
        showToast('Invalid email address format', 'error')
        return
      }
    }

    if (customerPhone) {
      const phoneValidation = validatePhone(customerPhone)
      if (!phoneValidation.valid) {
        showToast('Invalid phone number format', 'error')
        return
      }
    }

    // Convert SVG images to PNG for PDF compatibility (only for non-custom)
    let frontImage = equipmentDimensions?.front_image_base64 || null
    let sideImage = equipmentDimensions?.side_image_base64 || null

    if (!isCustomQuote && (isSvgImage(frontImage) || isSvgImage(sideImage))) {
      showToast('Converting images for PDF...', 'success')
      frontImage = await ensurePngFormat(frontImage)
      sideImage = await ensurePngFormat(sideImage)
    }

    // Build dimensions for quote
    let quoteDimensions: QuoteDimensions | undefined
    if (isCustomQuote) {
      // Use custom dimensions and images from state
      const hasAnyDimension = customDimensions.operatingWeight || customDimensions.transportLength ||
                               customDimensions.transportWidth || customDimensions.transportHeight
      const hasAnyImage = customImages.frontImageBase64 || customImages.sideImageBase64
      quoteDimensions = (hasAnyDimension || hasAnyImage) ? {
        transportLength: customDimensions.transportLength,
        transportWidth: customDimensions.transportWidth,
        transportHeight: customDimensions.transportHeight,
        operatingWeight: customDimensions.operatingWeight,
        frontImageBase64: customImages.frontImageBase64,
        sideImageBase64: customImages.sideImageBase64
      } : undefined
    } else if (equipmentDimensions) {
      quoteDimensions = {
        transportLength: equipmentDimensions.transport_length,
        transportWidth: equipmentDimensions.transport_width,
        transportHeight: equipmentDimensions.transport_height,
        operatingWeight: equipmentDimensions.operating_weight,
        frontImageBase64: frontImage,
        sideImageBase64: sideImage
      }
    }

    // Create equipment object for custom quotes
    const equipmentForQuote: RateLookup = isCustomQuote
      ? {
          id: 'custom',
          make_id: 'custom',
          model_id: 'custom',
          price: null,
          notes: null,
          updated_at: new Date().toISOString(),
          make: customMake,
          model: customModel
        }
      : selectedRate!

    // Build inland transportation data if section is active
    const inlandData: InlandTransportationData | undefined = showInlandSection ? {
      pickup: inlandPickup,
      dropoff: inlandDropoff,
      route: inlandRoute,
      ratePerMile: inlandRatePerMile,
      baseRate: inlandBaseRate,
      fuelSurchargePercent: inlandFuelSurchargePercent,
      equipmentTypeName: inlandEquipmentTypes.find(e => e.id === inlandEquipmentTypeId)?.name,
      accessorialCharges: inlandAccessorialCharges,
      serviceItems: inlandServiceItems,
      cargoItems: inlandCargoItems,
      loadImageBase64: inlandLoadImage,
      mapImage: inlandMapImage,
      notes: inlandNotes,
      totals: inlandTotals,
      load_blocks: inlandLoadBlocks.length > 0 ? inlandLoadBlocks : undefined,
      destination_blocks: inlandDestinationBlocks.length > 0 ? inlandDestinationBlocks : undefined
    } : undefined

    // For multi-equipment mode, use the first block's data for the main equipment fields
    const firstBlock = multiEquipmentMode ? equipmentBlocks.find(b => (b.costs || b.isCustom) && b.location) : null

    const quoteData: QuoteData = {
      equipment: multiEquipmentMode && firstBlock
        ? (firstBlock.rate || { id: 'multi', make_id: 'multi', model_id: 'multi', price: null, notes: null, updated_at: new Date().toISOString(), make: firstBlock.make, model: firstBlock.model })
        : equipmentForQuote,
      location: multiEquipmentMode && firstBlock ? firstBlock.location! : selectedLocation as Location,
      costs: multiEquipmentMode && firstBlock ? firstBlock.costs : locationCosts,
      costDescriptions: multiEquipmentMode && firstBlock ? firstBlock.costDescriptions : costDescriptions,
      enabledCosts: multiEquipmentMode && firstBlock ? firstBlock.enabledCosts : enabledCosts,
      costOverrides: multiEquipmentMode && firstBlock ? firstBlock.costOverrides : costOverrides,
      miscellaneousFees: multiEquipmentMode && firstBlock
        ? firstBlock.miscellaneousFees.filter(fee => fee.title && fee.cost > 0)
        : miscellaneousFees.filter(fee => fee.title && fee.cost > 0),
      // Client Information (sanitized)
      customerName: customerName ? sanitizeText(customerName) : undefined,
      customerEmail: customerEmail ? validateEmail(customerEmail).sanitized : undefined,
      customerCompany: customerCompany ? sanitizeText(customerCompany) : undefined,
      customerPhone: customerPhone ? validatePhone(customerPhone).sanitized : undefined,
      // Billing Information (sanitized)
      billingAddress: billingAddress ? sanitizeText(billingAddress) : undefined,
      billingCity: billingCity ? sanitizeText(billingCity) : undefined,
      billingState: billingState ? sanitizeText(billingState) : undefined,
      billingZip: billingZip ? sanitizeText(billingZip) : undefined,
      paymentTerms: paymentTerms ? sanitizeText(paymentTerms) : undefined,
      // Quote Details
      quoteDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      quoteNumber: generateQuoteNumber(),
      marginPercentage: marginPercentage,
      companySettings: companySettings || undefined,
      dimensions: multiEquipmentMode && firstBlock ? firstBlock.dimensions || undefined : quoteDimensions,
      // Inland Transportation
      inlandTransportation: inlandData,
      // Multi-equipment blocks
      equipmentBlocks: multiEquipmentMode ? equipmentBlocks.filter(b => (b.costs || b.isCustom) && b.location) : undefined
    }

    // Save to quote history with effective values (overrides applied, only enabled costs)
    let historySaved = false
    try {
      // Build cost values object with effective values for enabled costs only
      const costValues: Record<string, number | null> = {}
      COST_FIELDS.forEach(field => {
        if (enabledCosts[field.key]) {
          costValues[field.key] = getEffectiveCost(field.key)
        } else {
          costValues[field.key] = null
        }
      })

      // Prepare miscellaneous fees for storage
      const validMiscFees = miscellaneousFees.filter(fee => fee.title && fee.cost > 0)
      const miscFeesJson = validMiscFees.length > 0 ? JSON.stringify(validMiscFees) : null

      const { error } = await supabase.from('quote_history').insert({
        quote_number: quoteData.quoteNumber,
        rate_id: isCustomQuote ? null : selectedRate!.id,
        equipment_make: isCustomQuote ? customMake : selectedRate!.make,
        equipment_model: isCustomQuote ? customModel : selectedRate!.model,
        location: selectedLocation,
        dismantling_loading_cost: costValues.dismantling_loading_cost,
        loading_cost: costValues.loading_cost,
        blocking_bracing_cost: costValues.blocking_bracing_cost,
        ncb_survey_cost: costValues.ncb_survey_cost,
        local_drayage_cost: costValues.local_drayage_cost,
        chassis_cost: costValues.chassis_cost,
        tolls_cost: costValues.tolls_cost,
        escorts_cost: costValues.escorts_cost,
        power_wash_cost: costValues.power_wash_cost,
        waste_fluids_disposal_fee: costValues.waste_fluids_disposal_fee,
        miscellaneous_costs: null,  // No longer using single misc cost
        miscellaneous_fees_json: miscFeesJson,
        margin_percentage: marginPercentage,
        // Version tracking - new quotes start at version 1
        version: 1,
        parent_quote_id: null,
        original_quote_id: null,
        margin_amount: marginAmount,
        subtotal: subtotal,
        total_with_margin: totalWithMargin,
        customer_name: customerName || null,
        customer_email: customerEmail || null
      })

      if (error) {
        console.error('Error saving quote history:', error)
        showToast(`History save failed: ${error.message}`, 'error')
      } else {
        historySaved = true
      }
    } catch (error) {
      console.error('Error saving quote history:', error)
      showToast('History save failed', 'error')
    }

    // Use async version to properly handle equipment block images in multi-equipment mode
    if (multiEquipmentMode) {
      await generateProfessionalQuotePDFAsync(quoteData)
    } else {
      generateProfessionalQuotePDF(quoteData)
    }

    // Update recent equipment and clear draft (only for database-linked quotes)
    if (!isCustomQuote) {
      await updateRecentEquipment()
      await clearDraft()
    }

    if (historySaved) {
      showToast('Quote PDF downloaded and saved to history!', 'success')
    } else {
      showToast('Quote PDF downloaded (not saved to history)', 'error')
    }
  }

  // Generate preview
  const handlePreviewQuote = async () => {
    // Validate based on mode
    if (multiEquipmentMode) {
      // Multi-equipment mode validation
      const blocksWithCosts = equipmentBlocks.filter(b => (b.costs || b.isCustom) && b.location)
      if (blocksWithCosts.length === 0) {
        showToast('Please add at least one equipment with costs', 'error')
        return
      }
    } else if (isCustomQuote) {
      if (!customMake || !customModel || !selectedLocation) {
        showToast('Please enter make, model, and loading location', 'error')
        return
      }
    } else {
      if (!selectedRate || !selectedLocation) {
        showToast('Please select equipment and loading location', 'error')
        return
      }
    }

    // Convert SVG images to PNG for PDF compatibility (only for non-custom)
    let frontImage = equipmentDimensions?.front_image_base64 || null
    let sideImage = equipmentDimensions?.side_image_base64 || null

    if (!isCustomQuote && (isSvgImage(frontImage) || isSvgImage(sideImage))) {
      showToast('Converting images for PDF...', 'success')
      frontImage = await ensurePngFormat(frontImage)
      sideImage = await ensurePngFormat(sideImage)
    }

    // Build dimensions for quote (preview)
    let quoteDimensions: QuoteDimensions | undefined
    if (isCustomQuote) {
      const hasAnyDimension = customDimensions.operatingWeight || customDimensions.transportLength ||
                               customDimensions.transportWidth || customDimensions.transportHeight
      const hasAnyImage = customImages.frontImageBase64 || customImages.sideImageBase64
      quoteDimensions = (hasAnyDimension || hasAnyImage) ? {
        transportLength: customDimensions.transportLength,
        transportWidth: customDimensions.transportWidth,
        transportHeight: customDimensions.transportHeight,
        operatingWeight: customDimensions.operatingWeight,
        frontImageBase64: customImages.frontImageBase64,
        sideImageBase64: customImages.sideImageBase64
      } : undefined
    } else if (equipmentDimensions) {
      quoteDimensions = {
        transportLength: equipmentDimensions.transport_length,
        transportWidth: equipmentDimensions.transport_width,
        transportHeight: equipmentDimensions.transport_height,
        operatingWeight: equipmentDimensions.operating_weight,
        frontImageBase64: frontImage,
        sideImageBase64: sideImage
      }
    }

    // Create equipment object for custom quotes
    const equipmentForQuote: RateLookup = isCustomQuote
      ? {
          id: 'custom',
          make_id: 'custom',
          model_id: 'custom',
          price: null,
          notes: null,
          updated_at: new Date().toISOString(),
          make: customMake,
          model: customModel
        }
      : selectedRate!

    // Build inland transportation data if section is active (preview)
    const inlandDataPreview: InlandTransportationData | undefined = showInlandSection ? {
      pickup: inlandPickup,
      dropoff: inlandDropoff,
      route: inlandRoute,
      ratePerMile: inlandRatePerMile,
      baseRate: inlandBaseRate,
      fuelSurchargePercent: inlandFuelSurchargePercent,
      equipmentTypeName: inlandEquipmentTypes.find(e => e.id === inlandEquipmentTypeId)?.name,
      accessorialCharges: inlandAccessorialCharges,
      serviceItems: inlandServiceItems,
      cargoItems: inlandCargoItems,
      loadImageBase64: inlandLoadImage,
      mapImage: inlandMapImage,
      notes: inlandNotes,
      totals: inlandTotals,
      load_blocks: inlandLoadBlocks.length > 0 ? inlandLoadBlocks : undefined,
      destination_blocks: inlandDestinationBlocks.length > 0 ? inlandDestinationBlocks : undefined
    } : undefined

    // For multi-equipment mode, use the first block's data for the main equipment fields
    const firstBlockPreview = multiEquipmentMode ? equipmentBlocks.find(b => (b.costs || b.isCustom) && b.location) : null

    const quoteData: QuoteData = {
      equipment: multiEquipmentMode && firstBlockPreview
        ? (firstBlockPreview.rate || { id: 'multi', make_id: 'multi', model_id: 'multi', price: null, notes: null, updated_at: new Date().toISOString(), make: firstBlockPreview.make, model: firstBlockPreview.model })
        : equipmentForQuote,
      location: multiEquipmentMode && firstBlockPreview ? firstBlockPreview.location! : selectedLocation as Location,
      costs: multiEquipmentMode && firstBlockPreview ? firstBlockPreview.costs : locationCosts,
      costDescriptions: multiEquipmentMode && firstBlockPreview ? firstBlockPreview.costDescriptions : costDescriptions,
      enabledCosts: multiEquipmentMode && firstBlockPreview ? firstBlockPreview.enabledCosts : enabledCosts,
      costOverrides: multiEquipmentMode && firstBlockPreview ? firstBlockPreview.costOverrides : costOverrides,
      miscellaneousFees: multiEquipmentMode && firstBlockPreview
        ? firstBlockPreview.miscellaneousFees.filter(fee => fee.title && fee.cost > 0)
        : miscellaneousFees.filter(fee => fee.title && fee.cost > 0),
      // Client Information (sanitized)
      customerName: customerName ? sanitizeText(customerName) : undefined,
      customerEmail: customerEmail ? validateEmail(customerEmail).sanitized : undefined,
      customerCompany: customerCompany ? sanitizeText(customerCompany) : undefined,
      customerPhone: customerPhone ? validatePhone(customerPhone).sanitized : undefined,
      // Billing Information (sanitized)
      billingAddress: billingAddress ? sanitizeText(billingAddress) : undefined,
      billingCity: billingCity ? sanitizeText(billingCity) : undefined,
      billingState: billingState ? sanitizeText(billingState) : undefined,
      billingZip: billingZip ? sanitizeText(billingZip) : undefined,
      paymentTerms: paymentTerms ? sanitizeText(paymentTerms) : undefined,
      // Quote Details
      quoteDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      quoteNumber: generateQuoteNumber(),
      marginPercentage: marginPercentage,
      companySettings: companySettings || undefined,
      dimensions: multiEquipmentMode && firstBlockPreview ? firstBlockPreview.dimensions || undefined : quoteDimensions,
      // Inland Transportation
      inlandTransportation: inlandDataPreview,
      // Multi-equipment blocks
      equipmentBlocks: multiEquipmentMode ? equipmentBlocks.filter(b => (b.costs || b.isCustom) && b.location) : undefined
    }

    // Use async version for multi-equipment mode to properly handle block images
    if (multiEquipmentMode) {
      const pdfUrl = await generateProfessionalQuotePDFPreviewAsync(quoteData)
      setPreviewUrl(pdfUrl)
    } else {
      const pdfUrl = generateProfessionalQuotePDFPreview(quoteData)
      setPreviewUrl(pdfUrl)
    }
    setPreviewQuoteData(quoteData)
    setShowPreview(true)
  }

  // Close preview
  const closePreview = () => {
    setShowPreview(false)
    setPreviewUrl(null)
    setPreviewQuoteData(null)
  }

  // Customer selection handler
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId)
    if (customerId) {
      const customer = customers.find(c => c.id === customerId)
      if (customer) {
        setCustomerName(customer.name)
        setCustomerEmail(customer.email || '')
        setCustomerCompany(customer.company || '')
        setCustomerPhone(customer.phone || '')
        setCustomerAddress(customer.address || '')
        // Populate billing information from customer
        setBillingAddress(customer.billing_address || customer.address || '')
        setBillingCity(customer.billing_city || '')
        setBillingState(customer.billing_state || '')
        setBillingZip(customer.billing_zip || '')
        setPaymentTerms(customer.payment_terms || '')
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
        setCustomerName(fullName)
        setCustomerEmail(contact.email || '')
        setCustomerCompany(contact.company?.name || '')
        setCustomerPhone(contact.phone || contact.mobile || '')
        // Use company address
        const companyAddr = contact.company ? [
          contact.company.address,
          contact.company.city,
          contact.company.state,
          contact.company.zip
        ].filter(Boolean).join(', ') : ''
        setCustomerAddress(companyAddr)
        // Populate billing information from company
        if (contact.company) {
          const billingAddr = contact.company.billing_address || contact.company.address || ''
          setBillingAddress(billingAddr)
          setBillingCity(contact.company.billing_city || contact.company.city || '')
          setBillingState(contact.company.billing_state || contact.company.state || '')
          setBillingZip(contact.company.billing_zip || contact.company.zip || '')
          setPaymentTerms(contact.company.payment_terms || '')
        }
      }
    }
  }

  // Parse email signature and fill client info
  const handleParseSignature = () => {
    if (!signatureText.trim()) {
      showToast('Please paste an email signature first', 'error')
      return
    }

    const parsed = parseEmailSignature(signatureText)

    // Merge parsed data with existing form
    if (parsed.name) setCustomerName(parsed.name)
    if (parsed.company) setCustomerCompany(parsed.company)
    if (parsed.email) setCustomerEmail(parsed.email)
    if (parsed.phone) setCustomerPhone(parsed.phone)
    if (parsed.address) setCustomerAddress(parsed.address)
    if (parsed.billing_address) setBillingAddress(parsed.billing_address)
    if (parsed.billing_city) setBillingCity(parsed.billing_city)
    if (parsed.billing_state) setBillingState(parsed.billing_state)
    if (parsed.billing_zip) setBillingZip(parsed.billing_zip)

    // Clear customer selection since we're entering new data
    setSelectedCustomerId('')

    // Show success message
    const fieldsFound = Object.entries(parsed).filter(([, v]) => v).map(([k]) => k)
    if (fieldsFound.length > 0) {
      showToast(`Parsed: ${fieldsFound.join(', ')}`, 'success')
    } else {
      showToast('Could not extract any information from the signature', 'error')
    }

    setShowSignatureParser(false)
    setSignatureText('')
  }

  // =====================
  // INLAND TRANSPORTATION FUNCTIONS
  // =====================
  const generateInlandId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const CARGO_TYPES = [
    'General Freight', 'Machinery', 'Construction Equipment', 'Agricultural Equipment',
    'Vehicles', 'Steel/Metal', 'Lumber/Wood', 'Containers', 'Oversized Load', 'Hazmat', 'Refrigerated', 'Other',
  ]

  const BILLING_UNIT_OPTIONS = [
    { value: 'flat', label: 'Flat Fee' },
    { value: 'hour', label: 'Per Hour' },
    { value: 'day', label: 'Per Day' },
    { value: 'way', label: 'Per Way' },
    { value: 'week', label: 'Per Week' },
    { value: 'month', label: 'Per Month' },
    { value: 'stop', label: 'Per Stop' },
  ]

  // Load inland data when section is shown
  useEffect(() => {
    if (showInlandSection && inlandAccessorialTypes.length === 0) {
      loadInlandData()
    }
  }, [showInlandSection])

  const loadInlandData = async () => {
    try {
      const { data: accessorials } = await supabase
        .from('inland_accessorial_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (accessorials) setInlandAccessorialTypes(accessorials)

      const { data: equipment } = await supabase
        .from('inland_equipment_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (equipment) setInlandEquipmentTypes(equipment)

      // Load service types
      const { data: serviceTypes } = await supabase
        .from('inland_service_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (serviceTypes) setInlandServiceTypes(serviceTypes)

      // Load load types for cargo dropdown
      const { data: loadTypes } = await supabase
        .from('inland_load_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (loadTypes) setInlandLoadTypes(loadTypes)

      // Load dimension thresholds from company settings
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
      console.error('Failed to load inland data:', err)
    }
  }

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 15)

  // Create default load block
  const createDefaultLoadBlock = (): InlandLoadBlock => ({
    id: generateId(),
    truck_type_id: '',
    cargo_items: [],
    service_items: [],
    accessorial_charges: [],
    load_image_base64: null,
    notes: ''
  })

  // On-the-fly creation functions for inland section
  const addCustomInlandTruckType = async (blockId: string, name: string) => {
    if (!name.trim()) return
    try {
      const { data, error } = await supabase
        .from('inland_equipment_types')
        .insert({ name: name.trim(), description: 'Custom truck type', is_active: true, sort_order: inlandEquipmentTypes.length })
        .select()
        .single()
      if (error) throw error
      setInlandEquipmentTypes(prev => [...prev, data])
      updateInlandLoadBlock(blockId, { truck_type_id: data.id })
      setCustomInlandTruckInput(prev => ({ ...prev, [blockId]: '' }))
      showToast('Custom truck type added!', 'success')
    } catch (err) {
      console.error('Error adding custom truck type:', err)
      showToast('Failed to add truck type', 'error')
    }
  }

  const addCustomInlandLoadType = async (blockId: string, cargoId: string, name: string) => {
    if (!name.trim()) return
    try {
      const { data, error } = await supabase
        .from('inland_load_types')
        .insert({ name: name.trim(), description: 'Custom load type', is_active: true, sort_order: inlandLoadTypes.length })
        .select()
        .single()
      if (error) throw error
      setInlandLoadTypes(prev => [...prev, data])
      updateCargoInBlock(blockId, cargoId, 'cargo_type', data.name)
      setCustomInlandCargoTypeInput(prev => ({ ...prev, [cargoId]: '' }))
      showToast('Custom load type added!', 'success')
    } catch (err) {
      console.error('Error adding custom load type:', err)
      showToast('Failed to add load type', 'error')
    }
  }

  const addCustomInlandAccessorialType = async () => {
    if (!customInlandAccessorialName.trim()) {
      showToast('Please enter a name for the accessorial', 'error')
      return
    }
    try {
      const { data, error } = await supabase
        .from('inland_accessorial_types')
        .insert({
          name: customInlandAccessorialName.trim(),
          description: 'Custom accessorial charge',
          default_amount: customInlandAccessorialAmount || 0,
          is_percentage: false,
          billing_unit: customInlandAccessorialBillingUnit,
          is_active: true,
          sort_order: inlandAccessorialTypes.length,
        })
        .select()
        .single()
      if (error) throw error
      setInlandAccessorialTypes(prev => [...prev, data])
      // Auto-add to active load block
      if (activeInlandLoadBlockId) {
        addAccessorialToBlock(activeInlandLoadBlockId, data)
      }
      setCustomInlandAccessorialName('')
      setCustomInlandAccessorialAmount(0)
      setCustomInlandAccessorialBillingUnit('flat')
      showToast('Custom accessorial added!', 'success')
    } catch (err) {
      console.error('Error adding custom accessorial:', err)
      showToast('Failed to add accessorial', 'error')
    }
  }

  // Get cargo types from load types or default (deduplicated)
  const getInlandCargoTypes = () => {
    if (inlandLoadTypes.length > 0) {
      // Use Set to remove duplicates and preserve order
      return [...new Set(inlandLoadTypes.map(lt => lt.name))]
    }
    return CARGO_TYPES
  }

  // Destination block management functions
  const createDefaultInlandDestinationBlock = (): InlandDestinationBlock => ({
    id: generateId(),
    name: `Destination ${String.fromCharCode(65 + inlandDestinationBlocks.length)}`, // A, B, C...
    pickup: null,
    dropoff: null,
    stops: [],
    route: null,
    map_image_base64: null,
    load_blocks: [createDefaultLoadBlock()],
    internal_notes: '',
    customer_notes: '',
    special_instructions: '',
    rate_per_mile: 3.5,
    base_rate: 0,
    fuel_surcharge_percent: 15,
    margin_percentage: 0,
    manual_total: null,
    use_manual_pricing: false
  })

  const addInlandDestinationBlock = () => {
    const newBlock = createDefaultInlandDestinationBlock()
    setInlandDestinationBlocks(prev => [...prev, newBlock])
    setActiveInlandDestinationId(newBlock.id)
  }

  const duplicateInlandDestinationBlock = (blockId: string) => {
    const blockToCopy = inlandDestinationBlocks.find(b => b.id === blockId)
    if (!blockToCopy) return

    const newBlock: InlandDestinationBlock = {
      ...JSON.parse(JSON.stringify(blockToCopy)),
      id: generateId(),
      name: `Destination ${String.fromCharCode(65 + inlandDestinationBlocks.length)}`,
      load_blocks: blockToCopy.load_blocks.map(lb => ({
        ...JSON.parse(JSON.stringify(lb)),
        id: generateId(),
        cargo_items: lb.cargo_items.map(c => ({ ...c, id: generateId() })),
        service_items: lb.service_items.map(s => ({ ...s, id: generateId() })),
        accessorial_charges: lb.accessorial_charges.map(a => ({ ...a, id: generateId() }))
      }))
    }
    setInlandDestinationBlocks(prev => [...prev, newBlock])
    setActiveInlandDestinationId(newBlock.id)
  }

  const removeInlandDestinationBlock = (blockId: string) => {
    setInlandDestinationBlocks(prev => {
      const filtered = prev.filter(b => b.id !== blockId)
      if (activeInlandDestinationId === blockId && filtered.length > 0) {
        setActiveInlandDestinationId(filtered[0].id)
      } else if (filtered.length === 0) {
        setActiveInlandDestinationId(null)
      }
      return filtered
    })
  }

  const updateInlandDestinationBlock = (blockId: string, updates: Partial<InlandDestinationBlock>) => {
    setInlandDestinationBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b))
  }

  // Get active destination block
  const activeInlandDestination = inlandDestinationBlocks.find(b => b.id === activeInlandDestinationId)

  // Load block functions for destination blocks
  const addLoadBlockToDestination = (destinationId: string) => {
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: [...d.load_blocks, createDefaultLoadBlock()] }
        : d
    ))
  }

  const removeLoadBlockFromDestination = (destinationId: string, loadBlockId: string) => {
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.filter(lb => lb.id !== loadBlockId) }
        : d
    ))
  }

  const updateLoadBlockInDestination = (destinationId: string, loadBlockId: string, updates: Partial<InlandLoadBlock>) => {
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb => lb.id === loadBlockId ? { ...lb, ...updates } : lb) }
        : d
    ))
  }

  // Cargo functions for destination load blocks
  const addCargoToDestinationBlock = (destinationId: string, loadBlockId: string) => {
    const newCargo: InlandCargoItem = {
      id: generateId(),
      description: '',
      cargo_type: 'General Freight',
      quantity: 1,
      weight_lbs: null,
      length_inches: null,
      width_inches: null,
      height_inches: null,
      image_base64: null
    }
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb =>
            lb.id === loadBlockId ? { ...lb, cargo_items: [...lb.cargo_items, newCargo] } : lb
          )}
        : d
    ))
  }

  const removeCargoFromDestinationBlock = (destinationId: string, loadBlockId: string, cargoId: string) => {
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb =>
            lb.id === loadBlockId ? { ...lb, cargo_items: lb.cargo_items.filter(c => c.id !== cargoId) } : lb
          )}
        : d
    ))
  }

  const updateCargoInDestinationBlock = (destinationId: string, loadBlockId: string, cargoId: string, field: string, value: string | number | boolean | null) => {
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb =>
            lb.id === loadBlockId ? { ...lb, cargo_items: lb.cargo_items.map(c =>
              c.id === cargoId ? { ...c, [field]: value } : c
            )} : lb
          )}
        : d
    ))
  }

  // Service functions for destination load blocks
  const addServiceToDestinationBlock = (destinationId: string, loadBlockId: string, serviceType?: InlandServiceType) => {
    const newService: InlandServiceItem = {
      id: generateId(),
      name: serviceType?.name || '',
      description: serviceType?.description || '',
      price: serviceType?.default_price || 0,
      quantity: 1
    }
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb =>
            lb.id === loadBlockId ? { ...lb, service_items: [...lb.service_items, newService] } : lb
          )}
        : d
    ))
  }

  const removeServiceFromDestinationBlock = (destinationId: string, loadBlockId: string, serviceId: string) => {
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb =>
            lb.id === loadBlockId ? { ...lb, service_items: lb.service_items.filter(s => s.id !== serviceId) } : lb
          )}
        : d
    ))
  }

  const updateServiceInDestinationBlock = (destinationId: string, loadBlockId: string, serviceId: string, field: string, value: string | number) => {
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb =>
            lb.id === loadBlockId ? { ...lb, service_items: lb.service_items.map(s =>
              s.id === serviceId ? { ...s, [field]: value } : s
            )} : lb
          )}
        : d
    ))
  }

  // Accessorial functions for destination load blocks
  const addAccessorialToDestinationBlock = (destinationId: string, loadBlockId: string, accessorialType: InlandAccessorialType) => {
    const newAccessorial: InlandAccessorialCharge = {
      id: generateId(),
      type_id: accessorialType.id,
      type_name: accessorialType.name,
      amount: accessorialType.default_amount,
      is_percentage: accessorialType.is_percentage,
      billing_unit: (accessorialType.billing_unit || 'flat') as 'flat' | 'hour' | 'day' | 'way' | 'week' | 'month' | 'stop',
      condition_text: accessorialType.condition_text || null,
      quantity: 1
    }
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb =>
            lb.id === loadBlockId ? { ...lb, accessorial_charges: [...lb.accessorial_charges, newAccessorial] } : lb
          )}
        : d
    ))
  }

  const removeAccessorialFromDestinationBlock = (destinationId: string, loadBlockId: string, accessorialId: string) => {
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb =>
            lb.id === loadBlockId ? { ...lb, accessorial_charges: lb.accessorial_charges.filter(a => a.id !== accessorialId) } : lb
          )}
        : d
    ))
  }

  const updateAccessorialInDestinationBlock = (destinationId: string, loadBlockId: string, accessorialId: string, field: string, value: string | number | boolean) => {
    setInlandDestinationBlocks(prev => prev.map(d =>
      d.id === destinationId
        ? { ...d, load_blocks: d.load_blocks.map(lb =>
            lb.id === loadBlockId ? { ...lb, accessorial_charges: lb.accessorial_charges.map(a =>
              a.id === accessorialId ? { ...a, [field]: value } : a
            )} : lb
          )}
        : d
    ))
  }

  // Initialize with one destination block when section is shown
  useEffect(() => {
    if (showInlandSection && inlandDestinationBlocks.length === 0) {
      const initialBlock = {
        id: generateId(),
        name: 'Destination A',
        pickup: null,
        dropoff: null,
        stops: [],
        route: null,
        map_image_base64: null,
        load_blocks: [createDefaultLoadBlock()],
        internal_notes: '',
        customer_notes: '',
        special_instructions: '',
        rate_per_mile: 3.5,
        base_rate: 0,
        fuel_surcharge_percent: 15,
        margin_percentage: 0,
        manual_total: null,
        use_manual_pricing: false
      }
      setInlandDestinationBlocks([initialBlock])
      setActiveInlandDestinationId(initialBlock.id)
    }
  }, [showInlandSection])

  // Load block management functions - delegate to destination blocks when active
  const addInlandLoadBlock = () => {
    if (activeInlandDestinationId) {
      addLoadBlockToDestination(activeInlandDestinationId)
    } else {
      setInlandLoadBlocks(prev => [...prev, createDefaultLoadBlock()])
    }
  }

  const removeInlandLoadBlock = (blockId: string) => {
    if (activeInlandDestinationId) {
      removeLoadBlockFromDestination(activeInlandDestinationId, blockId)
    } else {
      setInlandLoadBlocks(prev => prev.filter(b => b.id !== blockId))
    }
  }

  const updateInlandLoadBlock = (blockId: string, updates: Partial<InlandLoadBlock>) => {
    if (activeInlandDestinationId) {
      updateLoadBlockInDestination(activeInlandDestinationId, blockId, updates)
    } else {
      setInlandLoadBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b))
    }
  }

  // Cargo item functions for load blocks - delegate to destination blocks when active
  const addCargoToBlock = (blockId: string) => {
    if (activeInlandDestinationId) {
      addCargoToDestinationBlock(activeInlandDestinationId, blockId)
    } else {
      const newCargo: InlandCargoItem = {
        id: generateId(),
        description: '',
        cargo_type: 'General Freight',
        quantity: 1,
        weight_lbs: null,
        length_inches: null,
        width_inches: null,
        height_inches: null,
        image_base64: null
      }
      setInlandLoadBlocks(prev => prev.map(b =>
        b.id === blockId ? { ...b, cargo_items: [...b.cargo_items, newCargo] } : b
      ))
    }
  }

  const removeCargoFromBlock = (blockId: string, cargoId: string) => {
    if (activeInlandDestinationId) {
      removeCargoFromDestinationBlock(activeInlandDestinationId, blockId, cargoId)
    } else {
      setInlandLoadBlocks(prev => prev.map(b =>
        b.id === blockId ? { ...b, cargo_items: b.cargo_items.filter(c => c.id !== cargoId) } : b
      ))
    }
  }

  const updateCargoInBlock = (blockId: string, cargoId: string, field: string, value: string | number | boolean | null) => {
    if (activeInlandDestinationId) {
      updateCargoInDestinationBlock(activeInlandDestinationId, blockId, cargoId, field, value)
    } else {
      setInlandLoadBlocks(prev => prev.map(b =>
        b.id === blockId ? {
          ...b,
          cargo_items: b.cargo_items.map(c =>
            c.id === cargoId ? { ...c, [field]: value } : c
          )
        } : b
      ))
    }
  }

  // useEffect to watch cargo items and auto-recommend truck types for inland section
  // This runs AFTER React state is updated, ensuring we have the latest data
  useEffect(() => {
    // Get the appropriate load blocks
    let loadBlocks: InlandLoadBlock[] = []
    if (activeInlandDestinationId) {
      const destBlock = inlandDestinationBlocks.find(d => d.id === activeInlandDestinationId)
      loadBlocks = destBlock?.load_blocks || []
    } else {
      loadBlocks = inlandLoadBlocks
    }

    if (loadBlocks.length === 0) return

    // Check each load block for recommendations
    loadBlocks.forEach(block => {
      if (block.cargo_items.length === 0) return

      // Check if any cargo item has dimensions
      const hasDimensions = block.cargo_items.some(c =>
        c.weight_lbs || c.length_inches || c.width_inches || c.height_inches
      )
      if (!hasDimensions) return

      // Skip if user has manually overridden
      const currentRec = inlandTruckRecommendations[block.id]
      if (currentRec?.isManualOverride) {
        // Still update the recommendation display
        const rec = recommendTruckType(block.cargo_items, inlandEquipmentTypes)
        if (rec.recommendedId !== currentRec.recommendedId || rec.reason !== currentRec.reason) {
          setInlandTruckRecommendations(prev => ({
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
      const rec = recommendTruckType(block.cargo_items, inlandEquipmentTypes)

      // Only update if recommendation changed
      if (rec.recommendedId !== currentRec?.recommendedId || rec.reason !== currentRec?.reason) {
        setInlandTruckRecommendations(prev => ({
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
          updateInlandLoadBlock(block.id, { truck_type_id: rec.recommendedId })
        }
      }
    })
  }, [inlandDestinationBlocks, inlandLoadBlocks, activeInlandDestinationId, inlandEquipmentTypes])

  // Check cargo dimensions and recommend appropriate truck type for inland section (legacy - kept for manual triggers)
  const checkAndApplyInlandTruckRecommendation = (blockId: string) => {
    // Find the load block (check destination blocks first, then legacy blocks)
    let loadBlock: InlandLoadBlock | undefined
    if (activeInlandDestinationId) {
      const destBlock = inlandDestinationBlocks.find(d => d.id === activeInlandDestinationId)
      loadBlock = destBlock?.load_blocks.find(b => b.id === blockId)
    } else {
      loadBlock = inlandLoadBlocks.find(b => b.id === blockId)
    }
    if (!loadBlock) return

    const currentRec = inlandTruckRecommendations[blockId]

    // If user has manually overridden, don't auto-change
    if (currentRec?.isManualOverride) {
      const rec = recommendTruckType(loadBlock.cargo_items, inlandEquipmentTypes)
      setInlandTruckRecommendations(prev => ({
        ...prev,
        [blockId]: { ...prev[blockId], recommendedId: rec.recommendedId, reason: rec.reason, multiTruckSuggestion: rec.multiTruckSuggestion }
      }))
      return
    }

    const rec = recommendTruckType(loadBlock.cargo_items, inlandEquipmentTypes)
    setInlandTruckRecommendations(prev => ({
      ...prev,
      [blockId]: { recommendedId: rec.recommendedId, reason: rec.reason, isManualOverride: false, multiTruckSuggestion: rec.multiTruckSuggestion }
    }))

    // Auto-apply if we have a recommendation and truck isn't already set
    if (rec.recommendedId && (!loadBlock.truck_type_id || loadBlock.truck_type_id === '')) {
      updateInlandLoadBlock(blockId, { truck_type_id: rec.recommendedId })
    }
  }

  // Handle manual truck selection for inland section
  const handleInlandManualTruckSelect = (blockId: string, truckTypeId: string) => {
    const rec = inlandTruckRecommendations[blockId]
    const isOverride = !!(rec?.recommendedId && truckTypeId !== rec.recommendedId)

    setInlandTruckRecommendations(prev => ({
      ...prev,
      [blockId]: {
        recommendedId: prev[blockId]?.recommendedId ?? null,
        reason: prev[blockId]?.reason ?? '',
        isManualOverride: isOverride,
        multiTruckSuggestion: prev[blockId]?.multiTruckSuggestion
      }
    }))

    updateInlandLoadBlock(blockId, { truck_type_id: truckTypeId })
  }

  // Split a load block into multiple blocks based on multi-truck recommendation
  const splitInlandLoadIntoMultipleTrucks = (blockId: string) => {
    const rec = inlandTruckRecommendations[blockId]
    if (!rec?.multiTruckSuggestion?.needsMultipleTrucks) return

    // Find the original block
    let originalBlock: InlandLoadBlock | undefined
    if (activeInlandDestinationId) {
      const destBlock = inlandDestinationBlocks.find(d => d.id === activeInlandDestinationId)
      originalBlock = destBlock?.load_blocks.find(b => b.id === blockId)
    } else {
      originalBlock = inlandLoadBlocks.find(b => b.id === blockId)
    }
    if (!originalBlock || originalBlock.cargo_items.length === 0) return

    const { truckBreakdown } = rec.multiTruckSuggestion

    // Create new load blocks based on the breakdown
    const newLoadBlocks: InlandLoadBlock[] = []
    let cargoIndex = 0

    truckBreakdown.forEach((breakdown, breakdownIdx) => {
      for (let i = 0; i < breakdown.count; i++) {
        const cargoForThisTruck: InlandCargoItem[] = []

        if (breakdownIdx === 0 && breakdown.cargoIndices.length > 0) {
          const indicesPerTruck = Math.ceil(breakdown.cargoIndices.length / breakdown.count)
          const startIdx = i * indicesPerTruck
          const endIdx = Math.min(startIdx + indicesPerTruck, breakdown.cargoIndices.length)

          for (let j = startIdx; j < endIdx; j++) {
            const cargo = originalBlock.cargo_items[breakdown.cargoIndices[j]]
            if (cargo) {
              cargoForThisTruck.push({ ...cargo, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })
            }
          }
        } else if (cargoIndex < originalBlock.cargo_items.length) {
          cargoForThisTruck.push({ ...originalBlock.cargo_items[cargoIndex], id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })
          cargoIndex++
        }

        if (cargoForThisTruck.length > 0 || i === 0) {
          const newBlock: InlandLoadBlock = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            truck_type_id: breakdown.truckTypeId,
            cargo_items: cargoForThisTruck,
            service_items: i === 0 ? originalBlock.service_items.map(s => ({ ...s, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })) : [],
            accessorial_charges: i === 0 ? originalBlock.accessorial_charges.map(a => ({ ...a, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })) : [],
            load_image_base64: null,
            notes: i === 0 ? originalBlock.notes : '',
          }
          newLoadBlocks.push(newBlock)
        }
      }
    })

    // Distribute remaining cargo
    const distributedCount = newLoadBlocks.reduce((sum, b) => sum + b.cargo_items.length, 0)
    if (distributedCount < originalBlock.cargo_items.length && newLoadBlocks.length > 0) {
      const remaining = originalBlock.cargo_items.slice(distributedCount).map(c => ({ ...c, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }))
      newLoadBlocks[newLoadBlocks.length - 1].cargo_items.push(...remaining)
    }

    // Update the appropriate state
    if (activeInlandDestinationId) {
      setInlandDestinationBlocks(prev => prev.map(d =>
        d.id === activeInlandDestinationId
          ? { ...d, load_blocks: [...d.load_blocks.filter(b => b.id !== blockId), ...newLoadBlocks] }
          : d
      ))
    } else {
      setInlandLoadBlocks(prev => [...prev.filter(b => b.id !== blockId), ...newLoadBlocks])
    }

    // Clear the recommendation for the old block
    setInlandTruckRecommendations(prev => {
      const updated = { ...prev }
      delete updated[blockId]
      return updated
    })
  }

  // Toggle equipment mode for inland cargo item
  const toggleInlandCargoEquipmentMode = (blockId: string, cargoId: string, isEquipment: boolean) => {
    updateCargoInBlock(blockId, cargoId, 'is_equipment', isEquipment)
    if (!isEquipment) {
      updateCargoInBlock(blockId, cargoId, 'equipment_make', null)
      updateCargoInBlock(blockId, cargoId, 'equipment_model', null)
      updateCargoInBlock(blockId, cargoId, 'equipment_model_id', null)
      updateCargoInBlock(blockId, cargoId, 'is_custom_equipment', false)
      updateCargoInBlock(blockId, cargoId, 'front_image_base64', null)
      updateCargoInBlock(blockId, cargoId, 'side_image_base64', null)
    }
  }

  // Handle equipment selection for inland cargo item
  const handleInlandEquipmentSelect = async (blockId: string, cargoId: string, make: string, model: string, modelId: string) => {
    updateCargoInBlock(blockId, cargoId, 'equipment_make', make)
    updateCargoInBlock(blockId, cargoId, 'equipment_model', model)
    updateCargoInBlock(blockId, cargoId, 'equipment_model_id', modelId)
    updateCargoInBlock(blockId, cargoId, 'description', `${make} ${model}`)
    updateCargoInBlock(blockId, cargoId, 'cargo_type', 'Equipment')

    const dimensions = await getEquipmentDimensionsById(modelId)
    if (dimensions) {
      updateCargoInBlock(blockId, cargoId, 'weight_lbs', dimensions.operating_weight)
      updateCargoInBlock(blockId, cargoId, 'length_inches', dimensions.transport_length)
      updateCargoInBlock(blockId, cargoId, 'width_inches', dimensions.transport_width)
      updateCargoInBlock(blockId, cargoId, 'height_inches', dimensions.transport_height)
      updateCargoInBlock(blockId, cargoId, 'front_image_base64', dimensions.front_image_base64)
      updateCargoInBlock(blockId, cargoId, 'side_image_base64', dimensions.side_image_base64)
    }
  }

  // Service item functions for load blocks - delegate to destination blocks when active
  const addServiceToBlock = (blockId: string, serviceType?: InlandServiceType) => {
    if (activeInlandDestinationId) {
      addServiceToDestinationBlock(activeInlandDestinationId, blockId, serviceType)
    } else {
      const newService: InlandServiceItem = {
        id: generateId(),
        name: serviceType?.name || '',
        description: serviceType?.description || '',
        price: serviceType?.default_price || 0,
        quantity: 1
      }
      setInlandLoadBlocks(prev => prev.map(b =>
        b.id === blockId ? { ...b, service_items: [...b.service_items, newService] } : b
      ))
    }
  }

  const removeServiceFromBlock = (blockId: string, serviceId: string) => {
    if (activeInlandDestinationId) {
      removeServiceFromDestinationBlock(activeInlandDestinationId, blockId, serviceId)
    } else {
      setInlandLoadBlocks(prev => prev.map(b =>
        b.id === blockId ? { ...b, service_items: b.service_items.filter(s => s.id !== serviceId) } : b
      ))
    }
  }

  const updateServiceInBlock = (blockId: string, serviceId: string, field: string, value: string | number) => {
    if (activeInlandDestinationId) {
      updateServiceInDestinationBlock(activeInlandDestinationId, blockId, serviceId, field, value)
    } else {
      setInlandLoadBlocks(prev => prev.map(b =>
        b.id === blockId ? {
          ...b,
          service_items: b.service_items.map(s =>
            s.id === serviceId ? { ...s, [field]: value } : s
          )
        } : b
      ))
    }
  }

  // Accessorial charge functions for load blocks - delegate to destination blocks when active
  const addAccessorialToBlock = (blockId: string, type: InlandAccessorialType) => {
    if (activeInlandDestinationId) {
      addAccessorialToDestinationBlock(activeInlandDestinationId, blockId, type)
    } else {
      const newCharge: InlandAccessorialCharge = {
        id: generateId(),
        type_id: type.id,
        type_name: type.name,
        amount: type.default_amount,
        is_percentage: type.is_percentage,
        billing_unit: type.billing_unit || 'flat',
        condition_text: type.condition_text,
        quantity: 1
      }
      setInlandLoadBlocks(prev => prev.map(b =>
        b.id === blockId ? { ...b, accessorial_charges: [...b.accessorial_charges, newCharge] } : b
      ))
    }
    setShowInlandAccessorialModal(false)
    setActiveInlandLoadBlockId(null)
  }

  const removeAccessorialFromBlock = (blockId: string, chargeId: string) => {
    if (activeInlandDestinationId) {
      removeAccessorialFromDestinationBlock(activeInlandDestinationId, blockId, chargeId)
    } else {
      setInlandLoadBlocks(prev => prev.map(b =>
        b.id === blockId ? { ...b, accessorial_charges: b.accessorial_charges.filter(c => c.id !== chargeId) } : b
      ))
    }
  }

  const updateAccessorialInBlock = (blockId: string, chargeId: string, field: string, value: string | number | boolean) => {
    if (activeInlandDestinationId) {
      updateAccessorialInDestinationBlock(activeInlandDestinationId, blockId, chargeId, field, value)
    } else {
      setInlandLoadBlocks(prev => prev.map(b =>
        b.id === blockId ? {
          ...b,
          accessorial_charges: b.accessorial_charges.map(c =>
            c.id === chargeId ? { ...c, [field]: value } : c
          )
        } : b
      ))
    }
  }

  // Handle load block image upload
  const handleLoadBlockImageUpload = async (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error')
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
          showToast('Failed to process SVG image. Please try a different format.', 'error')
          return
        }
      }

      updateInlandLoadBlock(blockId, { load_image_base64: base64 })
    }
    reader.readAsDataURL(file)
  }

  // Handle cargo image upload
  const handleCargoImageUpload = async (blockId: string, cargoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error')
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
          showToast('Failed to process SVG image. Please try a different format.', 'error')
          return
        }
      }

      updateCargoInBlock(blockId, cargoId, 'image_base64', base64)
    }
    reader.readAsDataURL(file)
  }

  // Calculate block total
  const calculateBlockTotal = (block: InlandLoadBlock) => {
    const serviceTotal = block.service_items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const accessorialTotal = block.accessorial_charges.reduce((sum, charge) => {
      const qty = charge.quantity || 1
      if (charge.is_percentage) {
        return sum + (serviceTotal * (charge.amount / 100) * qty)
      }
      return sum + (charge.amount * qty)
    }, 0)
    return { serviceTotal, accessorialTotal, total: serviceTotal + accessorialTotal }
  }

  // Calculate all blocks total
  const calculateAllBlocksTotal = () => {
    return inlandLoadBlocks.reduce((sum, block) => sum + calculateBlockTotal(block).total, 0)
  }

  // Calculate total for a specific destination's load blocks (services only, NOT accessorials)
  const calculateDestinationBlocksTotal = (destinationId: string) => {
    const destination = inlandDestinationBlocks.find(d => d.id === destinationId)
    if (!destination) return 0
    // Use serviceTotal only - accessorials are conditional fees not included in total
    return destination.load_blocks.reduce((sum, block) => sum + calculateBlockTotal(block).serviceTotal, 0)
  }

  // Calculate total for all destinations' load blocks (services only, NOT accessorials)
  const calculateAllDestinationsBlocksTotal = () => {
    return inlandDestinationBlocks.reduce((sum, dest) => {
      // Use serviceTotal only - accessorials are conditional fees not included in total
      return sum + dest.load_blocks.reduce((blockSum, block) => blockSum + calculateBlockTotal(block).serviceTotal, 0)
    }, 0)
  }

  const addInlandAccessorialCharge = (type: InlandAccessorialType) => {
    setInlandAccessorialCharges(prev => [
      ...prev,
      {
        type_id: type.id,
        type_name: type.name,
        amount: type.default_amount || 0,
        is_percentage: type.is_percentage,
        billing_unit: type.billing_unit || 'flat',
        condition_text: type.condition_text || null,
        quantity: 1
      }
    ])
    setShowInlandAccessorialModal(false)
  }

  const removeInlandAccessorialCharge = (index: number) => {
    setInlandAccessorialCharges(prev => prev.filter((_, i) => i !== index))
  }

  const updateInlandAccessorialAmount = (index: number, amount: number) => {
    setInlandAccessorialCharges(prev => prev.map((charge, i) =>
      i === index ? { ...charge, amount } : charge
    ))
  }

  const updateInlandAccessorialQuantity = (index: number, quantity: number) => {
    setInlandAccessorialCharges(prev => prev.map((charge, i) =>
      i === index ? { ...charge, quantity: Math.max(1, quantity) } : charge
    ))
  }

  const updateInlandAccessorialBillingUnit = (index: number, billing_unit: 'flat' | 'hour' | 'day' | 'way' | 'week' | 'month' | 'stop') => {
    setInlandAccessorialCharges(prev => prev.map((charge, i) =>
      i === index ? { ...charge, billing_unit } : charge
    ))
  }

  const updateInlandAccessorialCondition = (index: number, condition_text: string) => {
    setInlandAccessorialCharges(prev => prev.map((charge, i) =>
      i === index ? { ...charge, condition_text } : charge
    ))
  }

  const addInlandServiceItem = () => {
    setInlandServiceItems(prev => [...prev, { id: generateInlandId(), name: '', description: '', price: 0, quantity: 1 }])
  }

  const removeInlandServiceItem = (id: string) => {
    setInlandServiceItems(prev => prev.filter(item => item.id !== id))
  }

  const updateInlandServiceItem = (id: string, field: keyof InlandServiceItem, value: string | number) => {
    setInlandServiceItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const addInlandCargoItem = () => {
    setInlandCargoItems(prev => [...prev, {
      id: generateInlandId(), description: '', cargo_type: 'General Freight', quantity: 1,
      weight_lbs: null, length_inches: null, width_inches: null, height_inches: null,
      image_base64: null
    }])
  }

  const removeInlandCargoItem = (id: string) => {
    setInlandCargoItems(prev => prev.filter(item => item.id !== id))
  }

  const updateInlandCargoItem = (id: string, field: keyof InlandCargoItem, value: string | number | null) => {
    setInlandCargoItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleInlandImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be less than 5MB', 'error'); return }
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file', 'error'); return }
    const reader = new FileReader()
    reader.onload = async (event) => {
      let base64 = event.target?.result as string

      // Convert SVG to PNG for better compatibility
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        try {
          base64 = await convertSvgToPng(base64)
        } catch (err) {
          console.error('Failed to convert SVG:', err)
          showToast('Failed to process SVG image. Please try a different format.', 'error')
          return
        }
      }

      setInlandLoadImage(base64)
    }
    reader.readAsDataURL(file)
  }

  // Calculate inland totals - includes both flat arrays and load blocks
  const calculateInlandTotals = useCallback(() => {
    if (!showInlandSection) return { lineHaul: 0, fuelSurcharge: 0, accessorialTotal: 0, serviceItemsTotal: 0, total: 0 }

    // Flat service items total
    const flatServiceItemsTotal = inlandServiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Flat accessorial charges
    const flatAccessorialTotal = inlandAccessorialCharges.reduce((sum, charge) => {
      const qty = charge.quantity || 1
      if (charge.is_percentage) return sum + flatServiceItemsTotal * (charge.amount / 100) * qty
      return sum + (charge.amount * qty)
    }, 0)

    // Load blocks totals from destination blocks (services only, NOT accessorials)
    const loadBlocksServiceTotal = inlandDestinationBlocks.reduce((sum, dest) => {
      return sum + dest.load_blocks.reduce((blockSum, block) => blockSum + calculateBlockTotal(block).serviceTotal, 0)
    }, 0)

    // Combined totals (service items from all destination load blocks)
    const serviceItemsTotal = flatServiceItemsTotal + inlandDestinationBlocks.reduce((sum, dest) =>
      sum + dest.load_blocks.reduce((blockSum, block) =>
        blockSum + block.service_items.reduce((s, item) => s + (item.price * item.quantity), 0), 0), 0)
    const accessorialTotal = flatAccessorialTotal
    // Total only includes services, NOT accessorials (they are conditional fees)
    const total = flatServiceItemsTotal + loadBlocksServiceTotal

    return { lineHaul: 0, fuelSurcharge: 0, accessorialTotal, serviceItemsTotal, total }
  }, [showInlandSection, inlandAccessorialCharges, inlandServiceItems, inlandDestinationBlocks])

  const inlandTotals = calculateInlandTotals()

  // Calculate final totals (after inland is calculated)
  const subtotal = dismantlingSubtotal + inlandTotals.total
  const marginAmount = subtotal * (marginPercentage / 100)
  const totalWithMargin = subtotal + marginAmount

  // Calculate route for a specific destination block
  const calculateRouteForInlandDestination = useCallback(async (destinationId: string) => {
    const destination = inlandDestinationBlocks.find(d => d.id === destinationId)
    if (!destination?.pickup?.lat || !destination?.pickup?.lng || !destination?.dropoff?.lat || !destination?.dropoff?.lng) return

    setIsCalculatingInlandRoute(true)
    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: destination.pickup.lat, lng: destination.pickup.lng },
          destination: { lat: destination.dropoff.lat, lng: destination.dropoff.lng }
        })
      })
      if (response.ok) {
        const route = await response.json()
        updateInlandDestinationBlock(destinationId, { route })

        // Capture map image after route is calculated (with delay to let map render)
        setTimeout(async () => {
          if (inlandMapContainerRef.current) {
            try {
              const canvas = await html2canvas(inlandMapContainerRef.current, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                logging: false,
                backgroundColor: '#ffffff',
              })
              const mapImage = canvas.toDataURL('image/png')
              updateInlandDestinationBlock(destinationId, { map_image_base64: mapImage })
            } catch (err) {
              console.error('Error capturing map for destination:', err)
            }
          }
        }, 1500)
      }
    } catch (err) {
      console.error('Failed to calculate route:', err)
    } finally {
      setIsCalculatingInlandRoute(false)
    }
  }, [inlandDestinationBlocks, updateInlandDestinationBlock])

  // Auto-calculate route when active destination's addresses change
  useEffect(() => {
    if (activeInlandDestination?.pickup && activeInlandDestination?.dropoff && !activeInlandDestination?.route) {
      const timer = setTimeout(() => {
        calculateRouteForInlandDestination(activeInlandDestination.id)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [activeInlandDestination?.pickup?.place_id, activeInlandDestination?.dropoff?.place_id, activeInlandDestination?.id, activeInlandDestination?.route, calculateRouteForInlandDestination])

  // Legacy route calculation (for backward compatibility)
  const calculateInlandRoute = useCallback(async () => {
    if (!inlandPickup?.lat || !inlandPickup?.lng || !inlandDropoff?.lat || !inlandDropoff?.lng) return
    setIsCalculatingInlandRoute(true)
    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { lat: inlandPickup.lat, lng: inlandPickup.lng },
          destination: { lat: inlandDropoff.lat, lng: inlandDropoff.lng }
        })
      })
      if (response.ok) {
        const data = await response.json()
        setInlandRoute(data)
      }
    } catch (err) {
      console.error('Failed to calculate route:', err)
    } finally {
      setIsCalculatingInlandRoute(false)
    }
  }, [inlandPickup, inlandDropoff])

  // Auto-calculate legacy route when pickup/dropoff change
  useEffect(() => {
    if (inlandPickup && inlandDropoff && !activeInlandDestinationId) {
      calculateInlandRoute()
    }
  }, [inlandPickup, inlandDropoff, calculateInlandRoute, activeInlandDestinationId])

  // Capture inland map image for PDF
  const captureInlandMapImage = useCallback(async (): Promise<string | null> => {
    if (!inlandMapContainerRef.current) return null
    try {
      const canvas = await html2canvas(inlandMapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff',
      })
      return canvas.toDataURL('image/png')
    } catch (err) {
      console.error('Error capturing inland map:', err)
      return null
    }
  }, [])

  // Auto-capture map when route changes
  useEffect(() => {
    if (inlandRoute && inlandPickup && inlandDropoff) {
      // Wait for map to render before capturing
      const timer = setTimeout(async () => {
        const mapImage = await captureInlandMapImage()
        if (mapImage) {
          setInlandMapImage(mapImage)
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [inlandRoute, inlandPickup, inlandDropoff, captureInlandMapImage])

  // Add new customer
  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      showToast('Customer name is required', 'error')
      return
    }

    try {
      // Parse name into first/last
      const nameParts = newCustomer.name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || null

      // If company name is provided, find or create the company
      let companyId: string | null = null
      if (newCustomer.company) {
        // Try to find existing company
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', newCustomer.company)
          .single()

        if (existingCompany) {
          companyId = existingCompany.id
        } else {
          // Create new company
          const { data: newCompanyData, error: companyError } = await supabase
            .from('companies')
            .insert({
              name: newCustomer.company,
              phone: newCustomer.phone || null,
              address: newCustomer.address || null,
              status: 'active' as const,
              tags: []
            })
            .select()
            .single()

          if (companyError) throw companyError
          companyId = newCompanyData.id
        }
      }

      // Create the contact
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .insert({
          company_id: companyId,
          first_name: firstName,
          last_name: lastName,
          email: newCustomer.email || null,
          phone: newCustomer.phone || null,
          role: 'general' as const,
          is_primary: true,
          notes: newCustomer.notes || null
        })
        .select(`
          *,
          company:companies(*)
        `)
        .single()

      if (contactError) throw contactError

      // Also save to legacy customers table for backward compatibility
      const { data: legacyData } = await supabase
        .from('customers')
        .insert({
          name: newCustomer.name,
          company: newCustomer.company || null,
          email: newCustomer.email || null,
          phone: newCustomer.phone || null,
          address: newCustomer.address || null,
          notes: newCustomer.notes || null
        })
        .select()
        .single()

      if (legacyData) {
        setCustomers(prev => [...prev, legacyData].sort((a, b) => a.name.localeCompare(b.name)))
      }

      if (contactData) {
        setContacts(prev => [...prev, contactData as ContactWithCompany].sort((a, b) =>
          (a.first_name || '').localeCompare(b.first_name || '')
        ))
        setSelectedContactId(contactData.id)
        setSelectedCustomerId('')
        const fullName = [contactData.first_name, contactData.last_name].filter(Boolean).join(' ')
        setCustomerName(fullName)
        setCustomerEmail(contactData.email || '')
        setCustomerCompany((contactData as ContactWithCompany).company?.name || '')
        setShowAddCustomer(false)
        setNewCustomer({})
        showToast('Customer added!', 'success')
      }
    } catch (error) {
      console.error('Error adding customer:', error)
      showToast('Failed to add customer', 'error')
    }
  }

  // Update recent equipment when generating quote
  const updateRecentEquipment = async () => {
    if (!selectedRate) return

    try {
      // Upsert into recent_equipment
      const { error } = await supabase.rpc('update_recent_equipment', {
        p_rate_id: selectedRate.id,
        p_make: selectedRate.make,
        p_model: selectedRate.model
      })

      if (error) {
        // If function doesn't exist, try manual upsert
        const { error: upsertError } = await supabase
          .from('recent_equipment')
          .upsert({
            rate_id: selectedRate.id,
            equipment_make: selectedRate.make,
            equipment_model: selectedRate.model,
            last_used_at: new Date().toISOString(),
            use_count: 1
          }, {
            onConflict: 'rate_id'
          })

        if (upsertError) {
          console.error('Error updating recent equipment:', upsertError)
        }
      }

      // Refresh recent equipment list
      const { data: recentData } = await supabase
        .from('recent_equipment')
        .select('*')
        .order('last_used_at', { ascending: false })
        .limit(10)

      if (recentData) {
        setRecentEquipment(recentData)
      }
    } catch (error) {
      console.error('Error updating recent equipment:', error)
    }
  }

  // Quick select from recent equipment
  const handleRecentEquipmentSelect = (recent: RecentEquipment) => {
    const rate = rates.find(r => r.id === recent.rate_id)
    if (rate) {
      setSelectedMake(rate.make)
      // Models will be set by useEffect, but we need to set model after
      setTimeout(() => {
        setSelectedModel(rate.model)
      }, 100)
    }
  }

  // Auto-save draft (debounced)
  const saveDraft = useCallback(async () => {
    if (!selectedRate && !customerName && !internalNotes) return

    setAutoSaveStatus('saving')
    try {
      const draftData = {
        rate_id: selectedRate?.id || null,
        equipment_make: selectedRate?.make || null,
        equipment_model: selectedRate?.model || null,
        location: selectedLocation || null,
        customer_id: selectedCustomerId || null,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        cost_overrides: costOverrides,
        enabled_costs: enabledCosts,
        cost_descriptions: costDescriptions,
        miscellaneous_fees: miscellaneousFees,
        margin_percentage: marginPercentage,
        expiration_days: 30,
        internal_notes: internalNotes || null,
        updated_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      }

      if (currentDraftId) {
        // Update existing draft
        const { error } = await supabase
          .from('quote_drafts')
          .update(draftData)
          .eq('id', currentDraftId)

        if (error) throw error
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('quote_drafts')
          .insert(draftData)
          .select()
          .single()

        if (error) throw error
        if (data) {
          setCurrentDraftId(data.id)
        }
      }

      setAutoSaveStatus('saved')
      setLastSavedAt(new Date())
    } catch (error) {
      console.error('Error saving draft:', error)
      setAutoSaveStatus('unsaved')
    }
  }, [selectedRate, selectedLocation, selectedCustomerId, customerName, customerEmail, costOverrides, enabledCosts, costDescriptions, miscellaneousFees, marginPercentage, internalNotes, currentDraftId])

  // Auto-save effect (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedRate || customerName || internalNotes) {
        saveDraft()
      }
    }, 2000) // Save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId)
  }, [selectedRate, selectedLocation, customerName, customerEmail, costOverrides, enabledCosts, miscellaneousFees, marginPercentage, internalNotes])

  // Generate live PDF preview (debounced)
  const generateLivePdfPreview = useCallback(async () => {
    // Check for required data based on mode
    const hasMultiEquipmentData = multiEquipmentMode && equipmentBlocks.some(b => (b.costs || b.isCustom) && b.location)
    const hasSingleEquipmentData = (selectedRate || (isCustomQuote && customMake && customModel)) && selectedLocation

    if (!hasMultiEquipmentData && !hasSingleEquipmentData) {
      setLivePdfBlob(null)
      return
    }

    setIsGeneratingLivePdf(true)
    try {
      // For multi-equipment mode, use first block's data for main equipment fields
      const firstBlock = multiEquipmentMode ? equipmentBlocks.find(b => (b.costs || b.isCustom) && b.location) : null

      // Build equipment info
      const equipmentForQuote = multiEquipmentMode && firstBlock
        ? (firstBlock.rate || {
            id: 'multi',
            make_id: 'multi',
            model_id: 'multi',
            price: null as number | null,
            notes: null as string | null,
            updated_at: new Date().toISOString(),
            make: firstBlock.make,
            model: firstBlock.model
          })
        : isCustomQuote
        ? {
            id: 'custom',
            make_id: 'custom',
            model_id: 'custom',
            price: null as number | null,
            notes: null as string | null,
            updated_at: new Date().toISOString(),
            make: customMake,
            model: customModel
          }
        : selectedRate!

      // Build quote dimensions if available
      let quoteDimensions: QuoteDimensions | undefined = undefined
      if (multiEquipmentMode && firstBlock && firstBlock.dimensions) {
        quoteDimensions = firstBlock.dimensions
      } else if (isCustomQuote && (customDimensions.operatingWeight || customDimensions.transportLength || customDimensions.transportWidth || customDimensions.transportHeight || customImages.frontImageBase64 || customImages.sideImageBase64)) {
        quoteDimensions = {
          operatingWeight: customDimensions.operatingWeight,
          transportLength: customDimensions.transportLength,
          transportWidth: customDimensions.transportWidth,
          transportHeight: customDimensions.transportHeight,
          frontImageBase64: customImages.frontImageBase64,
          sideImageBase64: customImages.sideImageBase64
        }
      } else if (equipmentDimensions) {
        quoteDimensions = {
          operatingWeight: equipmentDimensions.operating_weight,
          transportLength: equipmentDimensions.transport_length,
          transportWidth: equipmentDimensions.transport_width,
          transportHeight: equipmentDimensions.transport_height,
          frontImageBase64: equipmentDimensions.front_image_base64 || null,
          sideImageBase64: equipmentDimensions.side_image_base64 || null
        }
      }

      // Build inland transportation data if section is active
      const inlandDataPreview: InlandTransportationData | undefined = showInlandSection ? {
        pickup: inlandPickup,
        dropoff: inlandDropoff,
        route: inlandRoute,
        ratePerMile: inlandRatePerMile,
        baseRate: inlandBaseRate,
        fuelSurchargePercent: inlandFuelSurchargePercent,
        equipmentTypeName: inlandEquipmentTypes.find(e => e.id === inlandEquipmentTypeId)?.name,
        accessorialCharges: inlandAccessorialCharges,
        serviceItems: inlandServiceItems,
        cargoItems: inlandCargoItems,
        loadImageBase64: inlandLoadImage,
        mapImage: inlandMapImage,
        notes: inlandNotes,
        totals: inlandTotals,
        load_blocks: inlandLoadBlocks.length > 0 ? inlandLoadBlocks : undefined,
        destination_blocks: inlandDestinationBlocks.length > 0 ? inlandDestinationBlocks : undefined
      } : undefined

      const quoteData: QuoteData = {
        equipment: equipmentForQuote,
        location: multiEquipmentMode && firstBlock ? firstBlock.location! : selectedLocation as Location,
        costs: multiEquipmentMode && firstBlock ? firstBlock.costs : locationCosts,
        costDescriptions: multiEquipmentMode && firstBlock ? firstBlock.costDescriptions : costDescriptions,
        enabledCosts: multiEquipmentMode && firstBlock ? firstBlock.enabledCosts : enabledCosts,
        costOverrides: multiEquipmentMode && firstBlock ? firstBlock.costOverrides : costOverrides,
        miscellaneousFees: multiEquipmentMode && firstBlock
          ? firstBlock.miscellaneousFees.filter(fee => fee.title && fee.cost > 0)
          : miscellaneousFees.filter(fee => fee.title && fee.cost > 0),
        customerName: customerName ? sanitizeText(customerName) : undefined,
        customerEmail: customerEmail ? validateEmail(customerEmail).sanitized : undefined,
        customerCompany: customerCompany ? sanitizeText(customerCompany) : undefined,
        customerPhone: customerPhone ? validatePhone(customerPhone).sanitized : undefined,
        billingAddress: billingAddress ? sanitizeText(billingAddress) : undefined,
        billingCity: billingCity ? sanitizeText(billingCity) : undefined,
        billingState: billingState ? sanitizeText(billingState) : undefined,
        billingZip: billingZip ? sanitizeText(billingZip) : undefined,
        paymentTerms: paymentTerms ? sanitizeText(paymentTerms) : undefined,
        quoteDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        quoteNumber: generateQuoteNumber(),
        marginPercentage: marginPercentage,
        companySettings: companySettings || undefined,
        dimensions: quoteDimensions,
        inlandTransportation: inlandDataPreview,
        // Multi-equipment blocks
        equipmentBlocks: multiEquipmentMode ? equipmentBlocks.filter(b => (b.costs || b.isCustom) && b.location) : undefined
      }

      const blob = await generateProfessionalQuotePDFBlobAsync(quoteData, true) // isDraft = true to show watermark
      setLivePdfBlob(blob)
    } catch (err) {
      console.error('Error generating live PDF preview:', err)
      setLivePdfBlob(null)
    } finally {
      setIsGeneratingLivePdf(false)
    }
  }, [selectedRate, selectedLocation, isCustomQuote, customMake, customModel, customDimensions, customImages, equipmentDimensions, locationCosts, costDescriptions, enabledCosts, costOverrides, miscellaneousFees, customerName, customerEmail, customerCompany, customerPhone, billingAddress, billingCity, billingState, billingZip, paymentTerms, marginPercentage, companySettings, showInlandSection, inlandPickup, inlandDropoff, inlandRoute, inlandRatePerMile, inlandBaseRate, inlandFuelSurchargePercent, inlandEquipmentTypeId, inlandEquipmentTypes, inlandAccessorialCharges, inlandServiceItems, inlandCargoItems, inlandLoadImage, inlandMapImage, inlandNotes, inlandTotals, inlandLoadBlocks, inlandDestinationBlocks, multiEquipmentMode, equipmentBlocks])

  // Debounced live PDF generation effect
  useEffect(() => {
    if (showLivePdfPreview) {
      // Create a simple hash of the key data to detect real changes
      const dataHash = JSON.stringify({
        rate: selectedRate?.id,
        location: selectedLocation,
        customer: customerName,
        costs: costOverrides,
        enabled: enabledCosts,
        misc: miscellaneousFees,
        margin: marginPercentage,
        inland: showInlandSection ? {
          pickup: inlandPickup?.formatted_address,
          dropoff: inlandDropoff?.formatted_address,
          services: inlandServiceItems?.length,
          servicesTotal: inlandServiceItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          cargo: inlandCargoItems?.length,
          accessorials: inlandAccessorialCharges?.length,
          accessorialsTotal: inlandAccessorialCharges?.reduce((sum, c) => sum + c.amount, 0),
          route: inlandRoute?.distance_miles,
          totals: inlandTotals?.total,
          loadBlocks: inlandLoadBlocks?.length,
          destinationBlocks: inlandDestinationBlocks?.length,
          hasMap: !!inlandMapImage,
        } : null,
        // Multi-equipment data
        multiEquipment: multiEquipmentMode,
        blocks: multiEquipmentMode ? equipmentBlocks.map(b => ({
          make: b.make,
          model: b.model,
          location: b.location,
          costs: b.costOverrides,
          enabled: b.enabledCosts,
          hasFrontImage: !!b.frontImageBase64,
          hasSideImage: !!b.sideImageBase64,
          hasDimensions: !!(b.dimensions?.transportLength || b.dimensions?.transportWidth || b.dimensions?.transportHeight || b.dimensions?.operatingWeight),
        })) : null,
      })

      // Only regenerate if data actually changed
      if (dataHash === lastPdfDataHashRef.current) {
        return
      }
      lastPdfDataHashRef.current = dataHash

      // Clear any pending generation
      if (livePdfGenerationTimeoutRef.current) {
        clearTimeout(livePdfGenerationTimeoutRef.current)
      }

      // Debounce PDF generation by 1000ms (increased from 500ms)
      livePdfGenerationTimeoutRef.current = setTimeout(() => {
        generateLivePdfPreview()
      }, 1000)

      return () => {
        if (livePdfGenerationTimeoutRef.current) {
          clearTimeout(livePdfGenerationTimeoutRef.current)
        }
      }
    }
  }, [showLivePdfPreview, selectedRate, selectedLocation, customerName, costOverrides, enabledCosts, miscellaneousFees, marginPercentage, showInlandSection, inlandPickup, inlandDropoff, inlandServiceItems, inlandCargoItems, inlandAccessorialCharges, inlandRoute, inlandTotals, inlandLoadBlocks, inlandDestinationBlocks, inlandMapImage, multiEquipmentMode, equipmentBlocks, generateLivePdfPreview])

  // Clear draft after successful quote generation
  const clearDraft = async () => {
    if (currentDraftId) {
      await supabase.from('quote_drafts').delete().eq('id', currentDraftId)
      setCurrentDraftId(null)
    }
  }

  // Download from preview
  const downloadFromPreview = async () => {
    if (!previewQuoteData || !selectedRate || !selectedLocation) return

    // Save to history and download
    let historySaved = false
    try {
      const costValues: Record<string, number | null> = {}
      COST_FIELDS.forEach(field => {
        if (enabledCosts[field.key]) {
          costValues[field.key] = getEffectiveCost(field.key)
        } else {
          costValues[field.key] = null
        }
      })

      const validMiscFees = miscellaneousFees.filter(fee => fee.title && fee.cost > 0)
      const miscFeesJson = validMiscFees.length > 0 ? JSON.stringify(validMiscFees) : null

      const { error } = await supabase.from('quote_history').insert({
        quote_number: previewQuoteData.quoteNumber,
        rate_id: selectedRate.id,
        equipment_make: selectedRate.make,
        equipment_model: selectedRate.model,
        location: selectedLocation,
        dismantling_loading_cost: costValues.dismantling_loading_cost,
        loading_cost: costValues.loading_cost,
        blocking_bracing_cost: costValues.blocking_bracing_cost,
        ncb_survey_cost: costValues.ncb_survey_cost,
        local_drayage_cost: costValues.local_drayage_cost,
        chassis_cost: costValues.chassis_cost,
        tolls_cost: costValues.tolls_cost,
        escorts_cost: costValues.escorts_cost,
        power_wash_cost: costValues.power_wash_cost,
        waste_fluids_disposal_fee: costValues.waste_fluids_disposal_fee,
        miscellaneous_costs: null,
        miscellaneous_fees_json: miscFeesJson,
        margin_percentage: marginPercentage,
        version: 1,
        parent_quote_id: null,
        original_quote_id: null,
        margin_amount: marginAmount,
        subtotal: subtotal,
        total_with_margin: totalWithMargin,
        customer_name: customerName || null,
        customer_email: customerEmail || null
      })

      if (!error) {
        historySaved = true
      }
    } catch (error) {
      console.error('Error saving quote history:', error)
    }

    // Use async version if multi-equipment to handle block images
    if (previewQuoteData.equipmentBlocks && previewQuoteData.equipmentBlocks.length > 0) {
      await generateProfessionalQuotePDFAsync(previewQuoteData)
    } else {
      generateProfessionalQuotePDF(previewQuoteData)
    }
    closePreview()

    // Update recent equipment and clear draft
    await updateRecentEquipment()
    await clearDraft()

    if (historySaved) {
      showToast('Quote PDF downloaded and saved to history!', 'success')
    } else {
      showToast('Quote PDF downloaded (not saved to history)', 'error')
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with PDF Preview Toggle */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dismantling Quote</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* PDF Preview Toggle */}
            <button
              onClick={() => setShowLivePdfPreview(!showLivePdfPreview)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                showLivePdfPreview
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {showLivePdfPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            {/* Auto-save Status */}
            {(selectedRate || customerName || internalNotes) && (
              <div className="flex items-center gap-2 text-sm">
                {autoSaveStatus === 'saving' && (
                  <span className="text-gray-500 flex items-center gap-1">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                )}
                {autoSaveStatus === 'saved' && lastSavedAt && (
                  <span className="text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </span>
                )}
                {autoSaveStatus === 'unsaved' && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Unsaved
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className={`max-w-[1800px] mx-auto p-6 ${showLivePdfPreview ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : ''}`}>
        {/* Left Side - Form */}
        <div className={showLivePdfPreview ? '' : 'max-w-3xl mx-auto'}>
          <div className="space-y-6">
      {/* Recent Equipment Quick-Select */}
      {recentEquipment.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Equipment
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentEquipment.map(recent => (
              <button
                key={recent.id}
                onClick={() => handleRecentEquipmentSelect(recent)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  selectedRate?.id === recent.rate_id
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {recent.equipment_make} {recent.equipment_model}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selection Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Generate Quote</h2>

          <div className="flex items-center gap-4">
            {/* Multi-Equipment Toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <div
                onClick={() => {
                  const newMode = !multiEquipmentMode
                  setMultiEquipmentMode(newMode)
                  if (newMode && equipmentBlocks.length === 0) {
                    // Starting multi-equipment mode - create first block
                    addEquipmentBlock()
                  }
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  multiEquipmentMode ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    multiEquipmentMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className={multiEquipmentMode ? 'text-green-700 font-medium' : 'text-gray-600'}>
                Multi-Equipment
              </span>
            </label>

            <div className="h-6 border-l border-gray-300" />

            {/* Custom Quote Toggle - only show in single equipment mode */}
            {!multiEquipmentMode && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <div
                  onClick={() => {
                    setIsCustomQuote(!isCustomQuote)
                    if (!isCustomQuote) {
                      // Switching to custom mode - clear selections
                      setSelectedMake('')
                      setSelectedModel('')
                      setSelectedRate(null)
                      setLocationCosts(null)
                      setEquipmentDimensions(null)
                    } else {
                      // Switching to database mode - clear custom fields
                      setCustomMake('')
                      setCustomModel('')
                      setCustomDimensions({
                        operatingWeight: null,
                        transportLength: null,
                        transportWidth: null,
                        transportHeight: null
                      })
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isCustomQuote ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isCustomQuote ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
                <span className={isCustomQuote ? 'text-purple-700 font-medium' : 'text-gray-600'}>
                  Custom Quote
                </span>
              </label>
            )}

            {/* Filter Checkboxes - only show when not in custom mode and not in multi-equipment mode */}
            {!isCustomQuote && !multiEquipmentMode && (
              <>
                <div className="h-6 border-l border-gray-300" />
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterHasPrice}
                    onChange={(e) => setFilterHasPrice(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span>Has Price</span>
                  <span className="text-xs text-gray-400">
                    ({allRates.filter(r => ratesWithCosts.has(r.id)).length})
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterHasDimensions}
                    onChange={(e) => setFilterHasDimensions(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span>Has Dimensions</span>
                  <span className="text-xs text-gray-400">
                    ({allRates.filter(r => ratesWithDimensions.has(r.model_id)).length})
                  </span>
                </label>
              </>
            )}
          </div>
        </div>

        {/* Multi-Equipment Notice */}
        {multiEquipmentMode && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <strong>Multi-Equipment Mode:</strong> Add multiple machines to this quote. Each equipment item can have its own pricing and configuration.
          </div>
        )}

        {/* Custom Quote Notice */}
        {isCustomQuote && !multiEquipmentMode && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
            <strong>Custom Quote Mode:</strong> Enter equipment details manually. This quote won't be linked to your database.
          </div>
        )}

        {/* Multi-Equipment Blocks Section */}
        {multiEquipmentMode ? (
          <div className="space-y-4 mb-6">
            {/* Equipment Blocks List */}
            <div className="flex flex-wrap gap-2 mb-4">
              {equipmentBlocks.map((block, idx) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setActiveEquipmentBlockId(block.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeEquipmentBlockId === block.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {block.make && block.model ? `${block.make} ${block.model}` : `Equipment ${idx + 1}`}
                  {block.quantity > 1 && <span className="ml-1 text-xs opacity-75">×{block.quantity}</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={addEquipmentBlock}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Equipment
              </button>
            </div>

            {/* Active Equipment Block Editor */}
            {activeEquipmentBlockId && equipmentBlocks.find(b => b.id === activeEquipmentBlockId) && (() => {
              const block = equipmentBlocks.find(b => b.id === activeEquipmentBlockId)!
              return (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">
                      {block.make && block.model ? `${block.make} ${block.model}` : 'New Equipment'}
                    </h4>
                    {equipmentBlocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEquipmentBlock(block.id)}
                        className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Equipment Selection Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Custom Equipment Toggle */}
                    <div className="md:col-span-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={block.isCustom}
                          onChange={(e) => updateEquipmentBlock(block.id, {
                            isCustom: e.target.checked,
                            rate: null,
                            costs: null
                          })}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-gray-600">Custom Equipment (not in database)</span>
                      </label>
                    </div>

                    {/* Make */}
                    <div>
                      {block.isCustom ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                          <input
                            type="text"
                            value={block.make}
                            onChange={(e) => updateEquipmentBlock(block.id, { make: e.target.value })}
                            placeholder="Enter make..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          />
                        </>
                      ) : (
                        <SearchableSelect
                          options={makes}
                          value={block.make}
                          onChange={(value) => {
                            updateEquipmentBlock(block.id, { make: value, model: '', rate: null, costs: null })
                          }}
                          placeholder="Select make..."
                          label="Make"
                        />
                      )}
                    </div>

                    {/* Model */}
                    <div>
                      {block.isCustom ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                          <input
                            type="text"
                            value={block.model}
                            onChange={(e) => updateEquipmentBlock(block.id, { model: e.target.value })}
                            placeholder="Enter model..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          />
                        </>
                      ) : (
                        <SearchableSelect
                          options={block.make ? rates.filter(r => r.make === block.make).map(r => ({ value: r.model, label: r.model })).filter((v, i, a) => a.findIndex(t => t.value === v.value) === i) : []}
                          value={block.model}
                          onChange={(value) => {
                            const rate = rates.find(r => r.make === block.make && r.model === value)
                            updateEquipmentBlock(block.id, { model: value, rate: rate || null })
                            if (rate) {
                              // Fetch dimensions and images for this equipment (use model_id, not rate.id)
                              fetchEquipmentBlockDimensions(block.id, rate.model_id)
                              if (block.location) {
                                fetchEquipmentBlockCosts(block.id, rate.id, block.location)
                              }
                            }
                          }}
                          placeholder="Select model..."
                          label="Model"
                          disabled={!block.make}
                        />
                      )}
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loading Location</label>
                      <select
                        value={block.location || ''}
                        onChange={(e) => {
                          const loc = e.target.value as Location
                          updateEquipmentBlock(block.id, { location: loc || null })
                          if (block.rate && loc) {
                            fetchEquipmentBlockCosts(block.id, block.rate.id, loc)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        <option value="">Select location...</option>
                        {LOCATIONS.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={block.quantity}
                        onChange={(e) => updateEquipmentBlock(block.id, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Equipment Images for this block */}
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Equipment Images</h5>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Front Image */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Front View</div>
                        {block.frontImageBase64 ? (
                          <div className="relative group">
                            <img
                              src={block.frontImageBase64}
                              alt="Front view"
                              className="w-full h-24 object-contain bg-green-50 rounded-lg border border-green-200"
                            />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <label className="px-2 py-1 bg-green-600 text-white text-xs rounded cursor-pointer hover:bg-green-700 transition-colors">
                                Replace
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      const reader = new FileReader()
                                      reader.onload = (event) => {
                                        updateEquipmentBlock(block.id, { frontImageBase64: event.target?.result as string })
                                      }
                                      reader.readAsDataURL(file)
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => updateEquipmentBlock(block.id, { frontImageBase64: null })}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-24 bg-green-50 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-xs text-green-500 mt-1">Upload Front</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const reader = new FileReader()
                                  reader.onload = (event) => {
                                    updateEquipmentBlock(block.id, { frontImageBase64: event.target?.result as string })
                                  }
                                  reader.readAsDataURL(file)
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Side Image */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Side View</div>
                        {block.sideImageBase64 ? (
                          <div className="relative group">
                            <img
                              src={block.sideImageBase64}
                              alt="Side view"
                              className="w-full h-24 object-contain bg-green-50 rounded-lg border border-green-200"
                            />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <label className="px-2 py-1 bg-green-600 text-white text-xs rounded cursor-pointer hover:bg-green-700 transition-colors">
                                Replace
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      const reader = new FileReader()
                                      reader.onload = (event) => {
                                        updateEquipmentBlock(block.id, { sideImageBase64: event.target?.result as string })
                                      }
                                      reader.readAsDataURL(file)
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => updateEquipmentBlock(block.id, { sideImageBase64: null })}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-24 bg-green-50 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-xs text-green-500 mt-1">Upload Side</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const reader = new FileReader()
                                  reader.onload = (event) => {
                                    updateEquipmentBlock(block.id, { sideImageBase64: event.target?.result as string })
                                  }
                                  reader.readAsDataURL(file)
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Equipment Dimensions for this block */}
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Equipment Dimensions</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(() => {
                        const emptyDims: QuoteDimensions = { operatingWeight: null, transportLength: null, transportWidth: null, transportHeight: null, frontImageBase64: null, sideImageBase64: null }
                        return (
                          <>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Weight (lbs)</label>
                              <input
                                type="number"
                                value={block.dimensions?.operatingWeight ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                  updateEquipmentBlock(block.id, {
                                    dimensions: { ...(block.dimensions || emptyDims), operatingWeight: val }
                                  })
                                }}
                                placeholder="0"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Length (ft.in)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                key={`length-${block.id}-${block.dimensions?.transportLength ?? 'empty'}`}
                                defaultValue={block.dimensions?.transportLength ? inchesToFtInString(block.dimensions.transportLength) : ''}
                                onBlur={(e) => {
                                  const rawValue = e.target.value.trim()
                                  if (rawValue === '') {
                                    updateEquipmentBlock(block.id, {
                                      dimensions: { ...(block.dimensions || emptyDims), transportLength: null }
                                    })
                                    return
                                  }
                                  const convertedVal = parseSmartDimension(rawValue, 'length')
                                  updateEquipmentBlock(block.id, {
                                    dimensions: { ...(block.dimensions || emptyDims), transportLength: convertedVal }
                                  })
                                }}
                                placeholder="e.g., 10.5"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Width (ft.in)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                key={`width-${block.id}-${block.dimensions?.transportWidth ?? 'empty'}`}
                                defaultValue={block.dimensions?.transportWidth ? inchesToFtInString(block.dimensions.transportWidth) : ''}
                                onBlur={(e) => {
                                  const rawValue = e.target.value.trim()
                                  if (rawValue === '') {
                                    updateEquipmentBlock(block.id, {
                                      dimensions: { ...(block.dimensions || emptyDims), transportWidth: null }
                                    })
                                    return
                                  }
                                  const convertedVal = parseSmartDimension(rawValue, 'width')
                                  updateEquipmentBlock(block.id, {
                                    dimensions: { ...(block.dimensions || emptyDims), transportWidth: convertedVal }
                                  })
                                }}
                                placeholder="e.g., 8.6"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Height (ft.in)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                key={`height-${block.id}-${block.dimensions?.transportHeight ?? 'empty'}`}
                                defaultValue={block.dimensions?.transportHeight ? inchesToFtInString(block.dimensions.transportHeight) : ''}
                                onBlur={(e) => {
                                  const rawValue = e.target.value.trim()
                                  if (rawValue === '') {
                                    updateEquipmentBlock(block.id, {
                                      dimensions: { ...(block.dimensions || emptyDims), transportHeight: null }
                                    })
                                    return
                                  }
                                  const convertedVal = parseSmartDimension(rawValue, 'height')
                                  updateEquipmentBlock(block.id, {
                                    dimensions: { ...(block.dimensions || emptyDims), transportHeight: convertedVal }
                                  })
                                }}
                                placeholder="e.g., 11.2"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Cost Details for this block */}
                  {(block.costs || block.isCustom) && block.location && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Cost Breakdown</h5>
                      <div className="space-y-2">
                        {COST_FIELDS.map(({ key, label }) => {
                          const baseCost = block.costs?.[key as keyof LocationCost] as number | null
                          const overrideCost = block.costOverrides[key]
                          const effectiveCost = overrideCost !== undefined ? overrideCost : baseCost
                          const isEnabled = block.enabledCosts[key] !== false
                          const isOverridden = overrideCost !== undefined
                          const hasOriginalValue = baseCost !== null

                          return (
                            <div key={key} className={`py-2 border-b border-gray-100 ${!isEnabled ? 'opacity-50' : ''}`}>
                              <div className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => updateEquipmentBlock(block.id, {
                                      enabledCosts: { ...block.enabledCosts, [key]: !isEnabled }
                                    })}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                                      isEnabled ? 'bg-green-600' : 'bg-gray-300'
                                    }`}
                                    role="switch"
                                    aria-checked={isEnabled}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        isEnabled ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                  <span className={`text-sm ${isEnabled ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
                                    {label}
                                    {!hasOriginalValue && <span className="text-xs text-gray-400 ml-1">(no default)</span>}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isEnabled ? (
                                    <>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={effectiveCost ?? ''}
                                          onChange={(e) => updateEquipmentBlock(block.id, {
                                            costOverrides: { ...block.costOverrides, [key]: e.target.value === '' ? null : parseFloat(e.target.value) }
                                          })}
                                          placeholder="0.00"
                                          className={`w-28 pl-6 pr-2 py-1 text-sm text-right border rounded focus:outline-none focus:ring-1 focus:ring-green-500 ${
                                            isOverridden ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                                          }`}
                                        />
                                      </div>
                                      {isOverridden && hasOriginalValue && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = { ...block.costOverrides }
                                            delete updated[key]
                                            updateEquipmentBlock(block.id, { costOverrides: updated })
                                          }}
                                          className="text-xs text-amber-600 hover:text-amber-800"
                                          title="Reset to original value"
                                        >
                                          Reset
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-400 line-through text-sm">${effectiveCost?.toFixed(2) || '0.00'}</span>
                                  )}
                                </div>
                              </div>
                              {isEnabled && (
                                <input
                                  type="text"
                                  value={block.costDescriptions[key] || ''}
                                  onChange={(e) => updateEquipmentBlock(block.id, {
                                    costDescriptions: { ...block.costDescriptions, [key]: e.target.value }
                                  })}
                                  placeholder={`Description for ${label} (optional)`}
                                  className="w-full mt-2 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Miscellaneous Fees for this block */}
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-sm font-medium text-gray-700">Miscellaneous Fees</h5>
                          <button
                            type="button"
                            onClick={() => {
                              const newFee: MiscellaneousFee = {
                                id: crypto.randomUUID(),
                                title: '',
                                description: '',
                                cost: 0
                              }
                              updateEquipmentBlock(block.id, {
                                miscellaneousFees: [...block.miscellaneousFees, newFee]
                              })
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Fee
                          </button>
                        </div>

                        {block.miscellaneousFees.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No miscellaneous fees</p>
                        ) : (
                          <div className="space-y-2">
                            {block.miscellaneousFees.map((fee) => (
                              <div key={fee.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                                <div className="flex-1 space-y-1">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={fee.title}
                                      onChange={(e) => {
                                        const updatedFees = block.miscellaneousFees.map(f =>
                                          f.id === fee.id ? { ...f, title: e.target.value } : f
                                        )
                                        updateEquipmentBlock(block.id, { miscellaneousFees: updatedFees })
                                      }}
                                      placeholder="Fee title"
                                      className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                    />
                                    <div className="relative w-24">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={fee.cost || ''}
                                        onChange={(e) => {
                                          const updatedFees = block.miscellaneousFees.map(f =>
                                            f.id === fee.id ? { ...f, cost: parseFloat(e.target.value) || 0 } : f
                                          )
                                          updateEquipmentBlock(block.id, { miscellaneousFees: updatedFees })
                                        }}
                                        placeholder="0.00"
                                        className="w-full pl-5 pr-2 py-1 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                      />
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={fee.description}
                                    onChange={(e) => {
                                      const updatedFees = block.miscellaneousFees.map(f =>
                                        f.id === fee.id ? { ...f, description: e.target.value } : f
                                      )
                                      updateEquipmentBlock(block.id, { miscellaneousFees: updatedFees })
                                    }}
                                    placeholder="Description (optional)"
                                    className="w-full px-2 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedFees = block.miscellaneousFees.filter(f => f.id !== fee.id)
                                    updateEquipmentBlock(block.id, { miscellaneousFees: updatedFees })
                                  }}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                  title="Remove fee"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            {block.miscellaneousFees.reduce((sum, f) => sum + (f.cost || 0), 0) > 0 && (
                              <div className="flex justify-between text-xs text-gray-600 pt-1">
                                <span>Misc Fees Total</span>
                                <span className="font-medium">${block.miscellaneousFees.reduce((sum, f) => sum + (f.cost || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Block Total */}
                      <div className="mt-3 pt-3 border-t border-green-200 flex justify-between items-center">
                        <span className="text-sm text-gray-600">Block Subtotal{block.quantity > 1 ? ` (×${block.quantity})` : ''}:</span>
                        <span className="font-semibold text-green-700">
                          ${calculateEquipmentBlockTotal(block).subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes for this block */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Notes</label>
                    <textarea
                      value={block.notes}
                      onChange={(e) => updateEquipmentBlock(block.id, { notes: e.target.value })}
                      placeholder="Notes for this equipment..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                  </div>
                </div>
              )
            })()}

            {/* Multi-Equipment Summary */}
            {equipmentBlocks.length > 0 && equipmentBlocks.some(b => b.costs || b.isCustom) && (
              <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">Equipment Summary</h4>
                <div className="space-y-2">
                  {equipmentBlocks.map((block, idx) => {
                    const blockTotal = calculateEquipmentBlockTotal(block)
                    return (
                      <div key={block.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {block.make && block.model ? `${block.make} ${block.model}` : `Equipment ${idx + 1}`}
                          {block.quantity > 1 && <span className="text-gray-500"> ×{block.quantity}</span>}
                        </span>
                        <span className="font-medium">${blockTotal.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )
                  })}
                  <div className="border-t border-green-300 pt-2 mt-2 flex justify-between font-semibold text-green-800">
                    <span>Total (before margin)</span>
                    <span>${calculateAllEquipmentBlocksTotal().subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Inland Transportation Toggle for Multi-Equipment */}
                <div className="mt-4 pt-4 border-t border-green-300">
                  <button
                    type="button"
                    onClick={() => setShowInlandSection(!showInlandSection)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors ${
                      showInlandSection
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'bg-white border-green-200 text-green-600 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                      <div className="text-left">
                        <span className="font-semibold">Inland Transportation</span>
                        <span className="text-sm ml-2 opacity-75">(Click to {showInlandSection ? 'hide' : 'add'})</span>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 transition-transform ${showInlandSection ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showInlandSection && (
                    <div className="mt-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                      Inland transportation options are shown below the quote form.
                    </div>
                  )}
                </div>

                {/* Action Buttons for Multi-Equipment */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handlePreviewQuote}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                  <button
                    onClick={handleDownloadQuote}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Single Equipment Mode */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {isCustomQuote ? (
            <>
              {/* Custom Make Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                <input
                  type="text"
                  value={customMake}
                  onChange={(e) => setCustomMake(e.target.value)}
                  placeholder="Enter make..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Custom Model Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Enter model..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Loading Location for Custom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loading Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value as Location)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select loading location...</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Make Selection */}
              <div>
                <SearchableSelect
                  options={makes}
                  value={selectedMake}
                  onChange={setSelectedMake}
                  placeholder="Select make..."
                  label="Make"
                />
              </div>

              {/* Model Selection */}
              <div>
                <SearchableSelect
                  options={models}
                  value={selectedModel}
                  onChange={setSelectedModel}
                  placeholder="Select model..."
                  label="Model"
                  disabled={!selectedMake}
                />
              </div>

              {/* Loading Location Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loading Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => handleLocationChange(e.target.value as Location)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedRate}
                >
                  <option value="">Select loading location...</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          </div>
        )}

        {/* Customer Info */}
        <div className="space-y-4 mb-6">
          {/* Customer/Contact Selection - Company First */}
          <div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
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
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
                            setCustomerCompany(company.name)
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
                                setSelectedCustomerId(customer.id)
                                setCustomerName(customer.name || '')
                                setCustomerCompany(customer.company || '')
                                setCustomerEmail(customer.email || '')
                                setCustomerPhone(customer.phone || '')
                                setCustomerAddress(customer.address || '')
                                setCustomerSearchTerm(customer.company || customer.name || '')
                                setShowCustomerDropdown(false)
                                // Clear new system selections
                                setSelectedCompanyId('')
                                setSelectedContactId('')
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
                title="Add new customer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Customer
              </button>
              <button
                type="button"
                onClick={() => setShowSignatureParser(true)}
                className="px-3 py-1.5 text-sm bg-purple-50 text-purple-600 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors flex items-center gap-1"
                title="Parse email signature"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Paste Signature
              </button>
              {(selectedContactId || selectedCompanyId) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContactId('')
                    setSelectedCompanyId('')
                    setSelectedCustomerId('')
                    setCustomerSearchTerm('')
                    setCustomerName('')
                    setCustomerEmail('')
                    setCustomerCompany('')
                    setCustomerPhone('')
                    setCustomerAddress('')
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}
            </div>

            {(selectedContactId || selectedCustomerId) && (
              <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Customer selected - fields populated below
              </div>
            )}
          </div>

          {/* Customer Name & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  if (selectedCustomerId) setSelectedCustomerId('')
                }}
                placeholder="Enter customer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                placeholder="Enter company name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter customer email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Office Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office Address</label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Client's office address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
              <span className="text-gray-400 font-normal ml-1">(not shown on quote)</span>
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add internal notes about this quote..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

      </div>

      {/* Quote Preview */}
      {((selectedRate && selectedLocation) || (isCustomQuote && customMake && customModel && selectedLocation) || (multiEquipmentMode && equipmentBlocks.some(b => (b.costs || b.isCustom) && b.location))) && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {multiEquipmentMode ? 'Additional Options' : 'Quote Preview'}
            {isCustomQuote && <span className="ml-2 text-sm font-normal text-purple-600">(Custom)</span>}
            {multiEquipmentMode && <span className="ml-2 text-sm font-normal text-green-600">(Multi-Equipment)</span>}
          </h3>

          <div className="space-y-3">
            {!multiEquipmentMode && (
              <>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Equipment</span>
                  <span className="font-medium">
                    {isCustomQuote ? `${customMake} ${customModel}` : `${selectedRate?.make} ${selectedRate?.model}`}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Loading Location</span>
                  <span className="font-medium">{selectedLocation}</span>
                </div>
              </>
            )}

            {/* Equipment Specifications Section - Hide for multi-equipment mode */}
            {!multiEquipmentMode && (
            <div className="py-4 border-b">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Equipment Specifications</h4>
                {isCustomQuote ? (
                  <span className="text-xs text-purple-600">Edit below</span>
                ) : !editingDimensions ? (
                  <button
                    type="button"
                    onClick={() => setEditingDimensions(true)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {equipmentDimensions ? 'Edit' : 'Add Dimensions'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDimensions(false)
                        if (equipmentDimensions) {
                          setDimensionEdits({
                            operating_weight: equipmentDimensions.operating_weight,
                            transport_length: equipmentDimensions.transport_length,
                            transport_width: equipmentDimensions.transport_width,
                            transport_height: equipmentDimensions.transport_height
                          })
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveDimensionEdits}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {/* Image Previews - Only for database-linked quotes */}
              {!isCustomQuote && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Front Image */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Front View</div>
                  {equipmentDimensions?.front_image_base64 ? (
                    <div className="relative group">
                      <img
                        src={equipmentDimensions.front_image_base64}
                        alt="Front view"
                        className="w-full h-24 object-contain bg-gray-100 rounded-lg border"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <label className="px-2 py-1 bg-blue-600 text-white text-xs rounded cursor-pointer hover:bg-blue-700 transition-colors">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload('front', e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('front')}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-gray-500 mt-1">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload('front', e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Side Image */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Side View</div>
                  {equipmentDimensions?.side_image_base64 ? (
                    <div className="relative group">
                      <img
                        src={equipmentDimensions.side_image_base64}
                        alt="Side view"
                        className="w-full h-24 object-contain bg-gray-100 rounded-lg border"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <label className="px-2 py-1 bg-blue-600 text-white text-xs rounded cursor-pointer hover:bg-blue-700 transition-colors">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload('side', e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('side')}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-gray-500 mt-1">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload('side', e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              )}

              {/* Image Previews - For custom quotes */}
              {isCustomQuote && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Front Image */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Front View</div>
                  {customImages.frontImageBase64 ? (
                    <div className="relative group">
                      <img
                        src={customImages.frontImageBase64}
                        alt="Front view"
                        className="w-full h-24 object-contain bg-purple-50 rounded-lg border border-purple-200"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <label className="px-2 py-1 bg-purple-600 text-white text-xs rounded cursor-pointer hover:bg-purple-700 transition-colors">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload('front', e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('front')}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-purple-500 mt-1">Upload Front</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload('front', e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Side Image */}
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Side View</div>
                  {customImages.sideImageBase64 ? (
                    <div className="relative group">
                      <img
                        src={customImages.sideImageBase64}
                        alt="Side view"
                        className="w-full h-24 object-contain bg-purple-50 rounded-lg border border-purple-200"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <label className="px-2 py-1 bg-purple-600 text-white text-xs rounded cursor-pointer hover:bg-purple-700 transition-colors">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload('side', e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('side')}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-purple-500 mt-1">Upload Side</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload('side', e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              )}

              {/* Dimension Fields with Smart Conversion */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Weight (lbs)</label>
                  {(editingDimensions || isCustomQuote) ? (
                    <input
                      type="number"
                      value={isCustomQuote ? (customDimensions.operatingWeight ?? '') : (dimensionEdits.operating_weight ?? '')}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value)
                        if (isCustomQuote) {
                          setCustomDimensions(prev => ({ ...prev, operatingWeight: val }))
                        } else {
                          setDimensionEdits(prev => ({ ...prev, operating_weight: val }))
                        }
                      }}
                      placeholder="0"
                      className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 ${isCustomQuote ? 'border-purple-300 focus:ring-purple-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">
                      {equipmentDimensions?.operating_weight?.toLocaleString() || '-'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Length <span className="text-gray-400">(ft.in or inches)</span>
                  </label>
                  {(editingDimensions || isCustomQuote) ? (
                    <div>
                      <input
                        type="text"
                        placeholder="e.g., 10.5 or 300"
                        className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 ${isCustomQuote ? 'border-purple-300 focus:ring-purple-500' : 'border-gray-300 focus:ring-blue-500'}`}
                        onBlur={(e) => {
                          const rawValue = e.target.value.trim()
                          if (rawValue === '') {
                            if (isCustomQuote) {
                              setCustomDimensions(prev => ({ ...prev, transportLength: null }))
                            } else {
                              setDimensionEdits(prev => ({ ...prev, transport_length: null }))
                            }
                            return
                          }
                          const convertedVal = parseSmartDimension(rawValue, 'length')
                          if (isCustomQuote) {
                            setCustomDimensions(prev => ({ ...prev, transportLength: convertedVal }))
                          } else {
                            setDimensionEdits(prev => ({ ...prev, transport_length: convertedVal }))
                          }
                          if (convertedVal !== null) {
                            e.target.value = inchesToFtInString(convertedVal)
                          }
                        }}
                      />
                      {(isCustomQuote ? customDimensions.transportLength : dimensionEdits.transport_length) && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          ({(isCustomQuote ? customDimensions.transportLength : dimensionEdits.transport_length)} inches total)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-gray-900">
                      {equipmentDimensions?.transport_length ? inchesToFtInString(equipmentDimensions.transport_length) : '-'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Width <span className="text-gray-400">(ft.in or inches)</span>
                  </label>
                  {(editingDimensions || isCustomQuote) ? (
                    <div>
                      <input
                        type="text"
                        placeholder="e.g., 8.6 or 96"
                        className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 ${isCustomQuote ? 'border-purple-300 focus:ring-purple-500' : 'border-gray-300 focus:ring-blue-500'}`}
                        onBlur={(e) => {
                          const rawValue = e.target.value.trim()
                          if (rawValue === '') {
                            if (isCustomQuote) {
                              setCustomDimensions(prev => ({ ...prev, transportWidth: null }))
                            } else {
                              setDimensionEdits(prev => ({ ...prev, transport_width: null }))
                            }
                            return
                          }
                          const convertedVal = parseSmartDimension(rawValue, 'width')
                          if (isCustomQuote) {
                            setCustomDimensions(prev => ({ ...prev, transportWidth: convertedVal }))
                          } else {
                            setDimensionEdits(prev => ({ ...prev, transport_width: convertedVal }))
                          }
                          if (convertedVal !== null) {
                            e.target.value = inchesToFtInString(convertedVal)
                          }
                        }}
                      />
                      {(isCustomQuote ? customDimensions.transportWidth : dimensionEdits.transport_width) && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          ({(isCustomQuote ? customDimensions.transportWidth : dimensionEdits.transport_width)} inches total)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-gray-900">
                      {equipmentDimensions?.transport_width ? inchesToFtInString(equipmentDimensions.transport_width) : '-'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Height <span className="text-gray-400">(ft.in or inches)</span>
                  </label>
                  {(editingDimensions || isCustomQuote) ? (
                    <div>
                      <input
                        type="text"
                        placeholder="e.g., 11.2 or 144"
                        className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 ${isCustomQuote ? 'border-purple-300 focus:ring-purple-500' : 'border-gray-300 focus:ring-blue-500'}`}
                        onBlur={(e) => {
                          const rawValue = e.target.value.trim()
                          if (rawValue === '') {
                            if (isCustomQuote) {
                              setCustomDimensions(prev => ({ ...prev, transportHeight: null }))
                            } else {
                              setDimensionEdits(prev => ({ ...prev, transport_height: null }))
                            }
                            return
                          }
                          const convertedVal = parseSmartDimension(rawValue, 'height')
                          if (isCustomQuote) {
                            setCustomDimensions(prev => ({ ...prev, transportHeight: convertedVal }))
                          } else {
                            setDimensionEdits(prev => ({ ...prev, transport_height: convertedVal }))
                          }
                          if (convertedVal !== null) {
                            e.target.value = inchesToFtInString(convertedVal)
                          }
                        }}
                      />
                      {(isCustomQuote ? customDimensions.transportHeight : dimensionEdits.transport_height) && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          ({(isCustomQuote ? customDimensions.transportHeight : dimensionEdits.transport_height)} inches total)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-gray-900">
                      {equipmentDimensions?.transport_height ? inchesToFtInString(equipmentDimensions.transport_height) : '-'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Location Costs with Toggle, Editable Value, and Description Inputs */}
            {/* Always show all cost fields so user can fill them in */}
            {!multiEquipmentMode && COST_FIELDS.map(field => {
              const originalValue = locationCosts ? (locationCosts[field.key as keyof LocationCost] as number | null) : null
              const isEnabled = enabledCosts[field.key]
              const effectiveValue = getEffectiveCost(field.key)
              const isOverridden = costOverrides[field.key] !== undefined
              const hasOriginalValue = originalValue !== null
              return (
                <div key={field.key} className={`py-2 border-b ${!isEnabled ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={() => setEnabledCosts(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                          isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        role="switch"
                        aria-checked={isEnabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className={`${isEnabled ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
                        {field.label}
                        {!hasOriginalValue && <span className="text-xs text-gray-400 ml-1">(no default)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEnabled ? (
                        <>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={effectiveValue ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                setCostOverrides(prev => ({ ...prev, [field.key]: val }))
                              }}
                              placeholder="0.00"
                              className={`w-28 pl-6 pr-2 py-1 text-sm text-right border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isOverridden ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                              }`}
                            />
                          </div>
                          {isOverridden && hasOriginalValue && (
                            <button
                              type="button"
                              onClick={() => setCostOverrides(prev => {
                                const updated = { ...prev }
                                delete updated[field.key]
                                return updated
                              })}
                              className="text-xs text-amber-600 hover:text-amber-800"
                              title="Reset to original value"
                            >
                              Reset
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 line-through">{formatCurrency(effectiveValue)}</span>
                      )}
                    </div>
                  </div>
                  {isEnabled && (
                    <input
                      type="text"
                      placeholder={`Description for ${field.label} (optional)`}
                      value={costDescriptions[field.key] || ''}
                      onChange={(e) => setCostDescriptions(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </div>
              )
            })}


            {/* Miscellaneous Fees Section - Hide for multi-equipment mode */}
            {!multiEquipmentMode && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Miscellaneous Fees</h4>
                <button
                  type="button"
                  onClick={addMiscellaneousFee}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Fee
                </button>
              </div>

              {miscellaneousFees.length === 0 && (
                <p className="text-sm text-gray-500 italic py-2">No miscellaneous fees added. Click "Add Fee" to add one.</p>
              )}

              {miscellaneousFees.map((fee, index) => (
                <div key={fee.id} className="py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Fee title (e.g., Special Handling)"
                          value={fee.title}
                          onChange={(e) => updateMiscellaneousFee(fee.id, 'title', e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={fee.cost || ''}
                            onChange={(e) => updateMiscellaneousFee(fee.id, 'cost', parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-2 text-sm text-right border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={fee.description}
                        onChange={(e) => updateMiscellaneousFee(fee.id, 'description', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMiscellaneousFee(fee.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove fee"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {miscFeesTotal > 0 && (
                <div className="flex justify-between py-2 mt-2 text-sm text-gray-600 bg-gray-50 px-2 rounded">
                  <span>Miscellaneous Total</span>
                  <span className="font-medium">{formatCurrency(miscFeesTotal)}</span>
                </div>
              )}
            </div>
            )}

            {/* Inland Transportation Section Toggle */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowInlandSection(!showInlandSection)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors ${
                  showInlandSection
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  <div className="text-left">
                    <span className="font-semibold">Inland Transportation</span>
                    <span className="text-sm ml-2 opacity-75">(Click to {showInlandSection ? 'hide' : 'add'})</span>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 transition-transform ${showInlandSection ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Inland Transportation Content */}
              {showInlandSection && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                  {/* Destination Tabs Header */}
                  <div className="bg-green-600 px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">Destinations</h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={addInlandDestinationBlock}
                          className="px-3 py-1.5 text-sm font-medium text-green-600 bg-white hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Destination
                        </button>
                        {activeInlandDestination && inlandDestinationBlocks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => duplicateInlandDestinationBlock(activeInlandDestination.id)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-green-500 hover:bg-green-400 rounded-lg transition-colors flex items-center gap-1"
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
                      {inlandDestinationBlocks.map((dest) => (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => setActiveInlandDestinationId(dest.id)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                            activeInlandDestination?.id === dest.id
                              ? 'bg-white text-green-700 shadow-md'
                              : 'bg-green-500/50 text-white hover:bg-green-500'
                          }`}
                        >
                          <span>{dest.name}</span>
                          {dest.pickup && dest.dropoff && (
                            <span className="text-xs opacity-75">
                              ({dest.pickup.city || dest.pickup.state} → {dest.dropoff.city || dest.dropoff.state})
                            </span>
                          )}
                          {inlandDestinationBlocks.length > 1 && (
                            <span
                              onClick={(e) => { e.stopPropagation(); removeInlandDestinationBlock(dest.id) }}
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
                  {activeInlandDestination && (
                    <div className="p-4 space-y-4">
                      {/* Route Information */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-green-800">Route Information</h4>
                          <input
                            type="text"
                            value={activeInlandDestination.name}
                            onChange={(e) => updateInlandDestinationBlock(activeInlandDestination.id, { name: e.target.value })}
                            className="text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1 w-40"
                            placeholder="Destination name"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <GooglePlacesAutocomplete
                            label="Pickup Location"
                            value={activeInlandDestination.pickup}
                            onChange={(address) => updateInlandDestinationBlock(activeInlandDestination.id, { pickup: address, route: null })}
                            placeholder="Enter pickup address"
                          />
                          <GooglePlacesAutocomplete
                            label="Dropoff Location"
                            value={activeInlandDestination.dropoff}
                            onChange={(address) => updateInlandDestinationBlock(activeInlandDestination.id, { dropoff: address, route: null })}
                            placeholder="Enter dropoff address"
                          />
                        </div>

                        {/* Route Calculation Status */}
                        {isCalculatingInlandRoute && (
                          <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Calculating route...
                          </div>
                        )}

                        {/* Route Display */}
                        {activeInlandDestination.route && !isCalculatingInlandRoute && (
                          <div className="bg-white border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xl font-bold text-green-700">
                                  {activeInlandDestination.route.distance_miles.toFixed(1)} miles
                                </span>
                                <span className="text-gray-500 ml-2 text-sm">
                                  ({activeInlandDestination.route.duration_text})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => calculateRouteForInlandDestination(activeInlandDestination.id)}
                                className="text-sm text-green-600 hover:text-green-700"
                              >
                                Recalculate
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Route Map */}
                        <div ref={inlandMapContainerRef}>
                          <RouteMap
                            pickup={activeInlandDestination.pickup}
                            dropoff={activeInlandDestination.dropoff}
                            distanceMiles={activeInlandDestination.route?.distance_miles}
                            durationMinutes={activeInlandDestination.route?.duration_minutes}
                            className="h-48 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Load Blocks Section */}
                      <div className="space-y-3 pt-3 border-t border-green-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-green-800">Load Blocks</h4>
                          <button
                            type="button"
                            onClick={addInlandLoadBlock}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                          >
                            + Add Load Block
                          </button>
                        </div>

                        {activeInlandDestination.load_blocks.length === 0 ? (
                          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                            <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <p className="text-sm text-gray-500 mb-1">No load blocks yet</p>
                            <p className="text-xs text-gray-400">Click &quot;Add Load Block&quot; to create a truck+cargo+rates group</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {activeInlandDestination.load_blocks.map((block, blockIndex) => {
                              const blockTotals = calculateBlockTotal(block)
                              const truckType = inlandEquipmentTypes.find(t => t.id === block.truck_type_id)
                              return (
                                <div key={block.id} className="border-2 border-blue-200 rounded-lg overflow-hidden bg-white">
                                  {/* Block Header */}
                                  <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs">
                                        {blockIndex + 1}
                                      </span>
                                      <span className="font-semibold text-gray-900 text-sm">Load Block #{blockIndex + 1}</span>
                                      {truckType && <span className="text-xs text-blue-600">• {truckType.name}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-blue-600">{formatCurrency(blockTotals.total)}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeInlandLoadBlock(block.id)}
                                    className="p-1 text-red-500 hover:text-red-700"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              <div className="p-3 space-y-3">
                                {/* Equipment Type */}
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Equipment Type</label>
                                  {customInlandTruckInput[block.id] !== undefined ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={customInlandTruckInput[block.id] || ''}
                                        onChange={(e) => setCustomInlandTruckInput(prev => ({ ...prev, [block.id]: e.target.value }))}
                                        placeholder="Custom equipment type..."
                                        className="flex-1 px-2 py-1.5 text-sm border border-blue-300 rounded bg-blue-50"
                                        autoFocus
                                      />
                                      <button type="button" onClick={() => addCustomInlandTruckType(block.id, customInlandTruckInput[block.id])} className="px-2 py-1.5 bg-blue-600 text-white rounded text-xs">Add</button>
                                      <button type="button" onClick={() => setCustomInlandTruckInput(prev => { const u = { ...prev }; delete u[block.id]; return u })} className="p-1.5 text-gray-400 hover:text-gray-600">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <select
                                        value={block.truck_type_id}
                                        onChange={(e) => {
                                          if (e.target.value === '__custom__') {
                                            setCustomInlandTruckInput(prev => ({ ...prev, [block.id]: '' }))
                                          } else {
                                            handleInlandManualTruckSelect(block.id, e.target.value)
                                          }
                                        }}
                                        className={`w-full px-2 py-1.5 text-sm border rounded ${
                                          inlandTruckRecommendations[block.id]?.recommendedId && block.truck_type_id === inlandTruckRecommendations[block.id]?.recommendedId
                                            ? 'border-green-400 bg-green-50'
                                            : inlandTruckRecommendations[block.id]?.isManualOverride
                                            ? 'border-yellow-400 bg-yellow-50'
                                            : 'border-gray-300'
                                        }`}
                                      >
                                        <option value="">Select equipment type</option>
                                        {inlandEquipmentTypes.map(type => (
                                          <option key={type.id} value={type.id}>
                                            {type.name}
                                            {inlandTruckRecommendations[block.id]?.recommendedId === type.id ? ' ✓ Recommended' : ''}
                                          </option>
                                        ))}
                                        <option value="__custom__" className="text-blue-600">+ Custom equipment type...</option>
                                      </select>
                                      {/* Recommendation indicator */}
                                      {inlandTruckRecommendations[block.id]?.recommendedId && (
                                        <div className="space-y-1">
                                          {inlandTruckRecommendations[block.id]?.multiTruckSuggestion?.needsMultipleTrucks && (
                                            <div className="p-1.5 bg-blue-50 border border-blue-200 rounded">
                                              <div className="flex items-start gap-1.5 text-xs text-blue-800">
                                                <svg className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <span><strong>Multi-truck:</strong> {inlandTruckRecommendations[block.id]?.multiTruckSuggestion?.suggestion}</span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => splitInlandLoadIntoMultipleTrucks(block.id)}
                                                className="mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                                              >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                                Split into {inlandTruckRecommendations[block.id]?.multiTruckSuggestion?.trucksNeeded} Loads
                                              </button>
                                            </div>
                                          )}
                                          <div className={`text-xs flex items-center gap-1 ${
                                            block.truck_type_id === inlandTruckRecommendations[block.id]?.recommendedId ? 'text-green-600' : 'text-yellow-600'
                                          }`}>
                                            {block.truck_type_id === inlandTruckRecommendations[block.id]?.recommendedId ? (
                                              <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg><span>Auto-selected</span></>
                                            ) : (
                                              <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg><span>Rec: {inlandTruckRecommendations[block.id]?.reason}</span></>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Cargo Items */}
                                <div className="bg-gray-50 rounded p-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-700">Cargo Items</span>
                                    <button type="button" onClick={() => addCargoToBlock(block.id)} className="text-xs text-blue-600 hover:text-blue-700">+ Add</button>
                                  </div>
                                  {block.cargo_items.length === 0 ? (
                                    <p className="text-xs text-gray-400">No cargo items</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {block.cargo_items.map((cargo, cargoIdx) => (
                                        <div key={cargo.id} className={`bg-white p-2 rounded border ${cargo.is_equipment ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200'}`}>
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-gray-500">Item {cargoIdx + 1}</span>
                                              {/* Equipment Toggle */}
                                              <label className="flex items-center gap-1 cursor-pointer">
                                                <span className="text-xs text-gray-500">Equipment</span>
                                                <div className="relative">
                                                  <input type="checkbox" checked={cargo.is_equipment || false} onChange={(e) => toggleInlandCargoEquipmentMode(block.id, cargo.id, e.target.checked)} className="sr-only" />
                                                  <div className={`w-7 h-4 rounded-full transition-colors ${cargo.is_equipment ? 'bg-purple-500' : 'bg-gray-300'}`}>
                                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${cargo.is_equipment ? 'translate-x-3' : ''}`} />
                                                  </div>
                                                </div>
                                              </label>
                                            </div>
                                            <button type="button" onClick={() => removeCargoFromBlock(block.id, cargo.id)} className="text-red-400 hover:text-red-600">
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                          </div>

                                          {/* Equipment Mode: Make/Model Selection */}
                                          {cargo.is_equipment && (
                                            <div className="mb-2 p-1.5 bg-purple-100/50 rounded border border-purple-200">
                                              <div className="grid grid-cols-2 gap-1 mb-1">
                                                <select value={cargo.equipment_make || ''} onChange={(e) => { updateCargoInBlock(block.id, cargo.id, 'equipment_make', e.target.value); updateCargoInBlock(block.id, cargo.id, 'equipment_model', null); updateCargoInBlock(block.id, cargo.id, 'equipment_model_id', null) }} className="px-1.5 py-1 text-xs border border-purple-300 rounded bg-white">
                                                  <option value="">Select Make</option>
                                                  {inlandEquipmentMakes.map(make => <option key={make} value={make}>{make}</option>)}
                                                </select>
                                                <select value={cargo.equipment_model || ''} onChange={(e) => { const modelInfo = inlandEquipmentModelsMap[cargo.equipment_make || '']?.find(m => m.model === e.target.value); if (modelInfo) handleInlandEquipmentSelect(block.id, cargo.id, cargo.equipment_make || '', modelInfo.model, modelInfo.modelId) }} className="px-1.5 py-1 text-xs border border-purple-300 rounded bg-white" disabled={!cargo.equipment_make}>
                                                  <option value="">Select Model</option>
                                                  {(inlandEquipmentModelsMap[cargo.equipment_make || ''] || []).map(m => <option key={m.modelId} value={m.model}>{m.model}</option>)}
                                                </select>
                                              </div>
                                              <label className="flex items-center gap-1 text-xs text-purple-700 cursor-pointer">
                                                <input type="checkbox" checked={cargo.is_custom_equipment || false} onChange={(e) => updateCargoInBlock(block.id, cargo.id, 'is_custom_equipment', e.target.checked)} className="w-3 h-3 rounded text-purple-600" />
                                                Custom equipment (enter manually)
                                              </label>
                                            </div>
                                          )}

                                          <div className="space-y-1 mb-1">
                                            <input type="text" value={cargo.description} onChange={(e) => updateCargoInBlock(block.id, cargo.id, 'description', e.target.value)} placeholder="Description" className={`w-full px-1.5 py-1 text-xs border rounded ${cargo.is_equipment ? 'border-purple-300 bg-purple-50' : 'border-gray-300'}`} readOnly={cargo.is_equipment && !cargo.is_custom_equipment && !!cargo.equipment_model_id} />
                                            <div className="grid grid-cols-2 gap-1">
                                              {customInlandCargoTypeInput[cargo.id] !== undefined ? (
                                                <div className="flex items-center gap-0.5">
                                                  <input type="text" value={customInlandCargoTypeInput[cargo.id] || ''} onChange={(e) => setCustomInlandCargoTypeInput(prev => ({ ...prev, [cargo.id]: e.target.value }))} placeholder="Custom..." className="flex-1 px-1.5 py-1 text-xs border border-blue-300 rounded bg-blue-50" autoFocus />
                                                  <button type="button" onClick={() => addCustomInlandLoadType(block.id, cargo.id, customInlandCargoTypeInput[cargo.id])} className="px-1 py-1 bg-blue-600 text-white rounded text-xs">+</button>
                                                  <button type="button" onClick={() => setCustomInlandCargoTypeInput(prev => { const u = { ...prev }; delete u[cargo.id]; return u })} className="p-0.5 text-gray-400">
                                                    <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                  </button>
                                                </div>
                                              ) : (
                                                <div>
                                                  <label className="block text-xs text-gray-400 mb-0.5">Type</label>
                                                  <select value={cargo.cargo_type} onChange={(e) => { if (e.target.value === '__custom__') { setCustomInlandCargoTypeInput(prev => ({ ...prev, [cargo.id]: '' })) } else { updateCargoInBlock(block.id, cargo.id, 'cargo_type', e.target.value) }}} className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded">
                                                    {getInlandCargoTypes().map(type => <option key={type} value={type}>{type}</option>)}
                                                    <option value="__custom__" className="text-blue-600">+ Custom...</option>
                                                  </select>
                                                </div>
                                              )}
                                              <div>
                                                <label className="block text-xs text-gray-400 mb-0.5">Weight</label>
                                                <div className="flex">
                                                  <input type="number" min="0" defaultValue={cargo.weight_lbs || ''} key={`wt-${cargo.id}-${cargo.weight_lbs}`} onBlur={(e) => { const val = parseFloat(e.target.value); if (isNaN(val)) { updateCargoInBlock(block.id, cargo.id, 'weight_lbs', null) } else { const unit = (e.target.nextElementSibling as HTMLSelectElement)?.value || 'lbs'; const lbs = convertToLbs(val, unit); updateCargoInBlock(block.id, cargo.id, 'weight_lbs', lbs); e.target.value = lbs.toString() }}} placeholder="0" className="flex-1 min-w-0 px-1.5 py-1 text-xs border border-gray-300 rounded-l" />
                                                  <select defaultValue="lbs" className="w-12 px-1 py-1 text-xs border border-l-0 border-gray-300 rounded-r bg-gray-50">{WEIGHT_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-3 gap-1">
                                            <div className="flex">
                                              <input type="text" defaultValue={cargo.length_inches ? inchesToShortFtIn(cargo.length_inches) : ''} key={`l-${cargo.id}-${cargo.length_inches}`} onBlur={(e) => { const val = e.target.value.trim(); if (!val) { updateCargoInBlock(block.id, cargo.id, 'length_inches', null); return } const unit = (e.target.nextElementSibling as HTMLSelectElement)?.value || 'ft.in'; let inches: number | null = null; if (unit === 'ft.in') { inches = parseFtInString(val); if (inches === null) { const converted = parseSmartDimension(val, 'length'); if (converted !== null) inches = Math.round(converted) }} else { const num = parseFloat(val); if (!isNaN(num)) inches = convertToInches(num, unit) } updateCargoInBlock(block.id, cargo.id, 'length_inches', inches); if (inches !== null) e.target.value = inchesToShortFtIn(inches) }} placeholder="L" className="flex-1 min-w-0 px-1 py-1 text-xs border border-gray-300 rounded-l" />
                                              <select defaultValue="ft.in" className="px-0.5 py-1 text-xs border border-l-0 border-gray-300 rounded-r bg-gray-50">{DIMENSION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
                                            </div>
                                            <div className="flex">
                                              <input type="text" defaultValue={cargo.width_inches ? inchesToShortFtIn(cargo.width_inches) : ''} key={`w-${cargo.id}-${cargo.width_inches}`} onBlur={(e) => { const val = e.target.value.trim(); if (!val) { updateCargoInBlock(block.id, cargo.id, 'width_inches', null); return } const unit = (e.target.nextElementSibling as HTMLSelectElement)?.value || 'ft.in'; let inches: number | null = null; if (unit === 'ft.in') { inches = parseFtInString(val); if (inches === null) { const converted = parseSmartDimension(val, 'width'); if (converted !== null) inches = Math.round(converted) }} else { const num = parseFloat(val); if (!isNaN(num)) inches = convertToInches(num, unit) } updateCargoInBlock(block.id, cargo.id, 'width_inches', inches); if (inches !== null) e.target.value = inchesToShortFtIn(inches) }} placeholder="W" className="flex-1 min-w-0 px-1 py-1 text-xs border border-gray-300 rounded-l" />
                                              <select defaultValue="ft.in" className="px-0.5 py-1 text-xs border border-l-0 border-gray-300 rounded-r bg-gray-50">{DIMENSION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
                                            </div>
                                            <div className="flex">
                                              <input type="text" defaultValue={cargo.height_inches ? inchesToShortFtIn(cargo.height_inches) : ''} key={`h-${cargo.id}-${cargo.height_inches}`} onBlur={(e) => { const val = e.target.value.trim(); if (!val) { updateCargoInBlock(block.id, cargo.id, 'height_inches', null); return } const unit = (e.target.nextElementSibling as HTMLSelectElement)?.value || 'ft.in'; let inches: number | null = null; if (unit === 'ft.in') { inches = parseFtInString(val); if (inches === null) { const converted = parseSmartDimension(val, 'height'); if (converted !== null) inches = Math.round(converted) }} else { const num = parseFloat(val); if (!isNaN(num)) inches = convertToInches(num, unit) } updateCargoInBlock(block.id, cargo.id, 'height_inches', inches); if (inches !== null) e.target.value = inchesToShortFtIn(inches) }} placeholder="H" className="flex-1 min-w-0 px-1 py-1 text-xs border border-gray-300 rounded-l" />
                                              <select defaultValue="ft.in" className="px-0.5 py-1 text-xs border border-l-0 border-gray-300 rounded-r bg-gray-50">{DIMENSION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
                                            </div>
                                          </div>
                                          {/* Cargo Image */}
                                          <div className="mt-1">
                                            {cargo.image_base64 ? (
                                              <div className="relative inline-block">
                                                <img src={cargo.image_base64} alt="Cargo" className="h-12 rounded border" />
                                                <button type="button" onClick={() => updateCargoInBlock(block.id, cargo.id, 'image_base64', null)} className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full">
                                                  <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                              </div>
                                            ) : (
                                              <label className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                Image
                                                <input type="file" accept="image/*" onChange={(e) => handleCargoImageUpload(block.id, cargo.id, e)} className="hidden" />
                                              </label>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Service Items */}
                                <div className="bg-gray-50 rounded p-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-700">Service Items</span>
                                    <button
                                      type="button"
                                      onClick={() => addServiceToBlock(block.id)}
                                      className="text-xs text-green-600 hover:text-green-700"
                                    >
                                      + Add Service
                                    </button>
                                  </div>
                                  {block.service_items.length === 0 ? (
                                    <p className="text-xs text-gray-400">No service items</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {block.service_items.map(service => (
                                        <div key={service.id} className="flex items-center gap-1 bg-white p-1.5 rounded border border-gray-200">
                                          {/* Service type - dropdown for predefined or text input for custom */}
                                          {service.name === '__custom__' || (service.name && !inlandServiceTypes.find(s => s.name === service.name) && service.name !== '__custom__') ? (
                                            <div className="flex-1 flex items-center gap-1">
                                              <input
                                                type="text"
                                                value={service.name === '__custom__' ? '' : service.name}
                                                onChange={(e) => updateServiceInBlock(block.id, service.id, 'name', e.target.value)}
                                                placeholder="Custom service name..."
                                                className="flex-1 px-1.5 py-0.5 text-xs border border-blue-300 rounded bg-blue-50"
                                                autoFocus
                                              />
                                              <button
                                                type="button"
                                                onClick={() => updateServiceInBlock(block.id, service.id, 'name', '')}
                                                className="p-0.5 text-gray-400 hover:text-gray-600"
                                                title="Back to dropdown"
                                              >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                              </button>
                                            </div>
                                          ) : (
                                            <select
                                              value={service.name}
                                              onChange={(e) => {
                                                if (e.target.value === '__custom__') {
                                                  updateServiceInBlock(block.id, service.id, 'name', '__custom__')
                                                } else {
                                                  const selectedService = inlandServiceTypes.find(s => s.name === e.target.value)
                                                  updateServiceInBlock(block.id, service.id, 'name', e.target.value)
                                                  if (selectedService?.default_price && service.price === 0) {
                                                    updateServiceInBlock(block.id, service.id, 'price', selectedService.default_price)
                                                  }
                                                }
                                              }}
                                              className="flex-1 px-1.5 py-0.5 text-xs border border-gray-300 rounded"
                                            >
                                              <option value="">Select service...</option>
                                              {inlandServiceTypes.map(st => <option key={st.id} value={st.name}>{st.name}</option>)}
                                              <option value="__custom__" className="text-blue-600">+ Custom service...</option>
                                            </select>
                                          )}
                                          <input type="text" value={service.description || ''} onChange={(e) => updateServiceInBlock(block.id, service.id, 'description', e.target.value)} placeholder="Description" className="w-24 px-1.5 py-0.5 text-xs border border-gray-300 rounded" />
                                          <input type="number" min="1" value={service.quantity} onChange={(e) => updateServiceInBlock(block.id, service.id, 'quantity', parseInt(e.target.value) || 1)} className="w-10 px-1 py-0.5 text-xs border border-gray-300 rounded text-center" />
                                          <span className="text-xs text-gray-400">×</span>
                                          <div className="relative w-16">
                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                            <input type="number" step="0.01" value={service.price || ''} onFocus={(e) => { if (service.price === 0) e.target.value = '' }} onChange={(e) => updateServiceInBlock(block.id, service.id, 'price', parseFloat(e.target.value) || 0)} onBlur={(e) => { if (e.target.value === '') updateServiceInBlock(block.id, service.id, 'price', 0) }} placeholder="0" className="w-full pl-3 pr-1 py-0.5 text-xs border border-gray-300 rounded" />
                                          </div>
                                          <span className="text-xs font-medium text-gray-700 w-14 text-right">{formatCurrency(service.price * service.quantity)}</span>
                                          <button type="button" onClick={() => removeServiceFromBlock(block.id, service.id)} className="text-red-400 hover:text-red-600 p-0.5">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                          </button>
                                        </div>
                                      ))}
                                      <div className="text-right text-xs text-gray-600">Services: {formatCurrency(blockTotals.serviceTotal)}</div>
                                    </div>
                                  )}
                                </div>

                                {/* Accessorial Charges */}
                                <div className="bg-amber-50 rounded p-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-amber-800">Accessorials (Conditional)</span>
                                    <button type="button" onClick={() => { setActiveInlandLoadBlockId(block.id); setShowInlandAccessorialModal(true) }} className="text-xs text-amber-600 hover:text-amber-700">+ Add</button>
                                  </div>
                                  {block.accessorial_charges.length === 0 ? (
                                    <p className="text-xs text-gray-400">No accessorials</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {block.accessorial_charges.map(charge => {
                                        const chargeId = charge.id || charge.type_id
                                        const chargeTotal = charge.is_percentage ? blockTotals.serviceTotal * (charge.amount / 100) * (charge.quantity || 1) : charge.amount * (charge.quantity || 1)
                                        return (
                                          <div key={chargeId} className="bg-white p-2 rounded border border-gray-200">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs font-medium text-gray-700">{charge.type_name}</span>
                                              <div className="flex items-center gap-1">
                                                <span className="text-xs font-medium text-amber-600">{formatCurrency(chargeTotal)}</span>
                                                <button type="button" onClick={() => removeAccessorialFromBlock(block.id, chargeId)} className="text-red-400 hover:text-red-600 p-0.5">
                                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-wrap">
                                              <div className="flex items-center gap-0.5">
                                                {!charge.is_percentage && <span className="text-gray-400 text-xs">$</span>}
                                                <input type="number" step="0.01" value={charge.amount} onChange={(e) => updateAccessorialInBlock(block.id, chargeId, 'amount', parseFloat(e.target.value) || 0)} className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded" />
                                                {charge.is_percentage && <span className="text-gray-400 text-xs">%</span>}
                                              </div>
                                              <select value={charge.billing_unit || 'flat'} onChange={(e) => updateAccessorialInBlock(block.id, chargeId, 'billing_unit', e.target.value)} className="px-1 py-0.5 text-xs border border-gray-300 rounded">
                                                {BILLING_UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                              </select>
                                              {charge.billing_unit !== 'flat' && (
                                                <input type="number" min="1" value={charge.quantity || 1} onChange={(e) => updateAccessorialInBlock(block.id, chargeId, 'quantity', parseInt(e.target.value) || 1)} className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded text-center" placeholder="Qty" />
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                      <div className="text-right text-xs text-amber-700">Accessorials: {formatCurrency(blockTotals.accessorialTotal)}</div>
                                    </div>
                                  )}
                                </div>

                                {/* Load Image */}
                                <div>
                                  <span className="text-xs font-medium text-gray-700">Load Image</span>
                                  <div className="mt-1">
                                    {block.load_image_base64 ? (
                                      <div className="relative inline-block">
                                        <img src={block.load_image_base64} alt="Load" className="max-h-20 rounded border" />
                                        <button type="button" onClick={() => updateInlandLoadBlock(block.id, { load_image_base64: null })} className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full">
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                      </div>
                                    ) : (
                                      <label className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Upload
                                        <input type="file" accept="image/*" onChange={(e) => handleLoadBlockImageUpload(block.id, e)} className="hidden" />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {/* All Blocks Total */}
                        {activeInlandDestination.load_blocks.length > 0 && (
                          <div className="bg-blue-100 rounded-lg p-3 flex items-center justify-between">
                            <span className="font-semibold text-gray-900 text-sm">Destination Total</span>
                            <span className="text-lg font-bold text-blue-700">{formatCurrency(calculateDestinationBlocksTotal(activeInlandDestination.id))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-2 pt-3 border-t border-green-200">
                    <h4 className="text-sm font-semibold text-green-800">Notes</h4>
                    <textarea
                      value={inlandNotes}
                      onChange={(e) => setInlandNotes(e.target.value)}
                      rows={2}
                      placeholder="Special instructions or notes for transportation..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>

                  {/* Inland Summary */}
                  <div className="space-y-2 pt-3 border-t border-green-200">
                    <h4 className="text-sm font-semibold text-green-800">Transportation Summary</h4>
                    <div className="bg-white rounded-lg p-3 space-y-1.5 text-sm">
                      {inlandDestinationBlocks.map(dest => {
                        const destTotal = calculateDestinationBlocksTotal(dest.id)
                        const loadCount = dest.load_blocks.length
                        if (loadCount === 0) return null
                        return (
                          <div key={dest.id} className="flex justify-between text-gray-600">
                            <span>{dest.name} ({loadCount} load{loadCount !== 1 ? 's' : ''})</span>
                            <span className="font-medium">{formatCurrency(destTotal)}</span>
                          </div>
                        )
                      })}
                      <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold text-green-700">
                        <span>Transportation Total</span>
                        <span>{formatCurrency(calculateAllDestinationsBlocksTotal())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Subtotal - Hide for multi-equipment mode */}
            {!multiEquipmentMode && (
              <>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-700 font-medium">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>


                {/* Total */}
                <div className="flex justify-between py-3 bg-gray-50 px-3 rounded-lg">
                  <span className="text-lg font-bold text-gray-900">TOTAL</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(totalWithMargin)}</span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons - Hide for multi-equipment mode */}
          {!multiEquipmentMode && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handlePreviewQuote}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
              <button
                onClick={handleDownloadQuote}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {!selectedRate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-800">
            Select a make, model, and loading location above to generate a quote.
            <br />
            <span className="text-blue-600">Only equipment with cost entries will be shown.</span>
          </p>
        </div>
      )}
          </div>
        </div>

        {/* Right Side - Live PDF Preview */}
        {showLivePdfPreview && (
          <div className="xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)]">
            <PdfPreview
              pdfBlob={livePdfBlob}
              isGenerating={isGeneratingLivePdf}
              className="h-full min-h-[600px]"
            />
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quote Preview</h3>
                <p className="text-sm text-gray-500">
                  {previewQuoteData?.quoteNumber} - {previewQuoteData?.equipment.make} {previewQuoteData?.equipment.model}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 p-4 bg-gray-100 overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border border-gray-300 bg-white"
                style={{ minHeight: '500px' }}
                title="Quote PDF Preview"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closePreview}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Convert data URL to Blob URL for better browser compatibility
                    if (previewUrl && previewUrl.startsWith('data:')) {
                      try {
                        // Parse data URL
                        const parts = previewUrl.split(',')
                        const mimeMatch = parts[0].match(/:(.*?);/)
                        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf'
                        const bstr = atob(parts[1])
                        let n = bstr.length
                        const u8arr = new Uint8Array(n)
                        while (n--) {
                          u8arr[n] = bstr.charCodeAt(n)
                        }
                        const blob = new Blob([u8arr], { type: mime })
                        const blobUrl = URL.createObjectURL(blob)
                        window.open(blobUrl, '_blank')
                        // Clean up after a delay
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
                      } catch (e) {
                        console.error('Failed to open PDF in new tab:', e)
                        // Fallback to direct data URL
                        window.open(previewUrl, '_blank')
                      }
                    } else if (previewUrl) {
                      window.open(previewUrl, '_blank')
                    }
                  }}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </button>
                <button
                  onClick={downloadFromPreview}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add New Customer</h3>
              <button
                onClick={() => {
                  setShowAddCustomer(false)
                  setNewCustomer({})
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustomer.name || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Customer name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={newCustomer.company || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustomer.email || ''}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newCustomer.phone || ''}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newCustomer.address || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street, City, State, ZIP"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newCustomer.notes || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAddCustomer(false)
                  setNewCustomer({})
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={!newCustomer.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Add Customer
              </button>
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
                  <p className="text-sm text-gray-500">Paste a signature to auto-fill customer info</p>
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

      {/* Inland Accessorial Modal */}
      {showInlandAccessorialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add Accessorial Charge</h3>
                {activeInlandLoadBlockId && (
                  <p className="text-xs text-blue-600">Adding to Load Block</p>
                )}
              </div>
              <button
                onClick={() => { setShowInlandAccessorialModal(false); setActiveInlandLoadBlockId(null) }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {inlandAccessorialTypes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No accessorial types available.</p>
              ) : (
                <div className="space-y-2">
                  {inlandAccessorialTypes.map((type) => {
                    // Check if already added based on context (load block or flat array)
                    const alreadyAdded = activeInlandLoadBlockId
                      ? inlandLoadBlocks.find(b => b.id === activeInlandLoadBlockId)?.accessorial_charges.some(c => c.type_id === type.id) || false
                      : inlandAccessorialCharges.some(c => c.type_id === type.id)
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          if (!alreadyAdded) {
                            if (activeInlandLoadBlockId) {
                              addAccessorialToBlock(activeInlandLoadBlockId, type)
                            } else {
                              addInlandAccessorialCharge(type)
                            }
                          }
                        }}
                        disabled={alreadyAdded}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          alreadyAdded
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-medium">{type.name}</div>
                          {type.description && (
                            <div className="text-xs text-gray-500">{type.description}</div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {type.is_percentage ? `${type.default_amount}%` : `$${type.default_amount?.toFixed(2) || '0.00'}`}
                          {alreadyAdded && <span className="ml-2 text-green-600">(Added)</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Custom Accessorial Input */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Or add a custom accessorial:</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={customInlandAccessorialName}
                    onChange={(e) => setCustomInlandAccessorialName(e.target.value)}
                    placeholder="Accessorial name..."
                    className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={customInlandAccessorialAmount || ''}
                      onChange={(e) => setCustomInlandAccessorialAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 pl-5 pr-2 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <select
                    value={customInlandAccessorialBillingUnit}
                    onChange={(e) => setCustomInlandAccessorialBillingUnit(e.target.value as 'flat' | 'hour' | 'day' | 'way' | 'week' | 'month' | 'stop')}
                    className="px-2 py-2 border border-gray-300 rounded text-sm bg-white"
                  >
                    {BILLING_UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addCustomInlandAccessorialType}
                    disabled={!customInlandAccessorialName.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => { setShowInlandAccessorialModal(false); setActiveInlandLoadBlockId(null) }}
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
