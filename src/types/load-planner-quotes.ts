/**
 * Type Definitions for Load Planner Quote History
 *
 * These types match the database schema in:
 * supabase/migrations/038_load_planner_quotes.sql
 */

// =============================================================================
// QUOTE STATUS TYPES
// =============================================================================

export type LoadPlannerQuoteStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'

export const QUOTE_STATUS_LABELS: Record<LoadPlannerQuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
}

export const QUOTE_STATUS_COLORS: Record<LoadPlannerQuoteStatus, string> = {
  draft: 'gray',
  sent: 'blue',
  viewed: 'yellow',
  accepted: 'green',
  rejected: 'red',
  expired: 'orange',
}

// =============================================================================
// MAIN QUOTE TYPES
// =============================================================================

/**
 * Main load planner quote record
 */
export interface LoadPlannerQuote {
  id: string
  quoteNumber: string
  status: LoadPlannerQuoteStatus

  // Customer info
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  customerCompany: string | null
  companyId: string | null
  contactId: string | null

  // Customer address
  customerAddressLine1: string | null
  customerAddressCity: string | null
  customerAddressState: string | null
  customerAddressZip: string | null

  // Pickup location
  pickupAddress: string | null
  pickupCity: string | null
  pickupState: string | null
  pickupZip: string | null
  pickupLat: number | null
  pickupLng: number | null

  // Dropoff location
  dropoffAddress: string | null
  dropoffCity: string | null
  dropoffState: string | null
  dropoffZip: string | null
  dropoffLat: number | null
  dropoffLng: number | null

  // Route metrics
  distanceMiles: number | null
  durationMinutes: number | null
  routePolyline: string | null

  // Totals (in cents)
  subtotalCents: number | null
  totalCents: number | null

  // Sharing
  publicToken: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
  sentAt: Date | null
  viewedAt: Date | null
  expiresAt: Date | null

  // User & notes
  createdBy: string | null
  internalNotes: string | null
  quoteNotes: string | null
  isActive: boolean

  // Carrier assignment
  carrierId: string | null
  driverId: string | null
  truckId: string | null
  carrierRateCents: number | null
  carrierNotes: string | null

  // Related data (populated on fetch)
  cargoItems?: LoadPlannerCargoItem[]
  trucks?: LoadPlannerTruck[]
  serviceItems?: LoadPlannerServiceItem[]
  accessorials?: LoadPlannerAccessorial[]
  permits?: LoadPlannerPermit[]
}

/**
 * Database row format (snake_case)
 */
export interface LoadPlannerQuoteRow {
  id: string
  quote_number: string
  status: LoadPlannerQuoteStatus

  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_company: string | null
  company_id: string | null
  contact_id: string | null

  customer_address_line1: string | null
  customer_address_city: string | null
  customer_address_state: string | null
  customer_address_zip: string | null

  pickup_address: string | null
  pickup_city: string | null
  pickup_state: string | null
  pickup_zip: string | null
  pickup_lat: number | null
  pickup_lng: number | null

  dropoff_address: string | null
  dropoff_city: string | null
  dropoff_state: string | null
  dropoff_zip: string | null
  dropoff_lat: number | null
  dropoff_lng: number | null

  distance_miles: number | null
  duration_minutes: number | null
  route_polyline: string | null

  subtotal_cents: number | null
  total_cents: number | null

  public_token: string

  created_at: string
  updated_at: string
  sent_at: string | null
  viewed_at: string | null
  expires_at: string | null

  created_by: string | null
  internal_notes: string | null
  quote_notes: string | null
  is_active: boolean

  // Carrier assignment
  carrier_id: string | null
  driver_id: string | null
  truck_id: string | null
  carrier_rate_cents: number | null
  carrier_notes: string | null
}

// =============================================================================
// CARGO ITEM TYPES
// =============================================================================

export type ItemGeometry = 'box' | 'cylinder' | 'hollow-cylinder'
export type DimensionsSource = 'ai' | 'database' | 'manual'

