// PDF Quote Generator Types

import type { CostField } from '@/types/equipment'
import type { MiscellaneousFee, EquipmentBlock } from '@/types/quotes'
import type { InlandDestinationBlock } from '@/types/inland'

// Cost category for visual badges
export type CostCategory = 'dismantling' | 'logistics' | 'transport' | 'compliance' | 'handling'

// Map cost fields to categories
export const COST_FIELD_CATEGORIES: Record<CostField, CostCategory> = {
  dismantling_loading_cost: 'dismantling',
  loading_cost: 'handling',
  blocking_bracing_cost: 'handling',
  rigging_cost: 'handling',
  storage_cost: 'logistics',
  transport_cost: 'transport',
  equipment_cost: 'handling',
  labor_cost: 'handling',
  permit_cost: 'compliance',
  escort_cost: 'transport',
  miscellaneous_cost: 'logistics',
}

// Category badge colors (Tailwind classes)
export const CATEGORY_STYLES: Record<CostCategory, { bg: string; text: string; label: string }> = {
  dismantling: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    label: 'Dismantling',
  },
  logistics: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    label: 'Logistics',
  },
  transport: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Transport',
  },
  compliance: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    label: 'Compliance',
  },
  handling: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Handling',
  },
}

// Cost field labels
export const COST_LABELS: Record<CostField, string> = {
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

// Company info for PDF header
export interface CompanyInfo {
  name: string
  address?: string
  phone?: string
  email?: string
  website?: string
  logoUrl?: string
  logoSizePercentage?: number
  primaryColor?: string
  secondaryColor?: string
}

// Customer info for PDF
export interface CustomerInfo {
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

// Equipment dimensions
export interface EquipmentDimensions {
  length_inches: number
  width_inches: number
  height_inches: number
  weight_lbs: number
}

// Equipment info for PDF
export interface EquipmentInfo {
  id: string
  makeName: string
  modelName: string
  location: string
  quantity: number
  dimensions: EquipmentDimensions
  frontImageUrl?: string
  sideImageUrl?: string
  costs: Record<CostField, number>
  enabledCosts: Record<CostField, boolean>
  costOverrides: Record<CostField, number | null>
  costDescriptions?: Record<CostField, string>
  miscFees: MiscellaneousFee[]
  subtotal: number
  miscFeesTotal?: number
  totalWithQuantity: number
}

// Address info
export interface AddressInfo {
  address: string
  city?: string
  state?: string
  zip?: string
}

// Service item for inland transport
export interface InlandServiceItem {
  id: string
  name: string
  rate: number // cents
  quantity: number
  total: number // cents
}

// Accessorial charge for inland transport
export interface InlandAccessorialCharge {
  id: string
  name: string
  billing_unit: string
  rate: number // cents
  quantity: number
  total: number // cents
}

// Cargo item for inland transport PDF
export interface InlandCargoItem {
  id: string
  description: string
  quantity: number
  length_inches: number
  width_inches: number
  height_inches: number
  weight_lbs: number
  is_oversize?: boolean
  is_overweight?: boolean
  // Equipment fields
  is_equipment?: boolean
  is_custom_equipment?: boolean // True when manually entering equipment not in database
  equipment_make_name?: string
  equipment_model_name?: string
  custom_make_name?: string
  custom_model_name?: string
  // Images
  image_url?: string // Generic cargo image (first)
  image_url_2?: string // Generic cargo image (second)
  front_image_url?: string // Equipment front view
  side_image_url?: string // Equipment side view
}

// Placement info for cargo items on trailer
export interface CargoPlacement {
  itemId: string
  x: number // feet from front
  z: number // feet from left edge
  rotated: boolean
}

// Truck specs for trailer diagram rendering
export interface TruckSpecs {
  deckLength: number // feet
  deckWidth: number // feet
  deckHeight: number // feet
  maxWeight: number // lbs
}

// Load block for inland transport
export interface InlandLoadBlock {
  id: string
  truck_type_id: string
  truck_type_name: string
  pickup?: AddressInfo
  dropoff?: AddressInfo
  use_custom_locations?: boolean
  cargo_items?: InlandCargoItem[] // Cargo items with dimensions
  service_items: InlandServiceItem[]
  accessorial_charges: InlandAccessorialCharge[]
  subtotal: number // cents - services only
  accessorials_total: number // cents - accessorials (if applicable)
  // Load plan diagram data
  placements?: CargoPlacement[] // Placement of items on trailer
  truck_specs?: TruckSpecs // Truck dimensions for diagram rendering
  // Load compliance info
  warnings?: string[] // Warnings about this load (oversize, bridge clearance, etc.)
  permits_required?: string[] // Permits needed for this load
  is_legal?: boolean // Whether this load is legal without permits
}

// Permit cost item for PDF display
export interface PermitCostItem {
  id: string
  stateCode: string
  stateName: string
  permitFee: number // in cents
  escortCost: number // in cents
  distanceMiles?: number
  notes?: string
}

// Permit costs summary for PDF
export interface PermitCostsSummary {
  items: PermitCostItem[]
  totalPermitFees: number // cents
  totalEscortCosts: number // cents
  grandTotal: number // cents
}

// Inland transport info for PDF
export interface InlandTransportInfo {
  enabled: boolean
  pickup: AddressInfo
  dropoff: AddressInfo
  destinationBlocks?: InlandDestinationBlock[]
  load_blocks?: InlandLoadBlock[] // Detailed load blocks with services and accessorials
  total: number
  accessorials_total?: number // Total accessorial fees (if applicable)
  permit_costs?: PermitCostsSummary // Permit and escort costs breakdown
  // Route info
  distance_miles?: number
  duration_minutes?: number
  static_map_url?: string
}

// Service line item for the table
export interface ServiceLineItem {
  id: string
  description: string
  subDescription?: string
  category: CostCategory
  quantity: number
  unitRate: number // cents
  lineTotal: number // cents
  equipmentId?: string // For multi-equipment reference
  equipmentLabel?: string // e.g., "CAT 320 #1"
}

// PDF section visibility toggles - controls what shows in preview and downloaded PDF
export interface PDFSectionVisibility {
  header: boolean
  clientInfo: boolean
  locations: boolean
  routeMap: boolean
  cargoDetails: boolean
  loadDiagrams: boolean
  loadCompliance: boolean
  services: boolean
  accessorials: boolean
  permitCosts: boolean
  pricingSummary: boolean
  termsAndNotes: boolean
}

// Default: all sections visible
export const DEFAULT_PDF_SECTION_VISIBILITY: PDFSectionVisibility = {
  header: true,
  clientInfo: true,
  locations: true,
  routeMap: true,
  cargoDetails: true,
  loadDiagrams: true,
  loadCompliance: true,
  services: true,
  accessorials: true,
  permitCosts: true,
  pricingSummary: true,
  termsAndNotes: true,
}

// Labels for PDF section toggles
export const PDF_SECTION_LABELS: Record<keyof PDFSectionVisibility, string> = {
  header: 'Company Header',
  clientInfo: 'Client Information',
  locations: 'Pickup / Dropoff Locations',
  routeMap: 'Route Map',
  cargoDetails: 'Cargo Details',
  loadDiagrams: 'Load Arrangement Diagrams',
  loadCompliance: 'Load Compliance (Warnings & Permits)',
  services: 'Services Table',
  accessorials: 'Accessorial Charges',
  permitCosts: 'Permit & Escort Costs',
  pricingSummary: 'Pricing Summary / Grand Total',
  termsAndNotes: 'Terms & Notes',
}

// Unified PDF data structure
export interface UnifiedPDFData {
  // Quote type
  quoteType: 'dismantle' | 'inland'

  // Quote metadata
  quoteNumber: string
  issueDate: string
  validUntil?: string
  version?: number

  // Company info (from settings)
  company: CompanyInfo

  // Customer info
  customer: CustomerInfo

  // Equipment (array for multi-equipment, single item for standard)
  equipment: EquipmentInfo[]

  // Is this a multi-equipment quote?
  isMultiEquipment: boolean

  // Location (for dismantle quotes - equipment yard location)
  location?: string

  // Inland transport (for quotes with inland component)
  inlandTransport?: InlandTransportInfo

  // Totals (all in cents)
  equipmentSubtotal: number
  miscFeesTotal: number
  inlandTotal: number
  grandTotal: number

  // Notes
  customerNotes?: string
  termsAndConditions?: string

  // Section visibility controls
  sectionVisibility?: PDFSectionVisibility
}

// Transform QuoteData to UnifiedPDFData
export function transformQuoteDataToPDF(
  quoteData: {
    quote_number: string
    customer_name: string
    customer_email?: string
    customer_phone?: string
    customer_company?: string
    billing_address?: string
    billing_city?: string
    billing_state?: string
    billing_zip?: string
    make_name: string
    model_name: string
    location: string
    length_inches?: number
    width_inches?: number
    height_inches?: number
    weight_lbs?: number
    front_image_url?: string
    side_image_url?: string
    costs: Record<CostField, number>
    enabled_costs: Record<CostField, boolean>
    cost_overrides: Record<CostField, number | null>
    cost_descriptions?: Record<CostField, string>
    miscellaneous_fees: MiscellaneousFee[]
    subtotal: number
    total: number
    quote_notes?: string
    is_multi_equipment: boolean
    equipment_blocks?: EquipmentBlock[]
    created_at: string
    expires_at?: string
  },
  companyInfo: CompanyInfo,
  termsAndConditions?: string
): UnifiedPDFData {
  const equipment: EquipmentInfo[] = []

  if (quoteData.is_multi_equipment && quoteData.equipment_blocks) {
    // Multi-equipment mode
    quoteData.equipment_blocks.forEach((block) => {
      equipment.push({
        id: block.id,
        makeName: block.make_name,
        modelName: block.model_name,
        location: block.location || '',
        quantity: block.quantity,
        dimensions: {
          length_inches: block.length_inches || 0,
          width_inches: block.width_inches || 0,
          height_inches: block.height_inches || 0,
          weight_lbs: block.weight_lbs || 0,
        },
        frontImageUrl: block.front_image_url,
        sideImageUrl: block.side_image_url,
        costs: block.costs,
        enabledCosts: block.enabled_costs,
        costOverrides: block.cost_overrides,
        miscFees: block.misc_fees || [],
        subtotal: block.subtotal,
        miscFeesTotal: block.misc_fees_total,
        totalWithQuantity: block.total_with_quantity,
      })
    })
  } else {
    // Single equipment mode
    equipment.push({
      id: 'main',
      makeName: quoteData.make_name,
      modelName: quoteData.model_name,
      location: quoteData.location,
      quantity: 1,
      dimensions: {
        length_inches: quoteData.length_inches || 0,
        width_inches: quoteData.width_inches || 0,
        height_inches: quoteData.height_inches || 0,
        weight_lbs: quoteData.weight_lbs || 0,
      },
      frontImageUrl: quoteData.front_image_url,
      sideImageUrl: quoteData.side_image_url,
      costs: quoteData.costs,
      enabledCosts: quoteData.enabled_costs,
      costOverrides: quoteData.cost_overrides,
      costDescriptions: quoteData.cost_descriptions,
      miscFees: quoteData.miscellaneous_fees,
      subtotal: quoteData.subtotal,
      totalWithQuantity: quoteData.subtotal,
    })
  }

  // Calculate misc fees total
  const miscFeesTotal = equipment.reduce((sum, eq) => sum + (eq.miscFeesTotal || 0), 0)

  return {
    quoteType: 'dismantle',
    quoteNumber: quoteData.quote_number,
    issueDate: new Date(quoteData.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    validUntil: quoteData.expires_at
      ? new Date(quoteData.expires_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : undefined,
    company: companyInfo,
    customer: {
      name: quoteData.customer_name,
      company: quoteData.customer_company,
      email: quoteData.customer_email,
      phone: quoteData.customer_phone,
      address: quoteData.billing_address,
      city: quoteData.billing_city,
      state: quoteData.billing_state,
      zip: quoteData.billing_zip,
    },
    equipment,
    isMultiEquipment: quoteData.is_multi_equipment,
    location: quoteData.location,
    equipmentSubtotal: quoteData.subtotal,
    miscFeesTotal,
    inlandTotal: 0,
    grandTotal: quoteData.total,
    customerNotes: quoteData.quote_notes,
    termsAndConditions,
  }
}

// Transform company settings to CompanyInfo
export function settingsToCompanyInfo(settings: {
  company_name: string
  company_logo_url?: string
  logo_size_percentage?: number
  company_address?: string
  company_city?: string
  company_state?: string
  company_zip?: string
  company_phone?: string
  company_email?: string
  company_website?: string
  primary_color?: string
  secondary_color?: string
}): CompanyInfo {
  // Build full address
  const addressParts = [
    settings.company_address,
    settings.company_city,
    settings.company_state,
    settings.company_zip,
  ].filter(Boolean)

  return {
    name: settings.company_name,
    address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
    phone: settings.company_phone,
    email: settings.company_email,
    website: settings.company_website,
    logoUrl: settings.company_logo_url,
    logoSizePercentage: settings.logo_size_percentage || 100,
    primaryColor: settings.primary_color || '#1e3a8a',
    secondaryColor: settings.secondary_color,
  }
}

// Build UnifiedPDFData from quote page state (for edit/new pages)
export function buildUnifiedPDFData(params: {
  quoteNumber: string
  quoteType: 'dismantle' | 'inland'
  // Customer
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerCompany?: string
  customerAddress?: { address?: string; city?: string; state?: string; zip?: string }
  // Equipment (single mode)
  makeName?: string
  modelName?: string
  location?: string
  dimensions?: EquipmentDimensions
  frontImageUrl?: string
  sideImageUrl?: string
  costs?: Record<CostField, number>
  enabledCosts?: Record<CostField, boolean>
  costOverrides?: Record<CostField, number | null>
  costDescriptions?: Record<CostField, string>
  miscFees?: MiscellaneousFee[]
  // Multi-equipment mode
  isMultiEquipment?: boolean
  equipmentBlocks?: EquipmentBlock[]
  // Inland transport
  inlandTransport?: {
    enabled: boolean
    pickup_address?: string
    pickup_city?: string
    pickup_state?: string
    pickup_zip?: string
    dropoff_address?: string
    dropoff_city?: string
    dropoff_state?: string
    dropoff_zip?: string
    transport_cost?: number
    accessorials_total?: number // Total accessorial fees (if applicable)
    load_blocks?: Array<{
      id: string
      truck_type_id: string
      truck_type_name: string
      pickup?: { address: string; city: string; state: string; zip: string }
      dropoff?: { address: string; city: string; state: string; zip: string }
      use_custom_locations?: boolean
      cargo_items?: Array<{
        id: string
        description: string
        quantity: number
        length_inches: number
        width_inches: number
        height_inches: number
        weight_lbs: number
        is_oversize?: boolean
        is_overweight?: boolean
        is_equipment?: boolean
        is_custom_equipment?: boolean
        equipment_make_name?: string
        equipment_model_name?: string
        custom_make_name?: string
        custom_model_name?: string
        image_url?: string
        image_url_2?: string
        front_image_url?: string
        side_image_url?: string
      }>
      service_items: Array<{
        id: string
        name: string
        rate: number
        quantity: number
        total: number
      }>
      accessorial_charges: Array<{
        id: string
        name: string
        billing_unit: string
        rate: number
        quantity: number
        total: number
      }>
      subtotal: number
      accessorials_total: number
    }>
    // Route info
    distance_miles?: number
    duration_minutes?: number
    static_map_url?: string
  }
  // Totals
  subtotal: number
  total: number
  inlandTransportCost?: number
  miscFeesTotal?: number
  // Notes
  notes?: string
  // Settings
  settings: {
    company_name: string
    company_logo_url?: string
    logo_size_percentage?: number
    company_address?: string
    company_city?: string
    company_state?: string
    company_zip?: string
    company_phone?: string
    company_email?: string
    company_website?: string
    primary_color?: string
    secondary_color?: string
    terms_dismantle?: string
    terms_inland?: string
    quote_validity_days?: number
  }
}): UnifiedPDFData {
  const company = settingsToCompanyInfo(params.settings)

  // Calculate expiration date
  const validityDays = params.settings.quote_validity_days || 30
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + validityDays)

  // Build equipment array
  const equipment: EquipmentInfo[] = []

  if (params.isMultiEquipment && params.equipmentBlocks) {
    params.equipmentBlocks.forEach((block) => {
      equipment.push({
        id: block.id,
        makeName: block.make_name,
        modelName: block.model_name,
        location: block.location || '',
        quantity: block.quantity,
        dimensions: {
          length_inches: block.length_inches || 0,
          width_inches: block.width_inches || 0,
          height_inches: block.height_inches || 0,
          weight_lbs: block.weight_lbs || 0,
        },
        frontImageUrl: block.front_image_url,
        sideImageUrl: block.side_image_url,
        costs: block.costs,
        enabledCosts: block.enabled_costs,
        costOverrides: block.cost_overrides,
        miscFees: block.misc_fees || [],
        subtotal: block.subtotal,
        miscFeesTotal: block.misc_fees_total,
        totalWithQuantity: block.total_with_quantity,
      })
    })
  } else {
    equipment.push({
      id: 'main',
      makeName: params.makeName || 'Custom',
      modelName: params.modelName || 'Equipment',
      location: params.location || '',
      quantity: 1,
      dimensions: params.dimensions || { length_inches: 0, width_inches: 0, height_inches: 0, weight_lbs: 0 },
      frontImageUrl: params.frontImageUrl,
      sideImageUrl: params.sideImageUrl,
      costs: params.costs || {} as Record<CostField, number>,
      enabledCosts: params.enabledCosts || {} as Record<CostField, boolean>,
      costOverrides: params.costOverrides || {} as Record<CostField, number | null>,
      costDescriptions: params.costDescriptions,
      miscFees: params.miscFees || [],
      subtotal: params.subtotal,
      totalWithQuantity: params.subtotal,
    })
  }

  // Terms based on quote type
  const termsAndConditions = params.quoteType === 'dismantle'
    ? params.settings.terms_dismantle
    : params.settings.terms_inland

  return {
    quoteType: params.quoteType,
    quoteNumber: params.quoteNumber,
    issueDate: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    validUntil: expirationDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    company,
    customer: {
      name: params.customerName || 'N/A',
      company: params.customerCompany,
      email: params.customerEmail,
      phone: params.customerPhone,
      address: params.customerAddress?.address,
      city: params.customerAddress?.city,
      state: params.customerAddress?.state,
      zip: params.customerAddress?.zip,
    },
    equipment,
    isMultiEquipment: params.isMultiEquipment || false,
    location: params.location,
    inlandTransport: params.inlandTransport?.enabled
      ? {
          enabled: true,
          pickup: {
            address: params.inlandTransport.pickup_address || '',
            city: params.inlandTransport.pickup_city,
            state: params.inlandTransport.pickup_state,
            zip: params.inlandTransport.pickup_zip,
          },
          dropoff: {
            address: params.inlandTransport.dropoff_address || '',
            city: params.inlandTransport.dropoff_city,
            state: params.inlandTransport.dropoff_state,
            zip: params.inlandTransport.dropoff_zip,
          },
          total: params.inlandTransport.transport_cost || 0,
          accessorials_total: params.inlandTransport.accessorials_total || 0,
          load_blocks: params.inlandTransport.load_blocks?.map((block) => ({
            id: block.id,
            truck_type_id: block.truck_type_id,
            truck_type_name: block.truck_type_name,
            pickup: block.pickup,
            dropoff: block.dropoff,
            use_custom_locations: block.use_custom_locations,
            cargo_items: block.cargo_items,
            service_items: block.service_items,
            accessorial_charges: block.accessorial_charges,
            subtotal: block.subtotal,
            accessorials_total: block.accessorials_total || 0,
          })),
          distance_miles: params.inlandTransport.distance_miles,
          duration_minutes: params.inlandTransport.duration_minutes,
          static_map_url: params.inlandTransport.static_map_url,
        }
      : undefined,
    equipmentSubtotal: params.subtotal - (params.inlandTransportCost || 0),
    miscFeesTotal: params.miscFeesTotal || 0,
    inlandTotal: params.inlandTransportCost || 0,
    grandTotal: params.total,
    customerNotes: params.notes,
    termsAndConditions,
  }
}

// Generate service line items from equipment data
export function generateServiceLineItems(
  equipment: EquipmentInfo[],
  isMultiEquipment: boolean
): ServiceLineItem[] {
  const items: ServiceLineItem[] = []

  equipment.forEach((eq, eqIndex) => {
    const equipmentLabel = isMultiEquipment
      ? `${eq.makeName} ${eq.modelName}${eq.quantity > 1 ? ` (×${eq.quantity})` : ''}`
      : undefined

    // Add enabled cost items
    Object.entries(eq.enabledCosts).forEach(([field, enabled]) => {
      if (!enabled) return

      const costField = field as CostField
      const cost = eq.costOverrides[costField] ?? eq.costs[costField]

      // Skip $0 costs
      if (cost <= 0) return

      const customDescription = eq.costDescriptions?.[costField]

      items.push({
        id: `${eq.id}-${costField}`,
        description: customDescription || COST_LABELS[costField],
        subDescription: isMultiEquipment ? equipmentLabel : undefined,
        category: COST_FIELD_CATEGORIES[costField],
        quantity: eq.quantity,
        unitRate: cost,
        lineTotal: cost * eq.quantity,
        equipmentId: eq.id,
        equipmentLabel,
      })
    })

    // Add misc fees
    eq.miscFees.forEach((fee) => {
      const feeAmount = fee.is_percentage
        ? Math.round(eq.subtotal * (fee.amount / 10000))
        : fee.amount

      // Skip $0 fees
      if (feeAmount <= 0) return

      items.push({
        id: `${eq.id}-misc-${fee.id}`,
        description: fee.title,
        subDescription: fee.description || (isMultiEquipment ? equipmentLabel : undefined),
        category: 'logistics',
        quantity: 1,
        unitRate: feeAmount,
        lineTotal: feeAmount,
        equipmentId: eq.id,
        equipmentLabel,
      })
    })
  })

  return items
}

// ============================================
// Converter: UnifiedPDFData -> MultiEquipmentPDFData
// ============================================

import type { MultiEquipmentPDFData, EquipmentBlockPDF } from './quote-generator'

// ============================================
// Pricing Mode Types (for flexible pricing options)
// ============================================

/**
 * Pricing mode determines how services are priced in the quote:
 * - 'global': All services priced together at destination level (default)
 * - 'per_truck': Each truck/load has its own pricing section
 * - 'grouped': Trucks grouped together, priced by group
 */
export type PricingMode = 'global' | 'per_truck' | 'grouped'

/**
 * A group of trucks that share pricing
 * Used when pricingMode is 'grouped'
 */
export interface TruckGroup {
  id: string
  name: string                           // User-defined group name (e.g., "Oversize Loads")
  truckIndices: number[]                 // Indices into plannedLoads array
  services: InlandServiceItem[]          // Services for this group
  accessorials: InlandAccessorialCharge[] // Accessorials for this group
  subtotal: number                       // Total for this group (cents)
}

export function unifiedPDFDataToMultiEquipmentPDF(data: UnifiedPDFData): MultiEquipmentPDFData {
  // Build customer address string
  const customerAddressParts = [
    data.customer.address,
    data.customer.city,
    data.customer.state,
    data.customer.zip,
  ].filter(Boolean)
  const customerAddress = customerAddressParts.length > 0 ? customerAddressParts.join(', ') : undefined

  // Convert equipment to EquipmentBlockPDF format
  const equipment: EquipmentBlockPDF[] = data.equipment.map((eq) => ({
    id: eq.id,
    makeName: eq.makeName,
    modelName: eq.modelName,
    location: eq.location,
    quantity: eq.quantity,
    dimensions: eq.dimensions,
    frontImageUrl: eq.frontImageUrl,
    sideImageUrl: eq.sideImageUrl,
    costs: eq.costs,
    enabledCosts: eq.enabledCosts,
    costOverrides: eq.costOverrides,
    miscFees: eq.miscFees,
    subtotal: eq.subtotal,
    miscFeesTotal: eq.miscFeesTotal,
    totalWithQuantity: eq.totalWithQuantity,
  }))

  // Build inland transport data if enabled
  const inlandTransport = data.inlandTransport?.enabled
    ? {
        enabled: true,
        pickup_address: data.inlandTransport.pickup.address,
        pickup_city: data.inlandTransport.pickup.city || '',
        pickup_state: data.inlandTransport.pickup.state || '',
        pickup_zip: data.inlandTransport.pickup.zip || '',
        dropoff_address: data.inlandTransport.dropoff.address,
        dropoff_city: data.inlandTransport.dropoff.city || '',
        dropoff_state: data.inlandTransport.dropoff.state || '',
        dropoff_zip: data.inlandTransport.dropoff.zip || '',
        transport_cost: data.inlandTransport.total,
        notes: '',
      }
    : undefined

  return {
    quoteNumber: data.quoteNumber,
    date: data.issueDate,
    expiresAt: data.validUntil,
    customerName: data.customer.name,
    customerEmail: data.customer.email,
    customerPhone: data.customer.phone,
    customerCompany: data.customer.company,
    customerAddress,
    equipment,
    inlandTransport,
    inlandTransportCost: data.inlandTotal,
    subtotal: data.equipmentSubtotal + data.miscFeesTotal,
    total: data.grandTotal,
    notes: data.customerNotes,
    termsAndConditions: data.termsAndConditions,
    companyName: data.company.name,
    companyAddress: data.company.address,
    companyPhone: data.company.phone,
    companyEmail: data.company.email,
    companyWebsite: data.company.website,
    primaryColor: data.company.primaryColor,
    secondaryColor: data.company.secondaryColor,
    companyLogoUrl: data.company.logoUrl,
    logoSizePercentage: data.company.logoSizePercentage,
  }
}
