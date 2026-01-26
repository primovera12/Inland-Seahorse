/**
 * Type Definitions for Load History
 *
 * These types match the database schema in:
 * supabase/migrations/040_load_history.sql
 */

// =============================================================================
// STATUS TYPES
// =============================================================================

export type LoadHistoryStatus =
  | 'booked'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export const LOAD_STATUS_LABELS: Record<LoadHistoryStatus, string> = {
  booked: 'Booked',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const LOAD_STATUS_COLORS: Record<LoadHistoryStatus, string> = {
  booked: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  delivered: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

// =============================================================================
// EQUIPMENT TYPES
// =============================================================================

export type EquipmentType =
  | 'flatbed'
  | 'step_deck'
  | 'rgn'
  | 'lowboy'
  | 'double_drop'
  | 'hotshot'
  | 'conestoga'
  | 'dry_van'
  | 'reefer'
  | 'power_only'
  | 'other'

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  flatbed: 'Flatbed',
  step_deck: 'Step Deck',
  rgn: 'RGN',
  lowboy: 'Lowboy',
  double_drop: 'Double Drop',
  hotshot: 'Hotshot',
  conestoga: 'Conestoga',
  dry_van: 'Dry Van',
  reefer: 'Reefer',
  power_only: 'Power Only',
  other: 'Other',
}

// =============================================================================
// MAIN LOAD HISTORY TYPE
// =============================================================================

export interface LoadHistory {
  id: string

  // Quote Links
  loadPlannerQuoteId: string | null
  inlandQuoteId: string | null
  quoteNumber: string | null

  // Customer
  customerName: string | null
  customerCompany: string | null

  // Carrier Assignment
  carrierId: string | null
  driverId: string | null
  truckId: string | null

  // Route
  originCity: string
  originState: string
  originZip: string | null
  destinationCity: string
  destinationState: string
  destinationZip: string | null
  totalMiles: number | null

  // Cargo
  cargoDescription: string | null
  cargoPieces: number | null
  cargoLengthIn: number | null
  cargoWidthIn: number | null
  cargoHeightIn: number | null
  cargoWeightLbs: number | null
  isOversize: boolean
  isOverweight: boolean
  equipmentTypeUsed: EquipmentType | null

  // Financials (in cents)
  customerRateCents: number | null
  carrierRateCents: number | null
  marginCents: number | null
  marginPercentage: number | null
  ratePerMileCustomerCents: number | null
  ratePerMileCarrierCents: number | null

  // Dates
  quoteDate: Date | null
  bookedDate: Date | null
  pickupDate: Date | null
  deliveryDate: Date | null
  invoiceDate: Date | null
  paidDate: Date | null

  // Status
  status: LoadHistoryStatus

  // Metadata
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// LIST ITEM TYPE (for table display)
// =============================================================================

export interface LoadHistoryListItem {
  id: string
  quoteNumber: string | null
  customerName: string | null
  customerCompany: string | null

  // Carrier info (joined)
  carrierId: string | null
  carrierName: string | null

  // Route (display format)
  originCity: string
  originState: string
  destinationCity: string
  destinationState: string
  totalMiles: number | null

  // Cargo summary
  cargoDescription: string | null
  cargoPieces: number | null
  cargoWeightLbs: number | null
  equipmentTypeUsed: EquipmentType | null
  isOversize: boolean
  isOverweight: boolean

  // Financials
  customerRateCents: number | null
  carrierRateCents: number | null
  marginCents: number | null
  marginPercentage: number | null

  // Key dates
  pickupDate: Date | null
  deliveryDate: Date | null

  // Status
  status: LoadHistoryStatus
}

// =============================================================================
// FULL DETAIL TYPE (with related data)
// =============================================================================

export interface LoadHistoryDetail extends LoadHistory {
  carrier: {
    id: string
    companyName: string | null
    carrierType: 'company' | 'owner_operator'
    mcNumber: string | null
    primaryContactName: string | null
    primaryContactPhone: string | null
  } | null
  driver: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
  } | null
  truck: {
    id: string
    unitNumber: string | null
    year: number | null
    make: string | null
    model: string | null
    category: string | null
    licensePlate: string | null
  } | null
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateLoadHistoryInput {
  // Quote Links
  loadPlannerQuoteId?: string
  inlandQuoteId?: string
  quoteNumber?: string

  // Customer
  customerName?: string
  customerCompany?: string

  // Carrier Assignment
  carrierId?: string
  driverId?: string
  truckId?: string

  // Route (required)
  originCity: string
  originState: string
  originZip?: string
  destinationCity: string
  destinationState: string
  destinationZip?: string
  totalMiles?: number

  // Cargo
  cargoDescription?: string
  cargoPieces?: number
  cargoLengthIn?: number
  cargoWidthIn?: number
  cargoHeightIn?: number
  cargoWeightLbs?: number
  isOversize?: boolean
  isOverweight?: boolean
  equipmentTypeUsed?: EquipmentType

  // Financials (in cents)
  customerRateCents?: number
  carrierRateCents?: number

  // Dates
  quoteDate?: string
  bookedDate?: string
  pickupDate?: string
  deliveryDate?: string
  invoiceDate?: string
  paidDate?: string

  // Status
  status?: LoadHistoryStatus

  // Notes
  notes?: string
}

export interface UpdateLoadHistoryInput extends Partial<CreateLoadHistoryInput> {
  id: string
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface LoadHistoryFilters {
  search?: string
  status?: LoadHistoryStatus
  carrierId?: string
  originState?: string
  destinationState?: string
  equipmentType?: EquipmentType
  isOversize?: boolean
  isOverweight?: boolean
  minMarginPercentage?: number
  maxMarginPercentage?: number
  pickupDateFrom?: string
  pickupDateTo?: string
  deliveryDateFrom?: string
  deliveryDateTo?: string
}

export interface LoadHistoryPagination {
  page: number
  pageSize: number
  sortBy?: 'pickupDate' | 'deliveryDate' | 'customerRateCents' | 'marginPercentage' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface LoadHistoryStats {
  totalLoads: number
  totalRevenueCents: number
  totalCarrierCostCents: number
  totalMarginCents: number
  averageMarginPercentage: number
  averageRatePerMileCents: number
}

export interface LaneStats {
  originState: string
  destinationState: string
  loadCount: number
  totalRevenueCents: number
  totalMarginCents: number
  averageMarginPercentage: number
  averageCustomerRateCents: number
  averageCarrierRateCents: number
}

export interface CarrierPerformanceStats {
  carrierId: string
  carrierName: string
  loadCount: number
  totalPaidCents: number
  averageRateCents: number
  averageMarginWhenUsed: number
}

export interface SimilarLoad {
  id: string
  pickupDate: Date | null
  origin: string
  destination: string
  dimensions: string | null
  cargoWeightLbs: number | null
  equipmentTypeUsed: EquipmentType | null
  customerRateCents: number | null
  carrierRateCents: number | null
  marginPercentage: number | null
}

export interface SimilarLoadsQuery {
  originState: string
  destinationState: string
  cargoLengthIn?: number
  cargoWidthIn?: number
  cargoHeightIn?: number
  equipmentType?: EquipmentType
  monthsBack?: number
  limit?: number
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getMarginColor(marginPercentage: number | null): string {
  if (marginPercentage === null) return ''
  if (marginPercentage < 10) return 'text-red-600 bg-red-50'
  if (marginPercentage < 15) return 'text-yellow-600 bg-yellow-50'
  if (marginPercentage < 20) return 'text-blue-600 bg-blue-50'
  return 'text-green-600 bg-green-50'
}

export function formatLane(originState: string, destinationState: string): string {
  return `${originState} → ${destinationState}`
}

export function formatDimensions(
  lengthIn: number | null,
  widthIn: number | null,
  heightIn: number | null
): string | null {
  if (!lengthIn && !widthIn && !heightIn) return null
  const parts = []
  if (lengthIn) parts.push(`${lengthIn}"L`)
  if (widthIn) parts.push(`${widthIn}"W`)
  if (heightIn) parts.push(`${heightIn}"H`)
  return parts.join(' x ')
}
