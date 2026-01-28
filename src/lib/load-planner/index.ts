/**
 * Load Planner Module
 *
 * AI-powered cargo parsing, truck selection, load planning, and permit calculation
 * for the Seahorse Inland / Dismantle Pro quote system.
 *
 * Main exports:
 * - parseSpreadsheet, parseFile - Parse Excel/CSV files into cargo items
 * - parseImageWithAI, parseTextWithAI - AI-powered parsing with Claude
 * - selectTrucks, getBestTruck - Recommend trucks for cargo
 * - planLoads - Multi-truck planning with bin-packing
 * - calculateRoutePermits - State-by-state permit requirements
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================
export type {
  // Truck types
  TrailerCategory,
  TruckType,
  PermitType,
  PermitRequired,
  FitAnalysis,
  TruckRecommendation,
  // Load types
  ItemGeometry,
  OrientationMode,
  LoadItem,
  ParsedLoad,
  Location,
  LoadStatus,
  LoadType,
  Load,
  // Load planning types
  ItemPlacement,
  PlannedLoad,
  LoadPlan,
  // Permit types
  LegalLimits,
  DimensionSurcharge,
  WeightBracket,
  OversizePermit,
  OverweightPermit,
  EscortRules,
  TravelRestrictions,
  StateContact,
  SuperloadThresholds,
  SpecialJurisdiction,
  SpecialJurisdictionPermit,
  StatePermitData,
  PermitRequirement,
  RoutePermitSummary,
  // API types
  AnalyzeRequest,
  AnalyzeMetadata,
  AnalyzeResponse,
  // Cargo specs
  CargoSpecs,
  // Score breakdown (Optimization #2)
  ScoreBreakdown,
  // Fit optimization (Optimization #5)
  FitOptimization,
} from './types'

// Constants
export { LEGAL_LIMITS, SUPERLOAD_THRESHOLDS, OVERSIZE_SPEEDS } from './types'

// =============================================================================
// PARSING EXPORTS
// =============================================================================
export {
  parseSpreadsheet,
  parsePDFText,
  parseText,
  parseFile,
  unitConversions,
} from './universal-parser'

// AI Parsing
export {
  parseImageWithAI,
  parseTextWithAI,
  parsePDFWithAI,
  parseTextWithAIMultilang,
} from './ai-parser'

// =============================================================================
// TRUCK EXPORTS
// =============================================================================
export {
  trucks,
  getTruckById,
  getTrucksByCategory,
  getCategories,
} from './trucks'

export {
  selectTrucks,
  getLegalTrucks,
  getBestTruck,
  canTransportLegally,
  calculateFitAnalysis,
  getRequiredPermits,
  type TruckSelectionOptions,
} from './truck-selector'

// =============================================================================
// LOAD PLANNING EXPORTS
// =============================================================================
export {
  planLoads,
  getLoadPlanSummary,
  planLoadsWithOptions,
  getSmartLoadPlanSummary,
  generateSmartPlans,
  DEFAULT_PLANNING_OPTIONS,
  type PlanStrategy,
  type SmartPlanOption,
} from './load-planner'

// =============================================================================
// SMART LOAD PLANNER EXPORTS
// =============================================================================

// Weight Distribution
export {
  analyzeWeightDistribution,
  calculateAxleWeights,
  calculateCenterOfGravity,
  scoreWeightDistribution,
  suggestOptimalPosition,
} from './weight-distribution'

// 3D Stacking Engine
export {
  calculatePlacements3D,
  sortItemsForStacking,
  buildStackingMap,
  canStackOn,
  findBestPosition,
  getStackedItems,
  getWeightStackedOn,
} from './stacking-engine'

// Item Constraints
export {
  validateAllConstraints,
  validateFragilePlacement,
  validateHazmatConstraints,
  generateLoadingInstructions,
  generateUnloadingInstructions,
  sortByPriority,
  sortByDestination,
  sortForOptimalLoading,
  requiresDedicatedTruck,
} from './item-constraints'

// Cost Optimizer
export {
  calculateTruckCost,
  calculatePermitCosts,
  calculateFuelCost,
  calculateEscortDays,
  calculateMultiTruckCost,
  scoreTruckForCost,
  compareLoadingOptions,
  shouldUseSpecializedTruck,
  getTruckCostData,
} from './cost-optimizer'

// Securement Planner
export {
  generateSecurementPlan,
  generateLoadSecurementPlan,
  calculateRequiredTieDowns,
  calculateRequiredWLL,
  calculateEffectiveWLL,
  validateSecurement,
  getSecurementNotes,
} from './securement-planner'

// Escort Calculator
export {
  calculateEscortRequirements,
  calculateStateEscortRequirements,
  getMostRestrictiveState,
  estimateEscortCost,
  getEscortCostBreakdown,
  getEscortSummary,
  getStateEscortRules,
  getStateTravelRestrictions,
} from './escort-calculator'

// HOS Validator
export {
  validateTripHOS,
  createFreshHOSStatus,
  resetAfter34HourRestart,
  calculateTotalOnDutyTime,
  updateHOSAfterDriving,
  resetAfterBreak,
  calculateDriveTime,
  estimateDeliveryWindow,
  generateTripPlan,
  findRequiredBreakLocations,
  getOversizeSpeed,
  HOS_LIMITS,
} from './hos-validator'

// Smart types exports
export type {
  // Weight distribution
  AxleWeights,
  WeightDistributionResult,
  // 3D stacking
  ItemPlacement3D,
  StackingCell,
  // Cost optimization
  SmartLoadCostBreakdown,
  SmartPermitCostEstimate,
  PlanningOptions,
  TruckCostData,
  AxleConfiguration,
  TruckTypeExtended,
  // Item constraints
  LoadingInstruction,
  ConstraintViolation,
  // Securement
  TieDownType,
  TieDownPoint,
  SecurementPlan,
  // Escort
  SmartEscortRequirements,
  SmartTravelRestrictions,
  SmartStateEscortRules,
  // Route restrictions
  RouteRestrictionType,
  SmartRouteRestriction,
  AlternateRoute,
  SmartRouteValidation,
  // HOS
  HOSStatus,
  RequiredBreak,
  TripHOSValidation,
  RestStopType,
  RestStop,
} from './types'

// Smart constants exports
export {
  AXLE_LIMITS,
  DEFAULT_COST_DATA,
  DEFAULT_AXLE_CONFIGS,
} from './types'

// =============================================================================
// PERMIT CALCULATION EXPORTS
// =============================================================================
export {
  calculateStatePermit,
  calculateDetailedStatePermit,
  calculateRoutePermits,
  calculateDetailedRoutePermits,
  needsPermit,
  formatPermitSummary,
  getStatesRequiringPermits,
  estimateTotalCost,
} from './permit-calculator'

export {
  statePermits,
  getStateByCode,
  getStateByName,
  getAllStateCodes,
  getStatesRequiringEscort,
} from './state-permits'

// =============================================================================
// UNIT HELPERS (Phase 6)
// =============================================================================
export {
  formatFeetInches,
  formatFeetDecimal,
  inchesToFeet,
  feetToInches,
  cmToFeet,
  feetToCm,
  metersToFeet,
  feetToMeters,
  kgToLbs,
  lbsToKg,
  formatWeight,
  formatWeightShort,
  parseDimensionToFeet,
  parseWeightToLbs,
} from './unit-helpers'

// =============================================================================
// ROUTE INTELLIGENCE EXPORTS (Phase 8)
// =============================================================================

// Route calculation
export {
  calculateRoute,
  decodePolyline,
  calculateDistance,
  formatDuration,
  estimateStatesFromAddresses,
  getStateName,
  getStateCode,
  getAllStateCodes as getAllStateCodesRoute,
  isValidStateCode,
} from './route-calculator'

export type {
  LatLng,
  StateSegment,
  RouteResult,
  RouteCalculatorOptions,
} from './route-calculator'

// State detection
export {
  getStateFromPoint,
  detectStatesFromPolyline,
  detectStatesFromPoints,
  identifyFreightCorridors,
  getNeighboringStates,
  validateRouteGeography,
  getStateBoundingBox,
  getStateCenter,
  isIntraStateRoute,
  getRouteRegions,
  isNonContiguousState,
  detectNonContiguousRoute,
  FREIGHT_CORRIDORS,
  NON_CONTIGUOUS_STATES,
} from './state-detector'

export type { FreightCorridor, NonContiguousStateInfo } from './state-detector'

// Seasonal restrictions
export {
  hasSeasonalRestrictions,
  getSeasonalRestriction,
  getActiveRestrictions,
  checkRouteSeasonalRestrictions,
  calculateAdjustedWeightLimits,
  formatRestrictionPeriod,
  getStatesWithoutSeasonalRestrictions,
  SEASONAL_RESTRICTIONS,
} from './seasonal-restrictions'

export type { SeasonalRestriction } from './seasonal-restrictions'

// Bridge heights
export {
  checkBridgeClearance,
  findNearbyBridges,
  checkRouteBridgeClearances,
  getBridgesInState,
  getBridgesBelowHeight,
  getBridgesByHazardLevel,
  getTruckProhibitedRoutes,
  getRecommendedClearance,
  needsHeightConsideration,
  LOW_CLEARANCE_BRIDGES,
  STANDARD_CLEARANCES,
} from './bridge-heights'

export type { LowClearanceBridge } from './bridge-heights'

// Route validation (combines all restriction checking)
export {
  validateRoute,
  quickValidateRoute,
  findNearbyRestrictions,
  checkBridgeWeights,
  checkTunnelRestrictions,
  checkClearances,
  checkRoadWidths,
  getSeasonalRestrictionsForRoute,
  suggestAlternateRoutes,
  canUseTunnels,
  fitsStandardClearance,
  routeHasSeasonalRestrictions,
  generateRouteValidationSummary,
  getRestrictionCounts,
  KNOWN_RESTRICTIONS,
  HAZMAT_TUNNELS,
  WEIGHT_RESTRICTED_BRIDGES,
  WIDTH_RESTRICTED_ROADS,
} from './route-validator'

export type {
  RestrictionType,
  RouteRestriction,
  AlternateRoute as RouteAlternate,
  RouteValidation,
} from './route-validator'

// =============================================================================
// BACKWARD COMPATIBILITY - FEET <-> INCHES CONVERSION
// =============================================================================

import type { LoadItem } from './types'

/**
 * Legacy cargo item format (dimensions in inches)
 * Used by existing inland transport forms
 */
