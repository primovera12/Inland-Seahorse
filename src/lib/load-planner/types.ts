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

/**
 * Deck zone for multi-level trailers (step deck, double drop, RGN)
 * Each zone has its own deck height and therefore different legal cargo height
 */
export interface DeckZone {
  name: string          // 'upper' | 'lower' | 'well' | 'front' | 'rear' | 'gooseneck'
  startX: number        // feet from front of trailer
  endX: number          // feet from front of trailer
  deckHeight: number    // height from ground to deck surface (feet)
  maxCargoHeight: number // 13.5 - deckHeight (legal cargo height in this zone)
}

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
  // Deck zones for multi-level trailers (step deck, double drop, RGN)
  // When present, placement algorithm uses zone-specific deck heights for height checks
  // If not present, single deckHeight is used for the entire trailer
  deckZones?: DeckZone[]
  // Capacity
  maxCargoWeight: number // in pounds
  tareWeight: number // trailer weight in pounds
  // Legal maximums this truck can handle legally (without permits)
  maxLegalCargoHeight: number // 13.5 - deckHeight (for primary deck or lowest zone)
  maxLegalCargoWidth: number // 8.5 ft standard
  // Features
  features: string[]
  // Best suited for
  bestFor: string[]
  // Power unit weight (tractor/pickup pulling this trailer) in pounds
  // Hotshot: ~9,000 (pickup), Standard semi: ~17,000 (Class 8), Heavy haul: ~20,000, SPMT: 0
  powerUnitWeight: number
  // Loading method
  loadingMethod: 'crane' | 'drive-on' | 'forklift' | 'ramp' | 'tilt' | 'pump' | 'pneumatic' | 'gravity' | 'dump'
  // Kingpin-to-Rear-Axle distance (feet) — regulated in CA/OR/WA
  // If not set, derived from DEFAULT_AXLE_CONFIGS and deck length
  kingpinToRearAxle?: number
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
  totalWeight: number // cargo + tare + tractor (uses truck.powerUnitWeight)
  weightClearance: number // 80000 - totalWeight
  // Legal status
  isLegal: boolean
  exceedsHeight: boolean
  exceedsWidth: boolean
  exceedsWeight: boolean
  exceedsLength: boolean
}

/**
 * Detailed breakdown of how a truck score was calculated
 * Enables UI to show WHY a truck is recommended
 */
export interface ScoreBreakdown {
  baseScore: number              // Starting score (100)
  fitPenalty: number             // Penalty if cargo doesn't physically fit
  heightPenalty: number          // Penalty for exceeding height limit
  widthPenalty: number           // Penalty for exceeding width limit
  weightPenalty: number          // Penalty for exceeding weight limit
  overkillPenalty: number        // Penalty for using unnecessarily low trailer
  permitPenalty: number          // Cost-weighted penalty for permits
  idealFitBonus: number          // Bonus for optimal height clearance
  equipmentMatchBonus: number    // Bonus for matching loading method
  historicalBonus: number        // Bonus from historical success data
  seasonalPenalty: number        // Penalty for seasonal weight restrictions
  bridgePenalty: number          // Penalty for low-clearance bridges on route
  kpraPenalty: number            // Penalty for KPRA violation in CA/OR/WA
  escortProximityWarning: boolean // True if cargo is near escort thresholds
  finalScore: number             // Final calculated score (0-100)
}

/**
 * Smart fit alternative suggestion for borderline loads
 * Helps users avoid permits with minor cargo modifications
 */
export interface FitOptimization {
  type: 'as-is' | 'reduced-height' | 'reduced-width' | 'split-load' | 'tilt-transport' | 'disassembly'
  modification: string           // Human-readable suggestion
  dimensionChange?: {            // What would need to change
    dimension: 'height' | 'width' | 'length' | 'weight'
    currentValue: number
    targetValue: number
    reduction: number            // How much to reduce
  }
  resultingTruck?: TruckType     // Better truck option if modified
  permitsSaved: number           // Number of permits avoided
  costSavings: number            // Estimated dollar savings
  feasibility: 'easy' | 'moderate' | 'difficult'  // How practical
}

export interface TruckRecommendation {
  truck: TruckType
  // Score from 0-100
  score: number
  // Detailed score breakdown for UI display
  scoreBreakdown?: ScoreBreakdown
  // Fit analysis
  fit: FitAnalysis
  // Required permits
  permitsRequired: PermitRequired[]
  // Smart fit alternatives for borderline loads
  fitAlternatives?: FitOptimization[]
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
  TRACTOR_WEIGHT: 17000, // Default for Class 8. Use truck.powerUnitWeight when available.
} as const