/**
 * Individual cargo item in a quote
 */
export interface LoadPlannerCargoItem {
  id: string
  quoteId: string

  // Identification
  sku: string | null
  description: string
  quantity: number

  // Dimensions (in inches)
  lengthIn: number | null
  widthIn: number | null
  heightIn: number | null
  weightLbs: number | null

  // Properties
  stackable: boolean
  bottomOnly: boolean
  maxLayers: number | null
  fragile: boolean
  hazmat: boolean
  notes: string | null

  // Orientation & geometry
  orientation: number // 1=fixed, 3=rotatable, 63=tiltable
  geometry: ItemGeometry

  // Equipment database link
  equipmentMakeId: string | null
  equipmentModelId: string | null
  dimensionsSource: DimensionsSource | null

  // Images
  imageUrl: string | null
  imageUrl2: string | null
  frontImageUrl: string | null
  sideImageUrl: string | null

  // Load assignment
  assignedTruckIndex: number | null
  placementX: number | null
  placementY: number | null
  placementZ: number | null
  placementRotation: number | null

  // Metadata
  sortOrder: number
  createdAt: Date
}

export interface LoadPlannerCargoItemRow {
  id: string
  quote_id: string
  sku: string | null
  description: string
  quantity: number
  length_in: number | null
  width_in: number | null
  height_in: number | null
  weight_lbs: number | null
  stackable: boolean
  bottom_only: boolean
  max_layers: number | null
  fragile: boolean
  hazmat: boolean
  notes: string | null
  orientation: number
  geometry: ItemGeometry
  equipment_make_id: string | null
  equipment_model_id: string | null
  dimensions_source: DimensionsSource | null
  image_url: string | null
  image_url_2: string | null
  front_image_url: string | null
  side_image_url: string | null
  assigned_truck_index: number | null
  placement_x: number | null
  placement_y: number | null
  placement_z: number | null
  placement_rotation: number | null
  sort_order: number
  created_at: string
}

// =============================================================================
// TRUCK TYPES
// =============================================================================

/**
 * Truck assigned to a quote
 */
export interface LoadPlannerTruck {
  id: string
  quoteId: string

  // Truck info
  truckIndex: number
  truckTypeId: string
  truckName: string | null
  truckCategory: string | null

  // Specs (copied for historical record)
  deckLengthFt: number | null
  deckWidthFt: number | null
  deckHeightFt: number | null
  wellLengthFt: number | null
  maxCargoWeightLbs: number | null

  // Load stats
  totalWeightLbs: number | null
  totalItems: number | null
  isLegal: boolean

  // Permits & warnings
  permitsRequired: string[] | null
  warnings: string[] | null
  truckScore: number | null

  createdAt: Date
}

export interface LoadPlannerTruckRow {
  id: string
  quote_id: string
  truck_index: number
  truck_type_id: string
  truck_name: string | null
  truck_category: string | null
  deck_length_ft: number | null
  deck_width_ft: number | null
  deck_height_ft: number | null
  well_length_ft: number | null
  max_cargo_weight_lbs: number | null
  total_weight_lbs: number | null
  total_items: number | null
  is_legal: boolean
  permits_required: string[] | null
  warnings: string[] | null
  truck_score: number | null
  created_at: string
}

// =============================================================================
// SERVICE ITEM TYPES
// =============================================================================

/**
 * Service line item (Line Haul, Fuel, etc.)
 */
export interface LoadPlannerServiceItem {
  id: string
  quoteId: string

  // Service info
  serviceTypeId: string | null
  name: string

  // Pricing (in cents)
  rateCents: number
  quantity: number
  totalCents: number

  // Per-truck (null = all trucks)
  truckIndex: number | null

  // Metadata
  sortOrder: number
  createdAt: Date
}

export interface LoadPlannerServiceItemRow {
  id: string
  quote_id: string
  service_type_id: string | null
  name: string
  rate_cents: number
  quantity: number
  total_cents: number
  truck_index: number | null
  sort_order: number
  created_at: string
}

