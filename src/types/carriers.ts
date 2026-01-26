/**
 * Type Definitions for Carriers Management
 *
 * These types match the database schema in:
 * supabase/migrations/039_carriers.sql
 */

// =============================================================================
// STATUS TYPES
// =============================================================================

export type CarrierType = 'company' | 'owner_operator'

export type CarrierStatus = 'active' | 'inactive' | 'preferred' | 'on_hold' | 'blacklisted'

export type DriverStatus = 'active' | 'inactive' | 'on_leave'

export type TruckStatus = 'active' | 'inactive' | 'out_of_service' | 'sold'

export type PaymentMethod = 'check' | 'ach' | 'quick_pay' | 'factoring'

export type CDLClass = 'A' | 'B' | 'C'

// Status labels for display
export const CARRIER_TYPE_LABELS: Record<CarrierType, string> = {
  company: 'Company',
  owner_operator: 'Owner-Operator',
}

export const CARRIER_STATUS_LABELS: Record<CarrierStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  preferred: 'Preferred',
  on_hold: 'On Hold',
  blacklisted: 'Blacklisted',
}

export const CARRIER_STATUS_COLORS: Record<CarrierStatus, string> = {
  active: 'green',
  inactive: 'gray',
  preferred: 'blue',
  on_hold: 'yellow',
  blacklisted: 'red',
}

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
}

export const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  active: 'green',
  inactive: 'gray',
  on_leave: 'yellow',
}

export const TRUCK_STATUS_LABELS: Record<TruckStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  out_of_service: 'Out of Service',
  sold: 'Sold',
}

export const TRUCK_STATUS_COLORS: Record<TruckStatus, string> = {
  active: 'green',
  inactive: 'gray',
  out_of_service: 'red',
  sold: 'orange',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  check: 'Check',
  ach: 'ACH',
  quick_pay: 'Quick Pay',
  factoring: 'Factoring',
}

// =============================================================================
// CARRIER TYPES
// =============================================================================

/**
 * Main carrier record (trucking company or owner-operator)
 */
export interface Carrier {
  id: string
  carrierType: CarrierType

  // Company Info
  companyName: string | null
  mcNumber: string | null
  dotNumber: string | null
  einTaxId: string | null

  // Address
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  zip: string | null

  // Primary Contact
  primaryContactName: string | null
  primaryContactPhone: string | null
  primaryContactEmail: string | null

  // Billing
  billingEmail: string | null
  paymentTermsDays: number
  preferredPaymentMethod: PaymentMethod | null

  // Factoring
  factoringCompanyName: string | null
  factoringCompanyPhone: string | null
  factoringCompanyEmail: string | null

  // Insurance
  insuranceCompany: string | null
  insurancePolicyNumber: string | null
  insuranceExpiry: Date | null
  cargoInsuranceLimitCents: number | null

  // Status
  status: CarrierStatus

  // Metadata
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date

  // Related data (populated on fetch)
  drivers?: CarrierDriver[]
  trucks?: CarrierTruck[]
  driversCount?: number
  trucksCount?: number
}

/**
 * Database row format (snake_case)
 */
export interface CarrierRow {
  id: string
  carrier_type: CarrierType
  company_name: string | null
  mc_number: string | null
  dot_number: string | null
  ein_tax_id: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  primary_contact_name: string | null
  primary_contact_phone: string | null
  primary_contact_email: string | null
  billing_email: string | null
  payment_terms_days: number
  preferred_payment_method: PaymentMethod | null
  factoring_company_name: string | null
  factoring_company_phone: string | null
  factoring_company_email: string | null
  insurance_company: string | null
  insurance_policy_number: string | null
  insurance_expiry: string | null
  cargo_insurance_limit_cents: number | null
  status: CarrierStatus
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// DRIVER TYPES
// =============================================================================

/**
 * Individual driver working for a carrier
 */
export interface CarrierDriver {
  id: string
  carrierId: string
  isOwner: boolean

  // Personal
  firstName: string
  lastName: string
  nickname: string | null

  // Contact
  phone: string | null
  phoneSecondary: string | null
  email: string | null

  // Address
  addressLine1: string | null
  city: string | null
  state: string | null
  zip: string | null

  // CDL
  cdlNumber: string | null
  cdlState: string | null
  cdlClass: CDLClass | null
  cdlExpiry: Date | null
  cdlEndorsements: string | null
  medicalCardExpiry: Date | null

