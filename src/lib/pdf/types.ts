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

// Inland transport info for PDF
export interface InlandTransportInfo {
  enabled: boolean
  pickup: AddressInfo
  dropoff: AddressInfo
  destinationBlocks?: InlandDestinationBlock[]
  total: number
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
    quoteData.equipment_blocks.forEach((block, index) => {
      equipment.push({
        id: block.id,
        makeName: block.make_name,
        modelName: block.model_name,
        location: block.location,
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
