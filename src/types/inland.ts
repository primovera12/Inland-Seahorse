// Inland Transportation domain types

export const ACCESSORIAL_BILLING_UNITS = [
  'flat',
  'hour',
  'day',
  'way',
  'week',
  'month',
  'stop',
  'mile',
] as const

export type AccessorialBillingUnit = (typeof ACCESSORIAL_BILLING_UNITS)[number]

export interface InlandQuote {
  id: string
  quote_number: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

  // Customer info
  company_id?: string
  contact_id?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  customer_company?: string

  // Multi-destination blocks
  destination_blocks: InlandDestinationBlock[]

  // Totals (all in cents)
  subtotal: number
  margin_percentage: number
  margin_amount: number
  total: number

  // Notes
  internal_notes?: string
  quote_notes?: string

  // Timestamps
  created_at: string
  updated_at: string
  sent_at?: string
  expires_at?: string
}

export interface Waypoint {
  id: string
  address: string
  city?: string
  state?: string
  zip?: string
  lat?: number
  lng?: number
  place_id?: string
  stop_type: 'pickup' | 'dropoff' | 'both' // What happens at this stop
  notes?: string
}

export interface InlandDestinationBlock {
  id: string
  label: string // A, B, C, etc.

  // Pickup location (origin)
  pickup_address: string
  pickup_city?: string
  pickup_state?: string
  pickup_zip?: string
  pickup_lat?: number
  pickup_lng?: number
  pickup_place_id?: string

  // Intermediate stops/waypoints
  waypoints?: Waypoint[]

  // Dropoff location (final destination)
  dropoff_address: string
  dropoff_city?: string
  dropoff_state?: string
  dropoff_zip?: string
  dropoff_lat?: number
  dropoff_lng?: number
  dropoff_place_id?: string

  // Route info from Google (total for all legs)
  distance_miles?: number
  duration_minutes?: number
  route_polyline?: string

  // Static map URL for PDF display
  static_map_url?: string

  // Load blocks for this destination
  load_blocks: InlandLoadBlock[]

  // Destination-level services (V2 format - consolidated at destination level instead of per-load)
  service_items?: ServiceItem[]

  // Destination-level accessorial charges (V2 format)
  accessorial_charges?: AccessorialCharge[]

  // Destination totals (services only)
  subtotal: number

  // Accessorial fees total (if applicable - not included in subtotal)
  accessorials_total?: number
}

export interface InlandLoadBlock {
  id: string
  truck_type_id: string
  truck_type_name: string

  // Cargo items
  cargo_items: CargoItem[]

  // Service items (line haul, drayage, loading, etc.)
  service_items: ServiceItem[]

  // Accessorial charges
  accessorial_charges: AccessorialCharge[]

  // Image
  load_image_base64?: string

  // Notes
  notes?: string

  // Load block total (services only - accessorials tracked separately)
  subtotal: number

  // Accessorial fees total (if applicable - not included in subtotal)
  accessorials_total?: number

  // Load diagram data (from load planner)
  placements?: InlandCargoPlacement[]
  truck_specs?: InlandTruckSpecs

  // Load compliance info (from load planner)
  warnings?: string[] // Warnings about this load (oversize, bridge clearance, etc.)
  permits_required?: string[] // Permits needed for this load
  is_legal?: boolean // Whether this load is legal without permits
}

// Placement info for cargo items on trailer (for load diagrams)
export interface InlandCargoPlacement {
  itemId: string
  x: number // feet from front
  z: number // feet from left edge
  rotated: boolean
}