  // Emergency Contact
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelationship: string | null

  // Status
  status: DriverStatus

  // Metadata
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date

  // Computed
  fullName?: string
  assignedTruck?: CarrierTruck | null
}

/**
 * Database row format (snake_case)
 */
export interface CarrierDriverRow {
  id: string
  carrier_id: string
  is_owner: boolean
  first_name: string
  last_name: string
  nickname: string | null
  phone: string | null
  phone_secondary: string | null
  email: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
  cdl_number: string | null
  cdl_state: string | null
  cdl_class: CDLClass | null
  cdl_expiry: string | null
  cdl_endorsements: string | null
  medical_card_expiry: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  status: DriverStatus
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// TRUCK TYPES
// =============================================================================

/**
 * Truck/trailer owned by a carrier
 */
export interface CarrierTruck {
  id: string
  carrierId: string
  assignedDriverId: string | null

  // Identification
  unitNumber: string | null
  vin: string | null
  licensePlate: string | null
  licensePlateState: string | null

  // Vehicle
  year: number | null
  make: string | null
  model: string | null

  // Type
  truckTypeId: string | null
  category: string | null
  customTypeDescription: string | null

  // Specs
  deckLengthFt: number | null
  deckWidthFt: number | null
  deckHeightFt: number | null
  wellLengthFt: number | null
  maxCargoWeightLbs: number | null
  tareWeightLbs: number | null
  axleCount: number | null

  // Equipment
  hasTarps: boolean
  tarpType: string | null
  hasChains: boolean
  chainCount: number | null
  hasStraps: boolean
  strapCount: number | null
  hasCoilRacks: boolean
  hasLoadBars: boolean
  hasRamps: boolean
  otherEquipment: string | null

  // Compliance
  registrationState: string | null
  registrationExpiry: Date | null
  annualInspectionDate: Date | null
  annualInspectionExpiry: Date | null

  // Status
  status: TruckStatus

  // Metadata
  notes: string | null
  imageUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date