// =============================================================================
// ACCESSORIAL TYPES
// =============================================================================

export type BillingUnit = 'flat' | 'hour' | 'day' | 'way' | 'week' | 'month' | 'stop' | 'mile'

/**
 * Accessorial charge
 */
export interface LoadPlannerAccessorial {
  id: string
  quoteId: string

  // Accessorial info
  accessorialTypeId: string | null
  name: string

  // Billing
  billingUnit: BillingUnit
  rateCents: number
  quantity: number
  totalCents: number

  // Notes
  notes: string | null

  // Metadata
  sortOrder: number
  createdAt: Date
}

export interface LoadPlannerAccessorialRow {
  id: string
  quote_id: string
  accessorial_type_id: string | null
  name: string
  billing_unit: BillingUnit
  rate_cents: number
  quantity: number
  total_cents: number
  notes: string | null
  sort_order: number
  created_at: string
}

// =============================================================================
// PERMIT TYPES
// =============================================================================

/**
 * State permit costs (with user overrides)
 */
export interface LoadPlannerPermit {
  id: string
  quoteId: string

  // State
  stateCode: string
  stateName: string | null

  // Calculated values (original from algorithm)
  calculatedPermitFeeCents: number | null
  calculatedEscortCostCents: number | null

  // User overrides (if manually edited)
  permitFeeCents: number | null
  escortCostCents: number | null

  // Route info for this state
  distanceMiles: number | null
  escortCount: number | null
  poleCarRequired: boolean

  // Notes
  notes: string | null

  createdAt: Date
}

export interface LoadPlannerPermitRow {
  id: string
  quote_id: string
  state_code: string
  state_name: string | null
  calculated_permit_fee_cents: number | null
  calculated_escort_cost_cents: number | null
  permit_fee_cents: number | null
  escort_cost_cents: number | null
  distance_miles: number | null
  escort_count: number | null
  pole_car_required: boolean
  notes: string | null
  created_at: string
}

// =============================================================================
// API INPUT/OUTPUT TYPES
// =============================================================================

/**
 * Input for creating a new quote
 */
export interface CreateLoadPlannerQuoteInput {
  // Customer
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerCompany?: string
  companyId?: string
  contactId?: string

  // Customer address
  customerAddressLine1?: string
  customerAddressCity?: string
  customerAddressState?: string
  customerAddressZip?: string

  // Pickup
  pickupAddress?: string
  pickupCity?: string
  pickupState?: string
  pickupZip?: string
  pickupLat?: number
  pickupLng?: number

  // Dropoff
  dropoffAddress?: string
  dropoffCity?: string
  dropoffState?: string
  dropoffZip?: string
  dropoffLat?: number
  dropoffLng?: number

  // Route
  distanceMiles?: number
  durationMinutes?: number
  routePolyline?: string

  // Totals
  subtotalCents?: number
  totalCents?: number

  // Notes
  internalNotes?: string
  quoteNotes?: string

  // Carrier assignment
  carrierId?: string
  driverId?: string
  truckId?: string
  carrierRateCents?: number
  carrierNotes?: string

  // Related data
  cargoItems?: CreateCargoItemInput[]
  trucks?: CreateTruckInput[]
  serviceItems?: CreateServiceItemInput[]
  accessorials?: CreateAccessorialInput[]
  permits?: CreatePermitInput[]
}

export interface CreateCargoItemInput {
  sku?: string
  description: string
  quantity?: number
  lengthIn?: number
  widthIn?: number
  heightIn?: number
  weightLbs?: number
  stackable?: boolean
  bottomOnly?: boolean
  maxLayers?: number
  fragile?: boolean
  hazmat?: boolean
  notes?: string
  orientation?: number
  geometry?: ItemGeometry
  equipmentMakeId?: string
  equipmentModelId?: string
  dimensionsSource?: DimensionsSource
  imageUrl?: string
  imageUrl2?: string
  frontImageUrl?: string
  sideImageUrl?: string
  assignedTruckIndex?: number
  placementX?: number
  placementY?: number
  placementZ?: number
  placementRotation?: number
  sortOrder?: number
}

