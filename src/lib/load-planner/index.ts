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
  StatePermitData,
  PermitRequirement,
  RoutePermitSummary,
  // API types
  AnalyzeRequest,
  AnalyzeMetadata,
  AnalyzeResponse,
  // Cargo specs
  CargoSpecs,
} from './types'

// Constants
export { LEGAL_LIMITS, SUPERLOAD_THRESHOLDS } from './types'

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
} from './truck-selector'

// =============================================================================
// LOAD PLANNING EXPORTS
// =============================================================================
export {
  planLoads,
  getLoadPlanSummary,
} from './load-planner'

// =============================================================================
// PERMIT CALCULATION EXPORTS
// =============================================================================
export {
  calculateStatePermit,
  calculateRoutePermits,
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