// Escort & service cost constants (all values in cents, integer)
export const ESCORT_COSTS = {
  /** Pilot car per day: $800 */
  PILOT_CAR_PER_DAY_CENTS: 80_000,
  /** Height pole car per day: $1,000 */
  POLE_CAR_PER_DAY_CENTS: 100_000,
  /** Police escort per hour: $100 */
  POLICE_ESCORT_PER_HOUR_CENTS: 10_000,
  /** Bucket truck per day: $1,500 */
  BUCKET_TRUCK_PER_DAY_CENTS: 150_000,
  /** Mobilization/demobilization fee per escort vehicle: $350 */
  MOBILIZATION_PER_VEHICLE_CENTS: 35_000,
  /** Oversize average speed for escort day calculation: 35 mph */
  OVERSIZE_AVG_SPEED_MPH: 35,
  /** Driving hours per day for oversize (daylight only): 10 */
  OVERSIZE_DRIVING_HOURS_PER_DAY: 10,
} as const

/**
 * Regional escort cost multipliers
 * Escort costs vary significantly by region due to:
 * - Labor costs and cost of living
 * - State regulatory complexity
 * - Escort vehicle availability/competition
 * - Urban vs rural pricing
 *
 * Base rate ($800/day) is adjusted by these multipliers.
 * Range: ~$600/day (Midwest rural) to ~$1,200/day (California urban)
 */
export const ESCORT_REGIONAL_MULTIPLIERS: Record<string, number> = {
  // West Coast - highest costs due to regulations, labor costs, traffic
  CA: 1.40,  // California: $1,120/day - strictest regulations, highest labor
  // Pacific Northwest - moderate-high
  WA: 1.20,  // Washington: $960/day
  OR: 1.15,  // Oregon: $920/day
  AK: 1.25,  // Alaska: $1,000/day - remote, limited availability
  // Northeast - high costs due to density, regulations, tolls
  NY: 1.35,  // New York: $1,080/day - NYC area especially
  NJ: 1.30,  // New Jersey: $1,040/day - complex regulations
  MA: 1.25,  // Massachusetts: $1,000/day
  CT: 1.20,  // Connecticut: $960/day
  PA: 1.15,  // Pennsylvania: $920/day
  MD: 1.15,  // Maryland: $920/day
  DE: 1.10,  // Delaware: $880/day
  NH: 1.10,  // New Hampshire: $880/day
  VT: 1.05,  // Vermont: $840/day
  ME: 1.05,  // Maine: $840/day
  RI: 1.15,  // Rhode Island: $920/day
  DC: 1.35,  // DC: $1,080/day - urban, complex
  // West - moderate-high
  NV: 1.15,  // Nevada: $920/day
  CO: 1.10,  // Colorado: $880/day
  UT: 1.00,  // Utah: $800/day
  HI: 1.50,  // Hawaii: $1,200/day - island logistics, limited providers
  WY: 0.95,  // Wyoming: $760/day - rural, less demand
  // Mountain/Northwest
  ID: 0.95,  // Idaho: $760/day
  MT: 0.90,  // Montana: $720/day - rural, long distances
  // Southwest - moderate
  AZ: 1.00,  // Arizona: $800/day
  NM: 0.95,  // New Mexico: $760/day
  TX: 1.05,  // Texas: $840/day - large state, variable
  OK: 0.90,  // Oklahoma: $720/day
  // Southeast - lower-moderate
  FL: 1.10,  // Florida: $880/day - tourist areas higher
  GA: 1.00,  // Georgia: $800/day
  NC: 0.95,  // North Carolina: $760/day
  SC: 0.90,  // South Carolina: $720/day
  VA: 1.05,  // Virginia: $840/day - DC suburbs higher
  WV: 0.85,  // West Virginia: $680/day
  KY: 0.85,  // Kentucky: $680/day
  TN: 0.90,  // Tennessee: $720/day
  AL: 0.85,  // Alabama: $680/day
  MS: 0.80,  // Mississippi: $640/day - lowest costs
  LA: 0.90,  // Louisiana: $720/day
  AR: 0.85,  // Arkansas: $680/day
  // Midwest - lower costs, competitive market
  IL: 1.00,  // Illinois: $800/day - Chicago area higher
  IN: 0.90,  // Indiana: $720/day
  OH: 0.95,  // Ohio: $760/day
  MI: 0.95,  // Michigan: $760/day
  WI: 0.90,  // Wisconsin: $720/day
  MN: 0.90,  // Minnesota: $720/day
  IA: 0.85,  // Iowa: $680/day
  MO: 0.90,  // Missouri: $720/day
  KS: 0.85,  // Kansas: $680/day
  NE: 0.80,  // Nebraska: $640/day
  SD: 0.80,  // South Dakota: $640/day
  ND: 0.80,  // North Dakota: $640/day
} as const

/**
 * Get the regional cost multiplier for a state
 * Returns 1.0 (base rate) if state not found
 */
export function getEscortRegionalMultiplier(stateCode: string): number {
  return ESCORT_REGIONAL_MULTIPLIERS[stateCode.toUpperCase()] ?? 1.0
}