export interface CreateTruckInput {
  truckIndex: number
  truckTypeId: string
  truckName?: string
  truckCategory?: string
  deckLengthFt?: number
  deckWidthFt?: number
  deckHeightFt?: number
  wellLengthFt?: number
  maxCargoWeightLbs?: number
  totalWeightLbs?: number
  totalItems?: number
  isLegal?: boolean
  permitsRequired?: string[]
  warnings?: string[]
  truckScore?: number
}

export interface CreateServiceItemInput {
  serviceTypeId?: string
  name: string
  rateCents: number
  quantity?: number
  totalCents: number
  truckIndex?: number
  sortOrder?: number
}

export interface CreateAccessorialInput {
  accessorialTypeId?: string
  name: string
  billingUnit: BillingUnit
  rateCents: number
  quantity?: number
  totalCents: number
  notes?: string
  sortOrder?: number
}

export interface CreatePermitInput {
  stateCode: string
  stateName?: string
  calculatedPermitFeeCents?: number
  calculatedEscortCostCents?: number
  permitFeeCents?: number
  escortCostCents?: number
  distanceMiles?: number
  escortCount?: number
  poleCarRequired?: boolean
  notes?: string
}

/**
 * Update input (partial)
 */
export type UpdateLoadPlannerQuoteInput = Partial<CreateLoadPlannerQuoteInput> & {
  id: string
  status?: LoadPlannerQuoteStatus
}

/**
 * List filters
 */