// Truck specs for trailer diagram rendering
export interface InlandTruckSpecs {
  deckLength: number // feet
  deckWidth: number // feet
  deckHeight: number // feet
  maxWeight: number // lbs
}

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
  // Equipment mode fields
  is_equipment?: boolean
  is_custom_equipment?: boolean // True when manually entering equipment not in database
  equipment_make_id?: string
  equipment_model_id?: string
  equipment_make_name?: string
  equipment_model_name?: string
  custom_make_name?: string // Manual make name entry
  custom_model_name?: string // Manual model name entry
  // Cargo images (standard mode - supports up to 2)
  image_url?: string
  image_url_2?: string
  // Equipment-specific images (front and side views)
  front_image_url?: string
  side_image_url?: string
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
  accessorial_type_id: string
  name: string
  billing_unit: AccessorialBillingUnit
  rate: number // cents per unit
  quantity: number
  total: number // cents
  notes?: string
}

export interface AccessorialType {
  id: string
  name: string
  description?: string
  default_rate: number // cents
  billing_unit: AccessorialBillingUnit
  is_active: boolean
  sort_order: number
}

// Default accessorial types
export const DEFAULT_ACCESSORIAL_TYPES: Omit<
  AccessorialType,
  'id' | 'is_active' | 'sort_order'
>[] = [
  {
    name: 'Detention',
    description: 'Waiting time at pickup/delivery',
    default_rate: 7500,
    billing_unit: 'hour',
  },
  {
    name: 'Layover',
    description: 'Overnight stay required',
    default_rate: 35000,
    billing_unit: 'day',
  },
  {
    name: 'TONU (Truck Ordered Not Used)',
    description: 'Cancellation fee',
    default_rate: 50000,
    billing_unit: 'flat',
  },
  {
    name: 'Fuel Surcharge',
    description: 'Variable fuel cost adjustment',
    default_rate: 0,
    billing_unit: 'flat',
  },
  {
    name: 'Tolls',
    description: 'Highway toll charges',
    default_rate: 0,
    billing_unit: 'way',
  },
  {
    name: 'Permits',
    description: 'Oversize/overweight permits',
    default_rate: 0,
    billing_unit: 'flat',
  },
  {
    name: 'Escort Service',
    description: 'Pilot car for oversized loads',
    default_rate: 0,
    billing_unit: 'way',
  },
  {
    name: 'Storage',
    description: 'Temporary cargo storage',
    default_rate: 15000,
    billing_unit: 'day',
  },
  {
    name: 'Tarping',
    description: 'Load covering service',
    default_rate: 10000,
    billing_unit: 'flat',
  },
  {
    name: 'Lumper Fee',
    description: 'Loading/unloading assistance',
    default_rate: 20000,
    billing_unit: 'flat',
  },
]

export interface InlandEquipmentType {
  id: string
  name: string
  description?: string
  max_length_inches: number
  max_width_inches: number
  max_height_inches: number
  max_weight_lbs: number
  legal_length_inches: number
  legal_width_inches: number
  legal_height_inches: number
  legal_weight_lbs: number
  is_active: boolean
  sort_order: number
}

export interface SavedLane {
  id: string
  name: string
  pickup_address: string
  pickup_city?: string
  pickup_state?: string
  pickup_place_id?: string
  dropoff_address: string
  dropoff_city?: string
  dropoff_state?: string
  dropoff_place_id?: string
  distance_miles?: number
  use_count: number
  last_used_at: string
  created_at: string
}

export interface RateTier {
  id: string
  name: string
  min_miles: number
  max_miles: number
  rate_per_mile: number // cents
  is_active: boolean
}

// Default rate tiers
export const DEFAULT_RATE_TIERS: Omit<RateTier, 'id' | 'is_active'>[] = [
  { name: 'Local', min_miles: 0, max_miles: 100, rate_per_mile: 450 },
  { name: 'Short Haul', min_miles: 101, max_miles: 250, rate_per_mile: 350 },
  { name: 'Regional', min_miles: 251, max_miles: 500, rate_per_mile: 300 },
  { name: 'Long Haul', min_miles: 501, max_miles: 1000, rate_per_mile: 250 },
  {
    name: 'Cross Country',
    min_miles: 1001,
    max_miles: 99999,
    rate_per_mile: 225,
  },
]