/**
 * Get the average regional multiplier for a route
 * Weighted by number of states (simple average)
 * For more accurate estimates, use per-state distance weighting
 */
export function getRouteAverageMultiplier(routeStates: string[]): number {
  if (routeStates.length === 0) return 1.0
  const sum = routeStates.reduce((acc, state) => acc + getEscortRegionalMultiplier(state), 0)
  return sum / routeStates.length
}

/**
 * Get the highest regional multiplier along a route
 * Use this for conservative cost estimates
 */
export function getRouteMaxMultiplier(routeStates: string[]): number {
  if (routeStates.length === 0) return 1.0
  return Math.max(...routeStates.map(state => getEscortRegionalMultiplier(state)))
}

// Permit base fee constants (all values in cents, integer)
export const PERMIT_BASE_COSTS_CENTS = {
  HEIGHT: 7_500,   // $75 base overheight permit
  WIDTH: 7_500,    // $75 base overwidth permit
  WEIGHT: 15_000,  // $150 base overweight permit
} as const

// Height permit severity tiers (all values in cents, per-state surcharges on top of base fee)
// Real-world overheight costs escalate dramatically with height due to route surveys,
// bridge clearance analysis, utility coordination, and engineering reviews.
export const HEIGHT_PERMIT_TIERS_CENTS = {
  // Tier 2 (14.6'-15.5'): Enhanced permit — route review, possible pole car
  TIER_2_SURCHARGE: 25_000,   // $250/state
  // Tier 3 (15.6'-16.5'): Route survey required — bridge clearance analysis
  TIER_3_SURCHARGE: 75_000,   // $750/state
  // Tier 4 (16.6'+): Superload — full route survey + utility coordination + engineering
  TIER_4_SURCHARGE: 200_000,  // $2,000/state
  // Utility crossing estimate for loads >16' requiring wire lifting
  // ~1 crossing per 50 miles in mixed urban/rural areas, ~$750 per crossing
  UTILITY_CROSSING_INTERVAL_MILES: 50,
  UTILITY_CROSSING_COST_CENTS: 75_000, // $750 per crossing
} as const

// Permit thresholds for superloads (varies by state)
export const SUPERLOAD_THRESHOLDS = {
  WIDTH: 16, // feet
  HEIGHT: 16, // feet
  LENGTH: 120, // feet
  WEIGHT: 200000, // pounds
} as const

// Average oversize transport speeds by severity category (mph)
// Real-world speeds vary by cargo dimensions due to state-imposed limits,
// escort restrictions, bridge/utility clearance slowdowns, and routing constraints.
export const OVERSIZE_SPEEDS = {
  LEGAL: 55,             // Standard legal load — interstate speed
  MILD_OVERSIZE: 45,     // Width 8.6'-10', height 13.6'-14.5'
  MODERATE_OVERSIZE: 40, // Width 10.1'-12', height 14.6'-15.5'
  HEAVY_OVERSIZE: 35,    // Width 12.1'-14', height 15.6'-16.5'
  SUPERLOAD: 30,         // Width 14'+, height 16.6'+, or weight >200k lbs
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
  // Cargo images (for PDF display)
  imageUrl?: string       // Primary custom image
  imageUrl2?: string      // Secondary custom image
  frontImageUrl?: string  // Equipment front view (from database)
  sideImageUrl?: string   // Equipment side view (from database)
  // Equipment database fields
  equipmentMatched?: boolean
  equipmentMakeId?: string
  equipmentModelId?: string
  dimensionsSource?: 'ai' | 'database' | 'manual'
}

export interface ParsedLoad {
  // Optional identifier for multi-cargo scenarios
  id?: string
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
  failed?: boolean // true if item could not be placed (no valid position found)
}

export interface PlannedLoad {
  id: string
  items: LoadItem[]
  // Aggregate dimensions for this load
  length: number
  width: number
  height: number
  weight: number
  // Effective height after 3D stacking (max y + item height across all placements)
  // This may be taller than the single-item `height` field if items are stacked
  effectiveHeight?: number
  // Truck recommendation for this specific load
  recommendedTruck: TruckType
  truckScore: number
  // Detailed score breakdown for "Why This Truck?" display
  scoreBreakdown?: ScoreBreakdown
  // Smart fit alternatives for borderline loads
  fitAlternatives?: FitOptimization[]
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
    surchargeModel?: 'cumulative' | 'tiered'  // cumulative = all applicable brackets added (default), tiered = only highest bracket
    processingTime: string
    validity: string
  }
  annual?: {
    baseFee: number
    maxWidth?: number
    maxHeight?: number
    maxLength?: number
    maxWeight?: number     // lbs — loads exceeding this need single-trip permits
    restrictions?: string[]
  }
}

