/**
 * Type Definitions for Load Planner
 *
 * Consolidated types for:
 * - Trucks and trailers
 * - Cargo/load items
 * - Permits and state regulations
 * - Route planning
 */

// =============================================================================
// TRUCK AND TRAILER TYPES
// =============================================================================

export type TrailerCategory =
  | 'FLATBED'
  | 'STEP_DECK'
  | 'RGN'
  | 'LOWBOY'
  | 'DOUBLE_DROP'
  | 'LANDOLL'
  | 'CONESTOGA'
  | 'DRY_VAN'
  | 'REEFER'
  | 'CURTAIN_SIDE'
  | 'MULTI_AXLE'
  | 'SCHNABEL'
  | 'PERIMETER'
  | 'STEERABLE'
  | 'BLADE'
  | 'TANKER'
  | 'HOPPER'
  | 'SPECIALIZED'

export interface TruckType {
  id: string
  name: string
  category: TrailerCategory
  description: string
  // Deck specifications (in feet)
  deckHeight: number
  deckLength: number
  deckWidth: number
  // Well dimensions for step deck, double drop, etc.
  wellLength?: number
  wellHeight?: number
  // Capacity
  maxCargoWeight: number // in pounds
  tareWeight: number // trailer weight in pounds
  // Legal maximums this truck can handle legally (without permits)
  maxLegalCargoHeight: number // 13.5 - deckHeight
  maxLegalCargoWidth: number // 8.5 ft standard
  // Features
  features: string[]
  // Best suited for
  bestFor: string[]
  // Loading method
  loadingMethod: 'crane' | 'drive-on' | 'forklift' | 'ramp' | 'tilt' | 'pump' | 'pneumatic' | 'gravity' | 'dump'
  // Image/icon
  imageUrl?: string
}

export type PermitType =
  | 'OVERSIZE_WIDTH'
  | 'OVERSIZE_HEIGHT'
  | 'OVERSIZE_LENGTH'
  | 'OVERWEIGHT'
  | 'SUPERLOAD'

export interface PermitRequired {
  type: PermitType
  reason: string
  estimatedCost?: number
}

export interface FitAnalysis {
  // Does cargo fit on this trailer?
  fits: boolean
  // Total height (cargo + deck)
  totalHeight: number
  // Clearance from legal limits
  heightClearance: number // 13.5 - totalHeight
  widthClearance: number // 8.5 - cargoWidth
  // Weight analysis
  totalWeight: number // cargo + tare + tractor (~17000 lbs)
  weightClearance: number // 80000 - totalWeight
  // Legal status
  isLegal: boolean
  exceedsHeight: boolean
  exceedsWidth: boolean
  exceedsWeight: boolean
  exceedsLength: boolean
}

export interface TruckRecommendation {
  truck: TruckType
  // Score from 0-100
  score: number
  // Fit analysis
  fit: FitAnalysis
  // Required permits
  permitsRequired: PermitRequired[]
  // Recommendation reason
  reason: string
  // Warnings
  warnings: string[]
  // Is this the best choice?
  isBestChoice: boolean
}

// Legal limits (federal defaults, states may vary)
export const LEGAL_LIMITS = {
  HEIGHT: 13.5, // feet
  WIDTH: 8.5, // feet
  LENGTH_SINGLE: 48, // feet (single trailer)
  LENGTH_COMBINATION: 75, // feet (tractor + trailer)
  GROSS_WEIGHT: 80000, // pounds
  TRACTOR_WEIGHT: 17000, // typical tractor weight in pounds
} as const

// Permit thresholds for superloads (varies by state)
export const SUPERLOAD_THRESHOLDS = {
  WIDTH: 16, // feet
  HEIGHT: 16, // feet
  LENGTH: 120, // feet
  WEIGHT: 200000, // pounds
} as const

// =============================================================================
// LOAD AND CARGO TYPES
// =============================================================================

// Geometry types for 3D visualization
export type ItemGeometry = 'box' | 'cylinder' | 'hollow-cylinder'

// Orientation flags (bitmask like Cargo Planner)
// 1 = Fixed (longship), 3 = Rotatable (default), 63 = Tiltable
export type OrientationMode = 1 | 3 | 63 | number

export interface LoadItem {
  id: string
  sku?: string // Item identifier/SKU
  description: string
  quantity: number
  // Dimensions in feet
  length: number
  width: number
  height: number
  // Weight in pounds
  weight: number
  // Stacking properties
  stackable?: boolean
  bottomOnly?: boolean // Can only be placed at bottom, nothing stacked on top
  maxLayers?: number // Max items that can stack on this
  maxLoad?: number // Max weight that can be placed on top (lbs)
  // Orientation/rotation
  orientation?: OrientationMode // 1=fixed, 3=rotatable, 63=tiltable
  // Visual properties
  geometry?: ItemGeometry // box, cylinder, hollow-cylinder
  color?: string // Hex color for visualization
  // Loading order
  priority?: number // Higher = load first
  loadIn?: string // Target container/trailer
  destination?: string // For multi-stop routes
  // Other properties
  fragile?: boolean
  hazmat?: boolean
  notes?: string
}

export interface ParsedLoad {
  // Cargo dimensions (in feet)
  length: number
  width: number
  height: number
  // Weight in pounds (heaviest single item for truck selection)
  weight: number
  // Total weight of all items (for multi-truck planning)
  totalWeight?: number
  // Location info
  origin?: string
  destination?: string
  // Parsed items (if multiple)
  items: LoadItem[]
  // Metadata
  description?: string
  pickupDate?: string
  deliveryDate?: string
  // Parsing confidence (0-100)
  confidence: number
  // Raw parsed fields for debugging
  rawFields?: Record<string, string>
}

