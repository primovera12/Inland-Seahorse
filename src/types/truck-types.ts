// Truck Types - Database-backed truck configurations for Load Planner AI

// =============================================================================
// TRUCK CATEGORY ENUM
// =============================================================================

export const TRUCK_CATEGORIES = [
  'FLATBED',
  'STEP_DECK',
  'RGN',
  'LOWBOY',
  'DOUBLE_DROP',
  'LANDOLL',
  'CONESTOGA',
  'DRY_VAN',
  'REEFER',
  'CURTAIN_SIDE',
  'MULTI_AXLE',
  'SPECIALIZED',
  'SCHNABEL',
  'PERIMETER',
  'STEERABLE',
  'BLADE',
  'TANKER',
  'HOPPER',
] as const

export type TruckCategory = (typeof TRUCK_CATEGORIES)[number]

export const TRUCK_CATEGORY_LABELS: Record<TruckCategory, string> = {
  FLATBED: 'Flatbed',
  STEP_DECK: 'Step Deck',
  RGN: 'RGN (Removable Gooseneck)',
  LOWBOY: 'Lowboy',
  DOUBLE_DROP: 'Double Drop',
  LANDOLL: 'Landoll / Tilt Bed',
  CONESTOGA: 'Conestoga',
  DRY_VAN: 'Dry Van',
  REEFER: 'Refrigerated',
  CURTAIN_SIDE: 'Curtain Side',
  MULTI_AXLE: 'Multi-Axle Heavy Haul',
  SPECIALIZED: 'Specialized',
  SCHNABEL: 'Schnabel',
  PERIMETER: 'Perimeter / Beam',
  STEERABLE: 'Steerable Dolly',
  BLADE: 'Blade Trailer',
  TANKER: 'Tanker',
  HOPPER: 'Hopper / Dump',
}

// =============================================================================
// LOADING METHODS
// =============================================================================

export const LOADING_METHODS = [
  'crane',
  'drive-on',
  'forklift',
  'tilt',
  'pump',
  'pneumatic',
  'gravity',
  'dump',
] as const

export type LoadingMethod = (typeof LOADING_METHODS)[number]

export const LOADING_METHOD_LABELS: Record<LoadingMethod, string> = {
  crane: 'Crane',
  'drive-on': 'Drive-On',
  forklift: 'Forklift',
  tilt: 'Tilt/Slide',
  pump: 'Pump',
  pneumatic: 'Pneumatic',
  gravity: 'Gravity',
  dump: 'Dump',
}

// =============================================================================
// MAIN TRUCK TYPE INTERFACE
// =============================================================================

export interface TruckTypeRecord {
  id: string
  name: string
  category: TruckCategory
  description: string | null

  // Dimensions (feet)
  deckHeightFt: number
  deckLengthFt: number
  deckWidthFt: number
  wellLengthFt: number | null
  wellHeightFt: number | null

  // Weight limits (lbs)
  maxCargoWeightLbs: number
  tareWeightLbs: number | null

  // Legal limits (feet)
  maxLegalCargoHeightFt: number | null
  maxLegalCargoWidthFt: number | null

  // Features and capabilities
  features: string[]
  bestFor: string[]
  loadingMethod: LoadingMethod | null

  // Availability and pricing
  isActive: boolean
  baseRateCents: number | null
  ratePerMileCents: number | null

  // Display
  sortOrder: number

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// DATABASE ROW TYPE
// =============================================================================

export interface TruckTypeRow {
  id: string
  name: string
  category: string
  description: string | null

  deck_height_ft: number
  deck_length_ft: number
  deck_width_ft: number
  well_length_ft: number | null
  well_height_ft: number | null

  max_cargo_weight_lbs: number
  tare_weight_lbs: number | null

  max_legal_cargo_height_ft: number | null
  max_legal_cargo_width_ft: number | null

  features: string[] | null
  best_for: string[] | null
  loading_method: string | null

  is_active: boolean
  base_rate_cents: number | null
  rate_per_mile_cents: number | null

  sort_order: number

  created_at: string
  updated_at: string
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateTruckTypeInput {
  name: string
  category: TruckCategory
  description?: string

  deckHeightFt: number
  deckLengthFt: number
  deckWidthFt?: number
  wellLengthFt?: number
  wellHeightFt?: number

  maxCargoWeightLbs: number
  tareWeightLbs?: number

  maxLegalCargoHeightFt?: number
  maxLegalCargoWidthFt?: number

  features?: string[]
  bestFor?: string[]
  loadingMethod?: LoadingMethod

  isActive?: boolean
  baseRateCents?: number
  ratePerMileCents?: number

  sortOrder?: number
}

export interface UpdateTruckTypeInput extends Partial<CreateTruckTypeInput> {
  id: string
}

// =============================================================================
// LIST ITEM TYPE (for table display)
// =============================================================================

export interface TruckTypeListItem {
  id: string
  name: string
  category: TruckCategory
  description: string | null
  deckHeightFt: number
  deckLengthFt: number
  deckWidthFt: number
  maxCargoWeightLbs: number
  maxLegalCargoHeightFt: number | null
  loadingMethod: LoadingMethod | null
  isActive: boolean
  sortOrder: number
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function truckTypeRowToRecord(row: TruckTypeRow): TruckTypeRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category as TruckCategory,
    description: row.description,

    deckHeightFt: Number(row.deck_height_ft),
    deckLengthFt: Number(row.deck_length_ft),
    deckWidthFt: Number(row.deck_width_ft),
    wellLengthFt: row.well_length_ft ? Number(row.well_length_ft) : null,
    wellHeightFt: row.well_height_ft ? Number(row.well_height_ft) : null,

    maxCargoWeightLbs: row.max_cargo_weight_lbs,
    tareWeightLbs: row.tare_weight_lbs,

    maxLegalCargoHeightFt: row.max_legal_cargo_height_ft ? Number(row.max_legal_cargo_height_ft) : null,
    maxLegalCargoWidthFt: row.max_legal_cargo_width_ft ? Number(row.max_legal_cargo_width_ft) : null,

    features: row.features || [],
    bestFor: row.best_for || [],
    loadingMethod: row.loading_method as LoadingMethod | null,

    isActive: row.is_active,
    baseRateCents: row.base_rate_cents,
    ratePerMileCents: row.rate_per_mile_cents,

    sortOrder: row.sort_order,

    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function truckTypeRowToListItem(row: TruckTypeRow): TruckTypeListItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as TruckCategory,
    description: row.description,
    deckHeightFt: Number(row.deck_height_ft),
    deckLengthFt: Number(row.deck_length_ft),
    deckWidthFt: Number(row.deck_width_ft),
    maxCargoWeightLbs: row.max_cargo_weight_lbs,
    maxLegalCargoHeightFt: row.max_legal_cargo_height_ft ? Number(row.max_legal_cargo_height_ft) : null,
    loadingMethod: row.loading_method as LoadingMethod | null,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }
}