export interface BridgeAnalysisRequirement {
  weightThreshold: number    // lbs — above this requires bridge analysis on state highways
  widthThreshold?: number    // feet — above this may require bridge analysis on specific routes
  estimatedCostMin: number   // dollars (consistent with state permit data)
  estimatedCostMax: number   // dollars
  processingTime: string     // e.g., '2-4 weeks'
  notes?: string[]
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

export interface SpecialJurisdiction {
  code: string                    // e.g., 'NYC'
  name: string                    // e.g., 'New York City'
  agency: string
  phone: string
  website: string
  geoBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  additionalPermitRequired: boolean
  additionalFees: {
    oversizeBase: number          // dollars (converted to cents at calculation boundary)
    overweightBase: number        // dollars
  }
  restrictions: string[]
  notes?: string[]
}

export interface SpecialJurisdictionPermit {
  jurisdiction: string            // e.g., 'New York City'
  code: string                    // e.g., 'NYC'
  additionalPermitRequired: boolean
  estimatedAdditionalFee: number  // cents
  agency: string
  phone: string
  website: string
  restrictions: string[]
  warnings: string[]
}

export interface RestrictedRoute {
  route: string             // Highway/road name (e.g., 'NJ Turnpike (I-95)')
  maxWidth: number          // feet — max width allowed on this route
  maxHeight: number         // feet — max height allowed on this route
  maxWeight?: number        // lbs — max weight if different from state limit
  permitsAvailable: boolean // false = no oversize/overweight permits issued for this route
  note: string              // Explanation of restriction
}

export interface KPRALimit {
  maxDistance: number     // feet — max kingpin-to-rear-axle distance
  enforced: boolean       // true = actively checked at weigh stations
  notes: string
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
  bridgeAnalysis?: BridgeAnalysisRequirement
  kpraLimit?: KPRALimit
  specialJurisdictions?: SpecialJurisdiction[]
  restrictedRoutes?: RestrictedRoute[]
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
  warnings?: string[]             // Calculation quality warnings (e.g., missing distance)
  specialJurisdictionPermits?: SpecialJurisdictionPermit[]
  bridgeAnalysisRequired?: boolean
  continuousPermitAvailable?: boolean
  continuousPermitNote?: string   // e.g., "Annual permit ($90) covers loads up to 14' wide, 15' high, 120' long, 110,000 lbs"
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
  parseMethod?: 'pattern' | 'AI' | 'text-ai' | 'image-ai' | 'spreadsheet'
  itemsFound?: number
  hasAIFallback?: boolean
  confidence?: number
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

// =============================================================================
// DETAILED PERMIT ANALYSIS TYPES
// =============================================================================

/**
 * Detailed breakdown of how a permit fee was calculated
 */
export interface PermitCostBreakdown {
  baseFee: number // Base permit fee in cents
  dimensionSurcharges: {
    width: { threshold: number; fee: number }[]
    height: { threshold: number; fee: number }[]
    length: { threshold: number; fee: number }[]
  }
  weightFees: {
    baseFee: number
    perMileFee?: number
    tonMileFee?: number
    bracketFee?: number
  }
  triggeringDimensions: {
    width?: { value: number; limit: number; exceeded: boolean }
    height?: { value: number; limit: number; exceeded: boolean }
    length?: { value: number; limit: number; exceeded: boolean }
    weight?: { value: number; limit: number; exceeded: boolean }
  }
  total: number // Total fee in cents
}

/**
 * Detailed permit requirement with full breakdown and source info
 */
export interface DetailedPermitRequirement {
  state: string                  // Full state name
  stateCode: string              // 2-letter code
  distanceInState: number        // Miles traveling through this state
  oversizeRequired: boolean
  overweightRequired: boolean
  isSuperload: boolean
  escortsRequired: number
  poleCarRequired?: boolean
  policeEscortRequired?: boolean
  estimatedFee: number           // Total fee in cents
  costBreakdown: PermitCostBreakdown
  calculationDetails: string[]   // Human-readable calculation steps
  source: {
    agency: string               // e.g., "Texas DMV Oversize/Overweight Permits"
    website: string              // Official website URL
    phone: string                // Contact phone
    lastUpdated: string          // When this data was last verified
  }
  travelRestrictions: string[]   // Time/weather restrictions
  reasons: string[]              // Why permit is required
  warnings?: string[]            // Calculation quality warnings (e.g., missing distance)
  specialJurisdictionPermits?: SpecialJurisdictionPermit[]
  bridgeAnalysisRequired?: boolean
  continuousPermitAvailable?: boolean
  continuousPermitNote?: string
}

/**
 * Detailed breakdown of escort costs for transparency
 */
export interface EscortCostBreakdown {
  // Escort rates (per day/hour)
  rates: {
    escortPerDay: number         // Standard escort/pilot car rate per day
    poleCarPerDay: number        // Height pole car rate per day
    policePerHour: number        // Police escort rate per hour
  }
  // Trip duration estimate
  tripDays: number               // Total estimated trip days
  tripHours: number              // Total estimated trip hours
  // Escort counts needed
  escortCount: number            // Number of standard escorts (front/rear)
  needsPoleCar: boolean          // Height pole car needed
  needsPoliceEscort: boolean     // Police escort required
  // Cost breakdown by type
  escortCostPerDay: number       // escortCount × escortPerDay
  poleCarCostPerDay: number      // needsPoleCar ? poleCarPerDay : 0
  policeCostPerDay: number       // (policePerHour × hoursPerDay) if needed
  // Per-state breakdown for itemized view
  perState: Array<{
    stateCode: string
    stateName: string
    distanceMiles: number
    daysInState: number
    escortCountInState: number
    poleCarRequiredInState: boolean
    policeRequiredInState: boolean
    stateCost: number
  }>
  // Totals
  totalEscortCost: number        // Sum of all escort types
  totalPoleCarCost: number
  totalPoliceCost: number
  grandTotal: number             // escortCost + poleCarCost + policeCost
  // Human-readable calculation explanation
  calculationDetails: string[]
}

/**
 * Summary of permits for an entire route
 */
export interface DetailedRoutePermitSummary {
  statePermits: DetailedPermitRequirement[]
  totalPermitCost: number        // Sum of all state permit fees
  totalEscortCost: number        // Estimated escort/pilot car costs
  escortBreakdown?: EscortCostBreakdown  // Detailed escort cost breakdown
  totalCost: number              // permits + escorts
  overallRestrictions: string[]  // Combined restrictions across all states
  warnings: string[]
}

// =============================================================================
// MULTIPLE ROUTE OPTIONS TYPES
// =============================================================================

/**
 * A single route alternative with permit analysis
 */
export interface RouteAlternative {
  id: string
  name: string                   // e.g., "via I-40 W" or "Route A"
  totalDistanceMiles: number
  totalDurationMinutes: number
  statesTraversed: string[]      // State codes in order
  stateDistances: Record<string, number>  // Miles per state
  routePolyline: string          // Encoded polyline for map display
  permitSummary: DetailedRoutePermitSummary
  estimatedCosts: {
    permits: number              // Total permit fees
    escorts: number              // Total escort costs
    total: number                // Combined total
  }
}

/**
 * Result of calculating multiple route alternatives
 */
export interface MultiRouteResult {
  routes: RouteAlternative[]     // Sorted by total cost (cheapest first)
  selectedRouteId: string        // Currently selected route
}

// =============================================================================
// ROUTE RECOMMENDATION TYPES
// =============================================================================

/**
 * AI-generated recommendation for why a route is best
 */
export interface RouteRecommendation {
  recommendedRouteId: string
  recommendedRouteName: string
  reasoning: string[]              // Why this route is recommended
  costSavings?: {                  // Compared to next best alternative
    amount: number
    comparedTo: string
  }
  warnings: string[]               // Any caveats or concerns
  alternativeConsiderations: {     // Pros/cons of other routes
    routeId: string
    routeName: string
    pros: string[]
    cons: string[]
  }[]
}

/**
 * Per-truck route recommendation for multi-truck scenarios
 */
export interface TruckRouteRecommendation {
  truckIndex: number
  truckId: string
  truckName: string
  cargoDescription: string
  isOversize: boolean
  isOverweight: boolean
  recommendedRouteId: string
  recommendedRouteName: string
  reasoning: string[]
  alternativeRouteId?: string      // If different from global recommendation
  alternativeReason?: string       // Why this truck needs different route
}

// =============================================================================
// SMART LOAD PLANNER TYPES
// =============================================================================

// Weight Distribution Types
// -----------------------------------------------------------------------------

export interface AxleWeights {
  steerAxle: number       // Front axle weight (~12,000 lbs limit)
  driveAxle: number       // Tractor drive axles (~34,000 lbs limit)
  trailerAxles: number    // Trailer axles (~34,000 lbs limit)
  totalGross: number      // Total vehicle weight
}

export interface WeightDistributionResult {
  axleWeights: AxleWeights
  centerOfGravity: { x: number; z: number }  // CG position on trailer
  balanceScore: number    // 0-100, higher is better balanced
  warnings: string[]      // Weight distribution warnings
  isLegal: boolean        // All axle weights within limits
  bridgeFormula?: BridgeFormulaResult  // Bridge Formula B validation results
}

// Bridge Formula B Validation Types (23 CFR 658.17)
// -----------------------------------------------------------------------------

export interface BridgeFormulaCheck {
  axleCount: number         // N — number of axles in the group
  outerSpacing: number      // L — feet between first and last axle
  actualWeight: number      // actual weight on these axles (lbs)
  allowedWeight: number     // Bridge Formula B maximum (lbs)
  passes: boolean
  margin: number            // allowed - actual (negative = violation)
  groupDescription: string  // e.g., "drive + trailer (4 axles, 43.0' spacing)"
}

export interface BridgeFormulaResult {
  passes: boolean
  checks: BridgeFormulaCheck[]
  violations: BridgeFormulaCheck[]   // subset of checks that failed
  warnings: string[]
  worstMarginPercent: number  // smallest margin as % of allowed (negative = worst violation)
}

// Axle Weight Limits (Federal Defaults)
export const AXLE_LIMITS = {
  STEER_AXLE: 12000,        // Front axle max (lbs)
  SINGLE_AXLE: 20000,       // Single axle max (lbs)
  TANDEM_AXLE: 34000,       // Tandem axle max (lbs)
  TRIDEM_AXLE: 42000,       // Tridem axle max (lbs)
  PER_ADDITIONAL_AXLE: 5500, // Per-axle increment beyond tridem (lbs) — conservative estimate for typical 4-5 ft spacing per 23 CFR 658.17
  GROSS_WEIGHT: 80000,      // Total gross max (lbs)
} as const

// 3D Stacking Types
// -----------------------------------------------------------------------------

export interface ItemPlacement3D {
  itemId: string
  x: number              // Position from front of trailer (feet)
  y: number              // Height from deck (feet), 0 = on deck
  z: number              // Position from left edge (feet)
  rotated: boolean       // 90-degree rotation applied
  stackedOn?: string     // ID of item this is stacked on
  layer: number          // 0 = deck, 1+ = stacked layer
  failed?: boolean       // true if item could not be placed (no valid position found)
}

export interface StackingCell {
  x: number              // Grid position X
  z: number              // Grid position Z
  ceiling: number        // Current height at this position (feet)
  maxLoad: number        // Maximum load capacity of the base item (lbs)
  currentLoad: number    // Cumulative weight of items stacked above the base (lbs)
  baseItemId?: string    // ID of item at base of this cell
  canStack: boolean      // Whether stacking is allowed here
}

// Cost Optimization Types
// -----------------------------------------------------------------------------

export interface SmartPermitCostEstimate {
  heightPermit: number   // cents
  widthPermit: number    // cents
  weightPermit: number   // cents
  escorts: number        // cents
}

export interface SmartLoadCostBreakdown {
  truckCost: number      // cents - Base daily truck cost
  fuelCost: number       // cents - Fuel cost for route
  permitCosts: SmartPermitCostEstimate  // cents
  seasonalCost?: number  // cents - Seasonal permit costs (spring thaw)
  totalCost: number      // cents
  /** Warnings about cost factors (seasonal restrictions, etc.) */
  warnings?: string[]
}

export interface PlanningOptions {
  // Feature flags
  enableWeightDistribution?: boolean
  enable3DStacking?: boolean
  enableCostOptimization?: boolean
  enableItemConstraints?: boolean
  enableSecurementPlanning?: boolean
  enableEscortCalculation?: boolean
  enableRouteValidation?: boolean
  enableHOSValidation?: boolean
  // Cost optimization parameters
  costWeight?: number        // 0-1, importance of cost vs truck count
  routeDistance?: number     // Miles for fuel calculation
  fuelPrice?: number         // cents/gallon (e.g. 450 = $4.50)
  // Multi-stop routing
  stopOrder?: string[]       // Destination order for multi-stop loads
  // HOS validation
  driverStatus?: HOSStatus
  departureTime?: Date
}

// Truck Cost and Axle Configuration Types
// -----------------------------------------------------------------------------

export interface AxleConfiguration {
  kingpinPosition: number     // Reference point (usually 0)
  steerAxlePosition: number   // Distance from kingpin to steer axle (negative = ahead of kingpin)
  driveAxlePosition: number   // Distance from kingpin to drive axle (negative = ahead)
  trailerAxlePosition: number // Distance from kingpin to trailer axle(s)
  trailerAxleSpread?: number  // Spread between multiple trailer axles
  numberOfTrailerAxles?: number // 1, 2, 3, etc.
  driveAxleSpread?: number    // Spread between drive tandem axles (ft), typically ~4.33 (52")
  numberOfDriveAxles?: number // Usually 2 (tandem), sometimes 1 (single drive)
}

export interface TruckCostData {
  dailyCostCents: number      // Base daily rental/usage cost (cents)
  fuelEfficiency: number      // Miles per gallon
  specializedPremium: number  // Cost multiplier (1.0 = standard, 2.5 = heavy haul)
}

export interface TruckTypeExtended extends TruckType {
  axleConfiguration?: AxleConfiguration
  costData?: TruckCostData
}

// Default Cost Data by Trailer Category
export const DEFAULT_COST_DATA: Record<TrailerCategory, TruckCostData> = {
  FLATBED: { dailyCostCents: 35_000, fuelEfficiency: 6.5, specializedPremium: 1.0 },
  STEP_DECK: { dailyCostCents: 40_000, fuelEfficiency: 6.0, specializedPremium: 1.1 },
  RGN: { dailyCostCents: 65_000, fuelEfficiency: 5.5, specializedPremium: 1.3 },
  LOWBOY: { dailyCostCents: 85_000, fuelEfficiency: 5.0, specializedPremium: 1.5 },
  DOUBLE_DROP: { dailyCostCents: 55_000, fuelEfficiency: 5.5, specializedPremium: 1.2 },
  LANDOLL: { dailyCostCents: 50_000, fuelEfficiency: 5.5, specializedPremium: 1.2 },
  CONESTOGA: { dailyCostCents: 45_000, fuelEfficiency: 6.0, specializedPremium: 1.1 },
  DRY_VAN: { dailyCostCents: 30_000, fuelEfficiency: 7.0, specializedPremium: 1.0 },
  REEFER: { dailyCostCents: 45_000, fuelEfficiency: 5.5, specializedPremium: 1.2 },
  CURTAIN_SIDE: { dailyCostCents: 40_000, fuelEfficiency: 6.5, specializedPremium: 1.1 },
  MULTI_AXLE: { dailyCostCents: 250_000, fuelEfficiency: 3.5, specializedPremium: 2.5 },
  SCHNABEL: { dailyCostCents: 500_000, fuelEfficiency: 2.5, specializedPremium: 4.0 },
  PERIMETER: { dailyCostCents: 350_000, fuelEfficiency: 3.0, specializedPremium: 3.0 },
  STEERABLE: { dailyCostCents: 300_000, fuelEfficiency: 3.0, specializedPremium: 2.5 },
  BLADE: { dailyCostCents: 400_000, fuelEfficiency: 3.5, specializedPremium: 3.5 },
  TANKER: { dailyCostCents: 40_000, fuelEfficiency: 6.0, specializedPremium: 1.1 },
  HOPPER: { dailyCostCents: 38_000, fuelEfficiency: 6.0, specializedPremium: 1.1 },
  SPECIALIZED: { dailyCostCents: 150_000, fuelEfficiency: 4.5, specializedPremium: 2.0 },
}

// Default Axle Configurations by Trailer Category
// steerAxlePosition: distance from kingpin to front (steer) axle of tractor
//   Standard Class 8 day cab: ~-17 ft (12 ft wheelbase)
//   Heavy haul tractor: ~-20 ft (15 ft wheelbase)
// driveAxleSpread: distance between drive tandem axles
//   Standard Class 8: ~4.33 ft (52"), heavy haul: ~4.5 ft (54")
export const DEFAULT_AXLE_CONFIGS: Record<TrailerCategory, AxleConfiguration> = {
  FLATBED: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 38, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  STEP_DECK: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 40, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  RGN: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 35, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  LOWBOY: { kingpinPosition: 0, steerAxlePosition: -20, driveAxlePosition: -5, trailerAxlePosition: 30, numberOfTrailerAxles: 3, trailerAxleSpread: 4, driveAxleSpread: 4.5, numberOfDriveAxles: 2 },
  DOUBLE_DROP: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 38, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  LANDOLL: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 40, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  CONESTOGA: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 38, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  DRY_VAN: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 40, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  REEFER: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 40, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  CURTAIN_SIDE: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 40, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  MULTI_AXLE: { kingpinPosition: 0, steerAxlePosition: -20, driveAxlePosition: -5, trailerAxlePosition: 25, numberOfTrailerAxles: 13, trailerAxleSpread: 4.5, driveAxleSpread: 4.5, numberOfDriveAxles: 2 },
  SCHNABEL: { kingpinPosition: 0, steerAxlePosition: -20, driveAxlePosition: -5, trailerAxlePosition: 20, numberOfTrailerAxles: 8, trailerAxleSpread: 5, driveAxleSpread: 4.5, numberOfDriveAxles: 2 },
  PERIMETER: { kingpinPosition: 0, steerAxlePosition: -20, driveAxlePosition: -5, trailerAxlePosition: 22, numberOfTrailerAxles: 6, trailerAxleSpread: 4.5, driveAxleSpread: 4.5, numberOfDriveAxles: 2 },
  STEERABLE: { kingpinPosition: 0, steerAxlePosition: -20, driveAxlePosition: -5, trailerAxlePosition: 25, numberOfTrailerAxles: 4, trailerAxleSpread: 4, driveAxleSpread: 4.5, numberOfDriveAxles: 2 },
  BLADE: { kingpinPosition: 0, steerAxlePosition: -20, driveAxlePosition: -5, trailerAxlePosition: 30, numberOfTrailerAxles: 4, trailerAxleSpread: 4, driveAxleSpread: 4.5, numberOfDriveAxles: 2 },
  TANKER: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 35, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  HOPPER: { kingpinPosition: 0, steerAxlePosition: -17, driveAxlePosition: -5, trailerAxlePosition: 35, numberOfTrailerAxles: 2, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
  SPECIALIZED: { kingpinPosition: 0, steerAxlePosition: -18, driveAxlePosition: -5, trailerAxlePosition: 30, numberOfTrailerAxles: 3, trailerAxleSpread: 4, driveAxleSpread: 4.33, numberOfDriveAxles: 2 },
}

// Item Constraint Types
// -----------------------------------------------------------------------------

export interface LoadingInstruction {
  sequence: number           // Order of loading (1 = first)
  itemId: string
  itemDescription: string
  action: string             // "Load", "Stack on [item]", "Secure"
  position: string           // Human-readable position description
  notes: string[]            // Safety notes, special instructions
}

export interface ConstraintViolation {
  type: 'fragile' | 'hazmat' | 'priority' | 'destination' | 'stacking' | 'weight'
  itemId: string
  description: string
  severity: 'error' | 'warning'
}

// Securement Planning Types
// -----------------------------------------------------------------------------

export type TieDownType = 'strap' | 'chain' | 'binder'

export interface TieDownPoint {
  x: number              // Position from front of cargo (feet)
  z: number              // Position from left edge (feet)
  type: TieDownType
  wll: number            // Rated Working Load Limit (lbs)
  angle: number          // Angle from horizontal (degrees)
  effectiveWLL: number   // Angle-adjusted WLL: wll × cos(angle) — per 49 CFR 393.106
}

export interface SecurementPlan {
  itemId: string
  tieDowns: TieDownPoint[]
  totalWLL: number           // Total effective (angle-adjusted) WLL
  totalRatedWLL: number      // Total rated WLL before angle adjustment
  requiredWLL: number        // Required WLL (50% of cargo weight)
  isCompliant: boolean       // Meets DOT requirements
  notes: string[]            // "Use edge protectors", etc.
}

// Escort/Pilot Car Types
// -----------------------------------------------------------------------------

export interface SmartTravelRestrictions {
  dayOnly: boolean
  noWeekends: boolean
  noHolidays: boolean
  curfewHours?: { start: number; end: number }
}

export interface SmartEscortRequirements {
  frontPilot: boolean
  rearPilot: boolean
  policeEscort: boolean
  bucketTruck: boolean       // For high loads near power lines
  signage: string[]          // "OVERSIZE LOAD", "WIDE LOAD"
  flags: { front: boolean; rear: boolean; corners: boolean }
  lights: { amber: boolean; rotating: boolean }
  travelRestrictions: SmartTravelRestrictions
  estimatedCost: number
}

export interface SmartStateEscortRules {
  state: string
  widthThresholds: { frontPilot: number; rearPilot: number; police: number }
  heightThresholds: { frontPilot: number; rearPilot: number; police: number }
  lengthThresholds: { frontPilot: number; rearPilot: number; police: number }
  weightThresholds: { frontPilot: number; rearPilot: number; police: number }
}

// Route Restriction Types
// -----------------------------------------------------------------------------

export type RouteRestrictionType = 'bridge_weight' | 'tunnel_hazmat' | 'low_clearance' | 'road_width' | 'seasonal'

export interface SmartRouteRestriction {
  type: RouteRestrictionType
  location: { lat: number; lng: number }
  description: string
  limit?: number             // Weight in lbs, height in feet, etc.
  alternative?: string       // Suggested alternate route
  severity: 'blocking' | 'warning'
}

export interface AlternateRoute {
  description: string
  addedMiles: number
  addedTime: number          // Minutes
}

export interface SmartRouteValidation {
  isValid: boolean
  restrictions: SmartRouteRestriction[]
  alternateRoutes: AlternateRoute[]
}

// Hours of Service Types
// -----------------------------------------------------------------------------

export interface HOSStatus {
  drivingRemaining: number      // Minutes remaining in current driving window
  onDutyRemaining: number       // Minutes (14-hour window)
  breakRequired: boolean
  breakRequiredIn: number       // Minutes until 30-min break needed
  cycleRemaining: number        // Hours remaining in 60/70 cycle (on-duty hours, not just driving)
  cycleHoursUsed: number        // Hours of on-duty time used in current 8-day cycle
  cycleDaysRemaining: number    // Days remaining in 8-day cycle window before oldest day rolls off
  lastResetDate?: string        // ISO date of last 34-hour restart (if any)
}

export interface RequiredBreak {
  location: string
  afterMiles: number
  duration: number              // Minutes
}

export interface TripHOSValidation {
  isAchievable: boolean
  estimatedDriveTime: number    // Minutes
  estimatedOnDutyTime: number   // Minutes — total on-duty time including non-driving duties
  requiredBreaks: RequiredBreak[]
  overnightRequired: boolean
  overnightLocation?: string
  cycleViolation: boolean       // True if trip exceeds 70-hour/8-day cycle
  restartRequired: boolean      // True if 34-hour restart is needed before trip
  restartDelayHours?: number    // Hours of delay if restart is needed
  warnings: string[]
}

export type RestStopType = 'truck_stop' | 'rest_area' | 'weigh_station'

export interface RestStop {
  name: string
  location: { lat: number; lng: number }
  type: RestStopType
  amenities: string[]
  parking: boolean
}