  // Related
  assignedDriver?: CarrierDriver | null
}

/**
 * Database row format (snake_case)
 */
export interface CarrierTruckRow {
  id: string
  carrier_id: string
  assigned_driver_id: string | null
  unit_number: string | null
  vin: string | null
  license_plate: string | null
  license_plate_state: string | null
  year: number | null
  make: string | null
  model: string | null
  truck_type_id: string | null
  category: string | null
  custom_type_description: string | null
  deck_length_ft: number | null
  deck_width_ft: number | null
  deck_height_ft: number | null
  well_length_ft: number | null
  max_cargo_weight_lbs: number | null
  tare_weight_lbs: number | null
  axle_count: number | null
  has_tarps: boolean
  tarp_type: string | null
  has_chains: boolean
  chain_count: number | null
  has_straps: boolean
  strap_count: number | null
  has_coil_racks: boolean
  has_load_bars: boolean
  has_ramps: boolean
  other_equipment: string | null
  registration_state: string | null
  registration_expiry: string | null
  annual_inspection_date: string | null
  annual_inspection_expiry: string | null
  status: TruckStatus
  notes: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// API INPUT/OUTPUT TYPES
// =============================================================================

/**
 * Input for creating a new carrier
 */
export interface CreateCarrierInput {
  carrierType: CarrierType
  companyName?: string
  mcNumber?: string
  dotNumber?: string
  einTaxId?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zip?: string
  primaryContactName?: string
  primaryContactPhone?: string
  primaryContactEmail?: string
  billingEmail?: string
  paymentTermsDays?: number
  preferredPaymentMethod?: PaymentMethod
  factoringCompanyName?: string
  factoringCompanyPhone?: string
  factoringCompanyEmail?: string
  insuranceCompany?: string
  insurancePolicyNumber?: string
  insuranceExpiry?: string
  cargoInsuranceLimitCents?: number
  status?: CarrierStatus
  notes?: string
}

export type UpdateCarrierInput = Partial<CreateCarrierInput> & { id: string }

/**
 * Input for creating a new driver
 */
export interface CreateDriverInput {
  carrierId: string
  isOwner?: boolean
  firstName: string
  lastName: string
  nickname?: string
  phone?: string
  phoneSecondary?: string
  email?: string
  addressLine1?: string
  city?: string
  state?: string
  zip?: string
  cdlNumber?: string
  cdlState?: string
  cdlClass?: CDLClass
  cdlExpiry?: string
  cdlEndorsements?: string
  medicalCardExpiry?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelationship?: string
  status?: DriverStatus
  notes?: string
}

export type UpdateDriverInput = Partial<Omit<CreateDriverInput, 'carrierId'>> & { id: string }

/**
 * Input for creating a new truck
 */
export interface CreateTruckInput {
  carrierId: string
  assignedDriverId?: string
  unitNumber?: string
  vin?: string
  licensePlate?: string
  licensePlateState?: string
  year?: number
  make?: string
  model?: string
  truckTypeId?: string
  category?: string
  customTypeDescription?: string
  deckLengthFt?: number
  deckWidthFt?: number
  deckHeightFt?: number
  wellLengthFt?: number
  maxCargoWeightLbs?: number
  tareWeightLbs?: number
  axleCount?: number
  hasTarps?: boolean
  tarpType?: string
  hasChains?: boolean
  chainCount?: number
  hasStraps?: boolean
  strapCount?: number
  hasCoilRacks?: boolean
  hasLoadBars?: boolean
  hasRamps?: boolean
  otherEquipment?: string
  registrationState?: string
  registrationExpiry?: string
  annualInspectionDate?: string
  annualInspectionExpiry?: string
  status?: TruckStatus
  notes?: string
  imageUrl?: string
}

export type UpdateTruckInput = Partial<Omit<CreateTruckInput, 'carrierId'>> & { id: string }

/**
 * List filters
 */
export interface CarrierFilters {
  search?: string
  carrierType?: CarrierType | CarrierType[]
  status?: CarrierStatus | CarrierStatus[]
  state?: string
  hasInsurance?: boolean
  insuranceExpiringWithin?: number // days
}

export interface DriverFilters {
  carrierId?: string
  search?: string
  status?: DriverStatus | DriverStatus[]
  cdlExpiringWithin?: number // days
  medicalExpiringWithin?: number // days
}

export interface TruckFilters {
  carrierId?: string
  search?: string
  status?: TruckStatus | TruckStatus[]
  category?: string
  hasDriver?: boolean
  registrationExpiringWithin?: number // days
  inspectionExpiringWithin?: number // days
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Carrier list item (minimal data for list view)
 */
export interface CarrierListItem {
  id: string
  carrierType: CarrierType
  companyName: string | null
  mcNumber: string | null
  dotNumber: string | null
  city: string | null
  state: string | null
  primaryContactName: string | null
  primaryContactPhone: string | null
  status: CarrierStatus
  driversCount: number
  trucksCount: number
  insuranceExpiry: Date | null
  createdAt: Date
}

/**
 * Carrier detail (full data with related entities)
 */
export interface CarrierDetail extends Carrier {
  drivers: CarrierDriver[]
  trucks: CarrierTruck[]
}

/**
 * Search result for autocomplete
 */
export interface CarrierSearchResult {
  id: string
  carrierType: CarrierType
  companyName: string | null
  mcNumber: string | null
  city: string | null
  state: string | null
  status: CarrierStatus
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert database row to frontend type (snake_case to camelCase)
 */
export function carrierRowToCarrier(row: CarrierRow): Carrier {
  return {
    id: row.id,
    carrierType: row.carrier_type,
    companyName: row.company_name,
    mcNumber: row.mc_number,
    dotNumber: row.dot_number,
    einTaxId: row.ein_tax_id,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    zip: row.zip,
    primaryContactName: row.primary_contact_name,
    primaryContactPhone: row.primary_contact_phone,
    primaryContactEmail: row.primary_contact_email,
    billingEmail: row.billing_email,
    paymentTermsDays: row.payment_terms_days,
    preferredPaymentMethod: row.preferred_payment_method,
    factoringCompanyName: row.factoring_company_name,
    factoringCompanyPhone: row.factoring_company_phone,
    factoringCompanyEmail: row.factoring_company_email,
    insuranceCompany: row.insurance_company,
    insurancePolicyNumber: row.insurance_policy_number,
    insuranceExpiry: row.insurance_expiry ? new Date(row.insurance_expiry) : null,
    cargoInsuranceLimitCents: row.cargo_insurance_limit_cents,
    status: row.status,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function driverRowToDriver(row: CarrierDriverRow): CarrierDriver {
  return {
    id: row.id,
    carrierId: row.carrier_id,
    isOwner: row.is_owner,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    phone: row.phone,
    phoneSecondary: row.phone_secondary,
    email: row.email,
    addressLine1: row.address_line1,
    city: row.city,
    state: row.state,
    zip: row.zip,
    cdlNumber: row.cdl_number,
    cdlState: row.cdl_state,
    cdlClass: row.cdl_class,
    cdlExpiry: row.cdl_expiry ? new Date(row.cdl_expiry) : null,
    cdlEndorsements: row.cdl_endorsements,
    medicalCardExpiry: row.medical_card_expiry ? new Date(row.medical_card_expiry) : null,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    emergencyContactRelationship: row.emergency_contact_relationship,
    status: row.status,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    fullName: `${row.first_name} ${row.last_name}`,
  }
}

export function truckRowToTruck(row: CarrierTruckRow): CarrierTruck {
  return {
    id: row.id,
    carrierId: row.carrier_id,
    assignedDriverId: row.assigned_driver_id,
    unitNumber: row.unit_number,
    vin: row.vin,
    licensePlate: row.license_plate,
    licensePlateState: row.license_plate_state,
    year: row.year,
    make: row.make,
    model: row.model,
    truckTypeId: row.truck_type_id,
    category: row.category,
    customTypeDescription: row.custom_type_description,
    deckLengthFt: row.deck_length_ft,
    deckWidthFt: row.deck_width_ft,
    deckHeightFt: row.deck_height_ft,
    wellLengthFt: row.well_length_ft,
    maxCargoWeightLbs: row.max_cargo_weight_lbs,
    tareWeightLbs: row.tare_weight_lbs,
    axleCount: row.axle_count,
    hasTarps: row.has_tarps,
    tarpType: row.tarp_type,
    hasChains: row.has_chains,
    chainCount: row.chain_count,
    hasStraps: row.has_straps,
    strapCount: row.strap_count,
    hasCoilRacks: row.has_coil_racks,
    hasLoadBars: row.has_load_bars,
    hasRamps: row.has_ramps,
    otherEquipment: row.other_equipment,
    registrationState: row.registration_state,
    registrationExpiry: row.registration_expiry ? new Date(row.registration_expiry) : null,
    annualInspectionDate: row.annual_inspection_date ? new Date(row.annual_inspection_date) : null,
    annualInspectionExpiry: row.annual_inspection_expiry ? new Date(row.annual_inspection_expiry) : null,
    status: row.status,
    notes: row.notes,
    imageUrl: row.image_url,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Get display name for a carrier
 */
export function getCarrierDisplayName(carrier: Carrier | CarrierListItem): string {
  return carrier.companyName || 'Unnamed Carrier'
}

/**
 * Get full address string
 */
export function getCarrierAddress(carrier: Carrier): string {
  const parts = [
    carrier.addressLine1,
    carrier.addressLine2,
    carrier.city,
    carrier.state,
    carrier.zip,
  ].filter(Boolean)
  return parts.join(', ')
}

/**
 * Check if insurance is expiring soon (within 30 days)
 */
export function isInsuranceExpiringSoon(carrier: Carrier, daysThreshold = 30): boolean {
  if (!carrier.insuranceExpiry) return false
  const now = new Date()
  const expiry = new Date(carrier.insuranceExpiry)
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays > 0 && diffDays <= daysThreshold
}

/**
 * Check if CDL is expiring soon
 */
export function isCdlExpiringSoon(driver: CarrierDriver, daysThreshold = 30): boolean {
  if (!driver.cdlExpiry) return false
  const now = new Date()
  const expiry = new Date(driver.cdlExpiry)
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays > 0 && diffDays <= daysThreshold
}

/**
 * Check if medical card is expiring soon
 */
export function isMedicalExpiringSoon(driver: CarrierDriver, daysThreshold = 30): boolean {
  if (!driver.medicalCardExpiry) return false
  const now = new Date()
  const expiry = new Date(driver.medicalCardExpiry)
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays > 0 && diffDays <= daysThreshold
}

/**
 * Get truck display name
 */
export function getTruckDisplayName(truck: CarrierTruck): string {
  const parts = []
  if (truck.unitNumber) parts.push(`#${truck.unitNumber}`)
  if (truck.year) parts.push(truck.year.toString())
  if (truck.make) parts.push(truck.make)
  if (truck.model) parts.push(truck.model)
  if (parts.length === 0 && truck.category) parts.push(truck.category)
  return parts.join(' ') || 'Unnamed Truck'
}