export interface LegacyCargoItem {
  id: string
  description: string
  quantity: number
  length_inches: number
  width_inches: number
  height_inches: number
  weight_lbs: number
  is_oversize?: boolean
  is_overweight?: boolean
}

/**
 * Convert a LoadItem (feet) to legacy format (inches)
 */
export function toLegacyFormat(item: LoadItem): LegacyCargoItem {
  return {
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    length_inches: item.length * 12,
    width_inches: item.width * 12,
    height_inches: item.height * 12,
    weight_lbs: item.weight,
    is_oversize: item.width > 8.5 || item.height > 10, // 8.5ft width or 10ft cargo height
    is_overweight: item.weight > 48000, // Typical legal weight limit per item
  }
}

/**
 * Convert a legacy cargo item (inches) to LoadItem format (feet)
 */
export function fromLegacyFormat(legacy: LegacyCargoItem): LoadItem {
  return {
    id: legacy.id,
    description: legacy.description,
    quantity: legacy.quantity,
    length: legacy.length_inches / 12,
    width: legacy.width_inches / 12,
    height: legacy.height_inches / 12,
    weight: legacy.weight_lbs,
    stackable: false,
    fragile: false,
    hazmat: false,
  }
}

/**
 * Convert an array of legacy cargo items to LoadItems
 */
export function convertLegacyCargoItems(legacyItems: LegacyCargoItem[]): LoadItem[] {
  return legacyItems.map(fromLegacyFormat)
}

/**
 * Convert an array of LoadItems to legacy format
 */
export function convertToLegacyFormat(items: LoadItem[]): LegacyCargoItem[] {
  return items.map(toLegacyFormat)
}

// Alias for backward compatibility
export const convertLegacyCargoItem = fromLegacyFormat