export interface Location {
  address: string
  city?: string
  state?: string
  zipCode?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export type LoadStatus =
  | 'DRAFT'
  | 'ANALYZED'
  | 'ROUTED'
  | 'QUOTED'
  | 'BOOKED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'

export type LoadType =
  | 'STANDARD'
  | 'HEAVY_HAUL'
  | 'OVERSIZE'
  | 'SUPERLOAD'
  | 'HAZMAT'
  | 'SPECIALIZED'

export interface Load {
  id: string
  loadNumber: string
  status: LoadStatus
  type: LoadType
  // Cargo
  items: LoadItem[]
  totalWeight: number
  // Locations
  origin: Location
  destination: Location
  // Dates
  pickupDate?: Date
  deliveryDate?: Date
  // Metadata
  customerId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// LOAD PLANNING TYPES
// =============================================================================

export interface ItemPlacement {
  itemId: string
  x: number // position from front of trailer (feet)
  z: number // position from left edge (feet)
  rotated: boolean
}

export interface PlannedLoad {
  id: string
  items: LoadItem[]
  // Aggregate dimensions for this load
  length: number
  width: number
  height: number
  weight: number
  // Truck recommendation for this specific load
  recommendedTruck: TruckType
  truckScore: number
  // Item placements for visualization
  placements: ItemPlacement[]
  // Permits needed
  permitsRequired: string[]
  // Warnings
  warnings: string[]
  // Is this load legal without permits?
  isLegal: boolean
}

export interface LoadPlan {
  // All planned loads (one per truck)
  loads: PlannedLoad[]
  // Summary
  totalTrucks: number
  totalWeight: number
  totalItems: number
  // Items that couldn't be assigned (too large for any truck)
  unassignedItems: LoadItem[]
  // Overall warnings
  warnings: string[]
}

// =============================================================================
// PERMIT AND STATE REGULATION TYPES
// =============================================================================

export interface LegalLimits {
  maxWidth: number // feet
  maxHeight: number // feet
  maxLength: {
    single: number
    combination: number
  }
  maxWeight: {
    gross: number
    perAxle?: {
      single: number
      tandem: number
      tridem?: number
    }
  }
}

export interface DimensionSurcharge {
  threshold: number
  fee: number
}

export interface WeightBracket {
  upTo: number
  fee: number
}

export interface OversizePermit {
  singleTrip: {
    baseFee: number
    dimensionSurcharges?: {
      width?: DimensionSurcharge[]
      height?: DimensionSurcharge[]
      length?: DimensionSurcharge[]
    }
    processingTime: string
    validity: string
  }
  annual?: {
    baseFee: number
    maxWidth?: number
    maxHeight?: number
    maxLength?: number
  }
}

export interface OverweightPermit {
  singleTrip: {
    baseFee: number
    perMileFee?: number
    tonMileFee?: number
    weightBrackets?: WeightBracket[]
    extraLegalFees?: {
      perTrip?: number
    }
  }
}

export interface EscortRules {
  width: {
    oneEscort: number
    twoEscorts: number
    front?: boolean
    rear?: boolean
  }
  height?: {
    poleCar: number
  }
  length?: {
    oneEscort: number
    twoEscorts?: number
  }
  policeEscort?: {
    width?: number
    height?: number
    fee: number
  }
}

export interface TravelRestrictions {
  noNightTravel: boolean
  nightDefinition?: string
  noWeekendTravel?: boolean
  weekendDefinition?: string
  noHolidayTravel: boolean
  holidays?: string[]
  peakHourRestrictions?: string
  weatherRestrictions?: string
}

export interface StateContact {
  agency: string
  phone: string
  email?: string
  website: string
  permitPortal?: string
}

export interface SuperloadThresholds {
  width?: number
  height?: number
  length?: number
  weight?: number
  requiresRouteSurvey?: boolean
  requiresBridgeAnalysis?: boolean
}

export interface StatePermitData {
  stateCode: string
  stateName: string
  timezone: string
  legalLimits: LegalLimits
  oversizePermits: OversizePermit
  overweightPermits: OverweightPermit
  escortRules: EscortRules
  travelRestrictions: TravelRestrictions
  contact: StateContact
  superloadThresholds?: SuperloadThresholds
  notes?: string[]
}

// Permit calculation results
export interface PermitRequirement {
  state: string
  stateCode: string
  oversizeRequired: boolean
  overweightRequired: boolean
  isSuperload: boolean
  escortsRequired: number
  poleCarRequired: boolean
  policeEscortRequired: boolean
  estimatedFee: number
  reasons: string[]
  travelRestrictions: string[]
}

export interface RoutePermitSummary {
  states: PermitRequirement[]
  totalPermitFees: number
  totalEscortCost: number
  estimatedEscortsPerDay: number
  overallRestrictions: string[]
  warnings: string[]
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface AnalyzeRequest {
  emailText: string
}

export interface AnalyzeMetadata {
  fileName?: string
  fileType?: string
  parsedRows?: number
  parseMethod?: 'pattern' | 'AI'
  itemsFound?: number
  hasAIFallback?: boolean
}

export interface AnalyzeResponse {
  success: boolean
  parsedLoad: ParsedLoad
  recommendations: TruckRecommendation[]
  loadPlan?: LoadPlan
  metadata?: AnalyzeMetadata
  rawText?: string
  error?: string
  warning?: string
  warnings?: string[]
}

// =============================================================================
// CARGO SPECS (for permit calculations)
// =============================================================================

export interface CargoSpecs {
  width: number // feet
  height: number // feet
  length: number // feet
  grossWeight: number // lbs (cargo + trailer + truck)
}
