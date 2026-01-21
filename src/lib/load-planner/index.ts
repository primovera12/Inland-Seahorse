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