export interface LoadPlannerQuoteFilters {
  search?: string
  status?: LoadPlannerQuoteStatus | LoadPlannerQuoteStatus[]
  customerName?: string
  customerCompany?: string
  pickupState?: string
  dropoffState?: string
  dateFrom?: Date
  dateTo?: Date
  companyId?: string
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
 * Quote list item (minimal data for list view)
 */
export interface LoadPlannerQuoteListItem {
  id: string
  quoteNumber: string
  status: LoadPlannerQuoteStatus
  customerName: string | null
  customerCompany: string | null
  pickupCity: string | null
  pickupState: string | null
  dropoffCity: string | null
  dropoffState: string | null
  totalCents: number | null
  carrierRateCents: number | null
  carrierId: string | null
  carrierName: string | null // Joined from carriers table
  trucksCount: number
  cargoItemsCount: number
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert database row to frontend type (snake_case to camelCase)
 */
export function quoteRowToQuote(row: LoadPlannerQuoteRow): LoadPlannerQuote {
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    status: row.status,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    customerCompany: row.customer_company,
    companyId: row.company_id,
    contactId: row.contact_id,
    customerAddressLine1: row.customer_address_line1,
    customerAddressCity: row.customer_address_city,
    customerAddressState: row.customer_address_state,
    customerAddressZip: row.customer_address_zip,
    pickupAddress: row.pickup_address,
    pickupCity: row.pickup_city,
    pickupState: row.pickup_state,
    pickupZip: row.pickup_zip,
    pickupLat: row.pickup_lat,
    pickupLng: row.pickup_lng,
    dropoffAddress: row.dropoff_address,
    dropoffCity: row.dropoff_city,
    dropoffState: row.dropoff_state,
    dropoffZip: row.dropoff_zip,
    dropoffLat: row.dropoff_lat,
    dropoffLng: row.dropoff_lng,
    distanceMiles: row.distance_miles,
    durationMinutes: row.duration_minutes,
    routePolyline: row.route_polyline,
    subtotalCents: row.subtotal_cents,
    totalCents: row.total_cents,
    publicToken: row.public_token,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sentAt: row.sent_at ? new Date(row.sent_at) : null,
    viewedAt: row.viewed_at ? new Date(row.viewed_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdBy: row.created_by,
    internalNotes: row.internal_notes,
    quoteNotes: row.quote_notes,
    isActive: row.is_active,
    carrierId: row.carrier_id,
    driverId: row.driver_id,
    truckId: row.truck_id,
    carrierRateCents: row.carrier_rate_cents,
    carrierNotes: row.carrier_notes,
  }
}

export function cargoItemRowToItem(row: LoadPlannerCargoItemRow): LoadPlannerCargoItem {
  return {
    id: row.id,
    quoteId: row.quote_id,
    sku: row.sku,
    description: row.description,
    quantity: row.quantity,
    lengthIn: row.length_in,
    widthIn: row.width_in,
    heightIn: row.height_in,
    weightLbs: row.weight_lbs,
    stackable: row.stackable,
    bottomOnly: row.bottom_only,
    maxLayers: row.max_layers,
    fragile: row.fragile,
    hazmat: row.hazmat,
    notes: row.notes,
    orientation: row.orientation,
    geometry: row.geometry,
    equipmentMakeId: row.equipment_make_id,
    equipmentModelId: row.equipment_model_id,
    dimensionsSource: row.dimensions_source,
    imageUrl: row.image_url,
    imageUrl2: row.image_url_2,
    frontImageUrl: row.front_image_url,
    sideImageUrl: row.side_image_url,
    assignedTruckIndex: row.assigned_truck_index,
    placementX: row.placement_x,
    placementY: row.placement_y,
    placementZ: row.placement_z,
    placementRotation: row.placement_rotation,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
  }
}

export function truckRowToTruck(row: LoadPlannerTruckRow): LoadPlannerTruck {
  return {
    id: row.id,
    quoteId: row.quote_id,
    truckIndex: row.truck_index,
    truckTypeId: row.truck_type_id,
    truckName: row.truck_name,
    truckCategory: row.truck_category,
    deckLengthFt: row.deck_length_ft,
    deckWidthFt: row.deck_width_ft,
    deckHeightFt: row.deck_height_ft,
    wellLengthFt: row.well_length_ft,
    maxCargoWeightLbs: row.max_cargo_weight_lbs,
    totalWeightLbs: row.total_weight_lbs,
    totalItems: row.total_items,
    isLegal: row.is_legal,
    permitsRequired: row.permits_required,
    warnings: row.warnings,
    truckScore: row.truck_score,
    createdAt: new Date(row.created_at),
  }
}

export function serviceItemRowToItem(row: LoadPlannerServiceItemRow): LoadPlannerServiceItem {
  return {
    id: row.id,
    quoteId: row.quote_id,
    serviceTypeId: row.service_type_id,
    name: row.name,
    rateCents: row.rate_cents,
    quantity: row.quantity,
    totalCents: row.total_cents,
    truckIndex: row.truck_index,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
  }
}

export function accessorialRowToItem(row: LoadPlannerAccessorialRow): LoadPlannerAccessorial {
  return {
    id: row.id,
    quoteId: row.quote_id,
    accessorialTypeId: row.accessorial_type_id,
    name: row.name,
    billingUnit: row.billing_unit,
    rateCents: row.rate_cents,
    quantity: row.quantity,
    totalCents: row.total_cents,
    notes: row.notes,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
  }
}

export function permitRowToPermit(row: LoadPlannerPermitRow): LoadPlannerPermit {
  return {
    id: row.id,
    quoteId: row.quote_id,
    stateCode: row.state_code,
    stateName: row.state_name,
    calculatedPermitFeeCents: row.calculated_permit_fee_cents,
    calculatedEscortCostCents: row.calculated_escort_cost_cents,
    permitFeeCents: row.permit_fee_cents,
    escortCostCents: row.escort_cost_cents,
    distanceMiles: row.distance_miles,
    escortCount: row.escort_count,
    poleCarRequired: row.pole_car_required,
    notes: row.notes,
    createdAt: new Date(row.created_at),
  }
}
